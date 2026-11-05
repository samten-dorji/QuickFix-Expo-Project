const { test, before, beforeEach, after } = require('node:test');
const fs=require('node:fs');const assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,deleteDoc,getDocs,collection,query,where,orderBy,serverTimestamp,Timestamp,writeBatch,onSnapshot}=require('firebase/firestore');
const {ref,uploadBytes,getBytes,deleteObject}=require('firebase/storage');
const Module=require('node:module');const path=require('node:path');const ts=require('typescript');
const profileFilename=path.resolve(__dirname,'../src/services/profile.ts');const profileModule=new Module(profileFilename,module);
profileModule.filename=profileFilename;profileModule.paths=Module._nodeModulePaths(path.dirname(profileFilename));
profileModule._compile(ts.transpileModule(fs.readFileSync(profileFilename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,profileFilename);
const {createMissingStudentProfile,createMissingPendingAdminProfile}=profileModule.exports;
let env;
const profile=(uid,role='student')=>({uid,email:uid+'@example.test',displayName:uid,role,createdAt:Timestamp.now(),updatedAt:Timestamp.now(),...(role==='student'?{studentId:'123',hostel:'RK',roomNumber:'1'}:{})});
const issue=(id='REQ-a',ownerId='alice',status='Pending')=>({id,ownerId,category:'plumbing',title:'Tap',description:'Leaking',hostel:'RK',roomNumber:'1',priority:'High',status,photoUrl:null,createdAt:Timestamp.now(),updatedAt:Timestamp.now()});
const db=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).firestore();
const historyClient=uid=>require('./helpers/load-source.cjs')('src/services/historyPreferences.ts',{'./firebase':{auth:{currentUser:{uid},authStateReady:async()=>{}},db:db(uid)}});
async function seed(id,status,extra={}){await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),'requests',id),{...issue(id,'alice',status),...extra}));}
function eventFields(actor,before,next,action,notes=null){return {actorId:actor,status:next.status,action,notes,previousStatus:before?.status??null,priorityBefore:before?.priority??null,priorityAfter:next.priority,createdAt:serverTimestamp()};}
function statusPatch(uid,status,notes){
 const prefix=status==='Approved'?'approved':status==='In Progress'?'started':status==='Finished'?'finished':'rejected';
 return {status,statusChangedBy:uid,statusChangedAt:serverTimestamp(),[prefix+'By']:uid,[prefix+'At']:serverTimestamp(),...(status==='Finished'?{completionNotes:notes??'Completed repair'}:{}),...(status==='Rejected'?{rejectionReason:notes??'Not a maintenance issue'}:{})};
}
async function atomic(uid,id,patch,{action,notes,eventPatch={},omitEvent=false,omitUpdate=false}={}){
 const store=db(uid);let before;
 // Read through the trusted harness so denied actors still exercise the write rules.
 await env.withSecurityRulesDisabled(async context=>{before=(await getDoc(doc(context.firestore(),'requests',id))).data();});
 const next={...before,...patch};const target=doc(store,'requests',id);const event=doc(collection(store,'requests',id,'history'));
 const name=action??(before.status!==next.status?(next.status==='In Progress'?'Started':next.status):uid==='alice'?'Updated':before.priority!==next.priority?'Priority changed':'Updated');
 const detail=notes===undefined?(next.status==='Finished'?next.completionNotes:next.status==='Rejected'?next.rejectionReason:null):notes;
 const batch=writeBatch(store);
 if(!omitUpdate)batch.update(target,{...patch,lastEventId:event.id,updatedAt:serverTimestamp()});
 if(!omitEvent)batch.set(event,{...eventFields(uid,before,next,name,detail),...eventPatch});
 return batch.commit();
}
async function create(uid,id,patch={}){
 const store=db(uid);const batch=writeBatch(store);const event=doc(collection(store,'requests',id,'history'));
 const next={...issue(id,uid),completionNotes:null,rejectionReason:null,...patch,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastEventId:event.id};
 batch.set(doc(store,'requests',id),next);batch.set(event,eventFields(uid,null,next,'Submitted'));return batch.commit();
}
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-quickfix',firestore:{rules:fs.readFileSync('firestore.rules','utf8')},storage:{rules:fs.readFileSync('storage.rules','utf8')}});});
beforeEach(async()=>{await env.clearFirestore();await env.clearStorage();await env.withSecurityRulesDisabled(async context=>{
 for(const [uid,role]of [['alice','student'],['bob','student'],['admin','admin'],['tech','staff'],['pending','pending_admin']])await setDoc(doc(context.firestore(),'users',uid),profile(uid,role));
 await setDoc(doc(context.firestore(),'requests','REQ-a'),issue());
});});
after(async()=>{
 if(env&&process.env.QUICKFIX_RULE_COVERAGE){
  const response=await fetch('http://'+(process.env.FIRESTORE_EMULATOR_HOST??'127.0.0.1:8080')+'/emulator/v1/projects/demo-quickfix:ruleCoverage');
  fs.writeFileSync('.reference/student-edit-coverage.json',await response.text());
 }
 if(env)await env.cleanup();
});

test('student creation requires own Pending request and atomic Submitted history',async()=>{
 await assertSucceeds(create('alice','REQ-new'));
 for(const patch of [{ownerId:'bob'},{status:'Approved'},{assignedStaffId:'tech'},{photoUrl:'https://bad.test'},{priority:'Urgent'}])await assertFails(create('alice','REQ-bad',patch));
 await assertFails(create('tech','REQ-staff'));await assertFails(create('pending','REQ-pending'));await assertFails(create('admin','REQ-admin'));
 await assertFails(setDoc(doc(db('alice'),'requests','REQ-alone'),{...issue('REQ-alone'),createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
});
test('student corrects every editable field atomically, preserves protected data and admin receives it live',{timeout:15000},async()=>{
 await seed('REQ-a','Pending',{assignedStaffId:'legacy',approvedBy:'preserve-marker',photoPath:null});
 const before=(await getDoc(doc(db('alice'),'requests','REQ-a'))).data();
 const service=require('./helpers/load-source.cjs')('src/services/requests.ts',{'./firebase':{auth:{currentUser:{uid:'alice'},authStateReady:async()=>{}},db:db('alice')},'./photos':{},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
 const fields={title:' Corrected title ',category:'electrical',description:' Corrected details ',hostel:' NK ',roomNumber:' 105 ',priority:'Low'};
 let seen;const observed=new Promise(resolve=>{seen=resolve;});
 const stop=onSnapshot(doc(db('admin'),'requests','REQ-a'),snapshot=>{if(snapshot.data()?.title==='Corrected title'&&snapshot.data()?.roomNumber==='105')seen();});
 try{
  assert.equal(await service.updateRequest('REQ-a',fields),true);
  assert.equal(await service.updateRequest('REQ-a',fields),false);await observed;
 }finally{stop();}
 const after=(await getDoc(doc(db('admin'),'requests','REQ-a'))).data();
 for(const [field,value]of Object.entries(fields))assert.equal(after[field],value.trim());
 for(const field of ['id','ownerId','status','assignedStaffId','approvedBy','photoPath'])assert.deepEqual(after[field],before[field]);
 assert.equal(after.createdAt.toMillis(),before.createdAt.toMillis());
 const events=await getDocs(collection(db('alice'),'requests','REQ-a','history'));assert.equal(events.size,1);
 assert.equal(events.docs[0].data().action,'Updated');assert.equal(events.docs[0].data().actorId,'alice');
 assert.equal(events.docs[0].data().createdAt.toMillis(),after.updatedAt.toMillis());
});
test('concurrent identical edits cannot produce duplicate history or overwrite protected data',async()=>{
 const service=require('./helpers/load-source.cjs')('src/services/requests.ts',{'./firebase':{auth:{currentUser:{uid:'alice'},authStateReady:async()=>{}},db:db('alice')},'./photos':{},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
 const changes={title:'One correction',description:'Corrected once',category:'electrical',hostel:'NK',roomNumber:'5',priority:'Low'};
 const results=await Promise.allSettled([service.updateRequest('REQ-a',changes),service.updateRequest('REQ-a',changes)]);
 assert.ok(results.some(result=>result.status==='fulfilled'&&result.value===true));
 for(const result of results)if(result.status==='rejected')assert.equal(result.reason.code,'permission-denied');
 const saved=(await getDoc(doc(db('admin'),'requests','REQ-a'))).data();assert.equal(saved.title,changes.title);assert.equal(saved.ownerId,'alice');assert.equal(saved.status,'Pending');
 assert.equal((await getDocs(collection(db('alice'),'requests','REQ-a','history'))).size,1);
});
test('raw student edits reject protected fields and invalid content without history side effects',async()=>{
 for(const patch of [{id:'forged'},{ownerId:'bob'},{status:'Approved'},{createdAt:Timestamp.fromMillis(1)},{approvedBy:'alice'},{statusChangedBy:'alice'},{completionNotes:'fake'},{rejectionReason:'fake'},{title:'   '},{description:'x'.repeat(4001)},{category:'invalid'},{priority:'Urgent'}])await assertFails(atomic('alice','REQ-a',patch));
 await assertFails(atomic('bob','REQ-a',{title:'Other owner'}));
 for(const status of ['Approved','In Progress','Finished','Rejected']){
  await seed('REQ-reviewed',status);await assertFails(atomic('alice','REQ-reviewed',{title:'Too late'}));
 }
 assert.equal((await getDocs(collection(db('admin'),'requests','REQ-a','history'))).size,0);
});
test('private hiding and restore never change shared requests, timestamps, audits, other preferences or operational counts',async()=>{
 for(const status of ['Finished','Rejected','Resolved']){
  const id='REQ-hide-'+status;await seed(id,status);
  await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),'requests',id,'history','original'),{action:status,status,actorId:'admin',createdAt:Timestamp.now(),notes:'Preserve audit'}));
  const shared=(await getDoc(doc(db('admin'),'requests',id))).data();
  const audit=(await getDoc(doc(db('admin'),'requests',id,'history','original'))).data();
  const studentCount=(await getDocs(query(collection(db('alice'),'requests'),where('ownerId','==','alice')))).size;
  const adminCount=(await getDocs(collection(db('admin'),'requests'))).size;
  await historyClient('alice').hideHistoryRequest(id);
  assert.equal((await getDoc(doc(db('alice'),'users','alice','historyPreferences',id))).data().hidden,true);
  assert.equal((await getDoc(doc(db('admin'),'users','admin','historyPreferences',id))).exists(),false);
  await historyClient('admin').hideHistoryRequest(id);
  await historyClient('alice').restoreHistoryRequest(id);
  assert.equal((await getDoc(doc(db('alice'),'users','alice','historyPreferences',id))).exists(),false);
  assert.equal((await getDoc(doc(db('admin'),'users','admin','historyPreferences',id))).data().hidden,true);
  await historyClient('admin').restoreHistoryRequest(id);
  assert.deepEqual((await getDoc(doc(db('admin'),'requests',id))).data(),shared);
  assert.deepEqual((await getDoc(doc(db('admin'),'requests',id,'history','original'))).data(),audit);
  assert.equal((await getDocs(query(collection(db('alice'),'requests'),where('ownerId','==','alice')))).size,studentCount);
  assert.equal((await getDocs(collection(db('admin'),'requests'))).size,adminCount);
 }
});
test('history preferences are owner-private even from administrators and hide only permitted terminal requests',async()=>{
 await seed('REQ-finished','Finished');await historyClient('alice').hideHistoryRequest('REQ-finished');
 const target=doc(db('alice'),'users','alice','historyPreferences','REQ-finished');
 await assertSucceeds(getDocs(collection(db('alice'),'users','alice','historyPreferences')));
 for(const actor of ['bob','admin','tech','pending']){
  const other=doc(db(actor),'users','alice','historyPreferences','REQ-finished');
  await assertFails(getDoc(other));await assertFails(getDocs(collection(db(actor),'users','alice','historyPreferences')));
  await assertFails(setDoc(other,{requestId:'REQ-finished',hidden:true,updatedAt:serverTimestamp()}));await assertFails(deleteDoc(other));
 }
 for(const patch of [{requestId:'REQ-a'},{hidden:false},{extra:true},{updatedAt:Timestamp.fromMillis(1)}])await assertFails(setDoc(target,{requestId:'REQ-finished',hidden:true,updatedAt:serverTimestamp(),...patch}));
 for(const status of ['Pending','Approved','In Progress','mystery']){
  const id='REQ-'+status.replaceAll(' ','-');await seed(id,status);
  for(const actor of ['alice','admin'])await assertFails(setDoc(doc(db(actor),'users',actor,'historyPreferences',id),{requestId:id,hidden:true,updatedAt:serverTimestamp()}));
 }
 await assertFails(setDoc(doc(db('bob'),'users','bob','historyPreferences','REQ-finished'),{requestId:'REQ-finished',hidden:true,updatedAt:serverTimestamp()}));
 for(const actor of ['tech','pending'])await assertFails(setDoc(doc(db(actor),'users',actor,'historyPreferences','REQ-finished'),{requestId:'REQ-finished',hidden:true,updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(doc(db('alice'),'requests','REQ-finished')));
});
test('admin approves, starts and finishes without any assignment fields',async()=>{
 for(const status of ['Approved','In Progress','Finished'])await assertSucceeds(atomic('admin','REQ-a',statusPatch('admin',status)));
 const saved=(await getDoc(doc(db('alice'),'requests','REQ-a'))).data();
 assert.equal(saved.status,'Finished');assert.equal(saved.completionNotes,'Completed repair');assert.equal(saved.finishedBy,'admin');assert.ok(saved.finishedAt instanceof Timestamp);assert.equal(saved.assignedStaffId,undefined);
 assert.equal((await getDocs(collection(db('alice'),'requests','REQ-a','history'))).size,3);
});
test('the actual client service creates, edits, approves, starts and finishes atomically',async()=>{
 const load=require('./helpers/load-source.cjs');
 const client=uid=>load('src/services/requests.ts',{'./firebase':{auth:{currentUser:{uid},authStateReady:async()=>{}},db:db(uid)},'./photos':{},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
 const student=client('alice');
 const id=await student.createRequest({ownerId:'alice',category:'plumbing',title:'Tap',description:'Leak',hostel:'RK',roomNumber:'1',priority:'High'});
 await student.updateRequest(id,{description:'Updated leak',priority:'Low'});
 await assert.rejects(student.updateRequestStatus(id,'Approved'),/Only approved administrators/);
 assert.equal((await getDocs(collection(db('alice'),'requests',id,'history'))).size,2);
 const admin=client('admin');
 await assert.rejects(admin.updateRequestStatus(id,'In Progress'),/Invalid status transition/);
 for(const status of ['Approved','In Progress','Finished'])await admin.updateRequestStatus(id,status,'Repaired by admin');
 const saved=await student.getRequest(id);assert.equal(saved.status,'Finished');assert.equal(saved.completionNotes,'Repaired by admin');
 assert.equal((await getDocs(collection(db('alice'),'requests',id,'history'))).size,5);
});
test('actual Save Priority handles every priority without status-transition fields and then finishes legacy work',async()=>{
 const load=require('./helpers/load-source.cjs');
 const client=uid=>load('src/services/requests.ts',{'./firebase':{auth:{currentUser:{uid},authStateReady:async()=>{}},db:db(uid)},'./photos':{},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
 for(const status of ['Pending','Approved','In Progress']){
  const id='REQ-priority-'+status.replaceAll(' ','-');
  await seed(id,status,{assignedStaffId:'retired',assignedStaffName:'Legacy',resolutionNotes:null,resolvedAt:null});
  for(const priority of ['Low','Medium','High']){
   await client('admin').changeRequestPriority(id,priority);
   const saved=(await getDoc(doc(db('alice'),'requests',id))).data();
   assert.equal(saved.status,status);assert.equal(saved.priority,priority);
   assert.equal(saved.statusChangedBy,undefined);assert.equal(saved.statusChangedAt,undefined);
   assert.equal(saved.assignedStaffId,'retired');
   const event=(await getDoc(doc(db('alice'),'requests',id,'history',saved.lastEventId))).data();
   assert.equal(event.action,'Priority changed');assert.equal(event.status,status);assert.equal(event.notes,null);assert.equal(event.actorId,'admin');assert.equal(event.priorityAfter,priority);
   assert.equal(event.createdAt.toMillis(),saved.updatedAt.toMillis());
  }
 }
 const id='REQ-priority-In-Progress';
 await client('admin').updateRequestStatus(id,'Finished','  Repaired and tested  ');
 const saved=(await getDoc(doc(db('alice'),'requests',id))).data();
 assert.equal(saved.status,'Finished');assert.equal(saved.completionNotes,'Repaired and tested');
 assert.equal(saved.finishedBy,'admin');assert.equal(saved.statusChangedBy,'admin');
 for(const field of ['finishedAt','statusChangedAt'])assert.equal(saved[field].toMillis(),saved.updatedAt.toMillis());
 const event=(await getDoc(doc(db('alice'),'requests',id,'history',saved.lastEventId))).data();
 assert.equal(event.action,'Finished');assert.equal(event.previousStatus,'In Progress');assert.equal(event.status,'Finished');assert.equal(event.notes,saved.completionNotes);
});
test('actual admin-only priority service rejects students even for unchanged priority; finish is denied',async()=>{
 const load=require('./helpers/load-source.cjs');
 const client=uid=>load('src/services/requests.ts',{'./firebase':{auth:{currentUser:{uid},authStateReady:async()=>{}},db:db(uid)},'./photos':{},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
 await assert.rejects(client('alice').changeRequestPriority('REQ-a','High'));
 await assert.rejects(client('alice').changeRequestPriority('REQ-a','Low'));
 await seed('REQ-a','In Progress');
 await assert.rejects(client('alice').updateRequestStatus('REQ-a','Finished','Student attempt'));
 assert.equal((await getDocs(collection(db('admin'),'requests','REQ-a','history'))).size,0);
});
test('priority and finish reject request/history mismatches and roll back both documents',async()=>{
 for(const operation of ['priority','finish']){
  await seed('REQ-a',operation==='priority'?'Approved':'In Progress');
  const patch=operation==='priority'?{priority:'Low'}:statusPatch('admin','Finished','Repair checked');
  for(const options of [{omitEvent:true},{omitUpdate:true},{eventPatch:{action:'Resolved'}},{eventPatch:{actorId:'alice'}},{eventPatch:{priorityAfter:'Medium'}},{eventPatch:{notes:'Different notes'}}])await assertFails(atomic('admin','REQ-a',patch,options));
  const saved=(await getDoc(doc(db('admin'),'requests','REQ-a'))).data();
  assert.equal(saved.priority,'High');assert.equal(saved.status,operation==='priority'?'Approved':'In Progress');
  assert.equal((await getDocs(collection(db('admin'),'requests','REQ-a','history'))).size,0);
 }
 await assertFails(atomic('alice','REQ-a',{priority:'Low'},{action:'Priority changed'}));
});
test('old request policy rejects both operations; old history policy still denies an otherwise current request write',async()=>{
 const legacyRules=fs.readFileSync('tests/fixtures/legacy-admin-operations.rules','utf8');
 const currentRules=fs.readFileSync('firestore.rules','utf8');
 const marker='      match /history/{eventId} {';
 const legacyHistory=legacyRules.slice(legacyRules.indexOf(marker));
 // Emulator-only diagnostic: current request rules plus the unmodified old history block.
 const currentRequestOldHistory=currentRules.slice(0,currentRules.indexOf(marker)).replace("function admin() { return signed() && role() == 'admin'; }","function admin() { return signed() && role() == 'admin'; }\n    function staff() { return signed() && role() == 'staff'; }")+legacyHistory;
 for(const [label,rules]of [['old',legacyRules],['history-old',currentRequestOldHistory]]){
  const diagnostic=await initializeTestEnvironment({projectId:'demo-quickfix-'+label,firestore:{rules}});
  try {
   await diagnostic.withSecurityRulesDisabled(async context=>{
    await setDoc(doc(context.firestore(),'users','admin'),profile('admin','admin'));
    await setDoc(doc(context.firestore(),'requests','REQ-old'),{...issue('REQ-old','alice','In Progress'),assignedStaffId:null,assignedStaffName:null,resolutionNotes:null,resolvedAt:null});
   });
   const store=diagnostic.authenticatedContext('admin',{email:'admin@example.test'}).firestore();
   const service=require('./helpers/load-source.cjs')('src/services/requests.ts',{'./firebase':{auth:{currentUser:{uid:'admin'},authStateReady:async()=>{}},db:store},'./photos':{},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
   for(const operation of [()=>service.changeRequestPriority('REQ-old','Low'),()=>service.updateRequestStatus('REQ-old','Finished','Repair checked')]){
    await assert.rejects(operation(),error=>error.cause?.code==='permission-denied'&&/publish the complete current Firestore rules/.test(error.message));
   }
   // Removing history entirely still cannot make the old request policy accept these payloads.
   if(label==='old'){
    await assertFails(updateDoc(doc(store,'requests','REQ-old'),{priority:'Low',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(store,'requests','REQ-old'),{...statusPatch('admin','Finished','Repair checked'),updatedAt:serverTimestamp()}));
   }
   assert.equal((await getDocs(collection(store,'requests','REQ-old','history'))).size,0);
   const saved=(await getDoc(doc(store,'requests','REQ-old'))).data();assert.equal(saved.priority,'High');assert.equal(saved.status,'In Progress');
  } finally {await diagnostic.cleanup();}
 }
});
test('rejection from Pending and Approved requires a reason',async()=>{
 for(const from of ['Pending','Approved']){
  const id='REQ-'+from;await seed(id,from);
  await assertFails(atomic('admin',id,statusPatch('admin','Rejected','   ')));
  await assertSucceeds(atomic('admin',id,statusPatch('admin','Rejected','Outside maintenance scope')));
  const saved=(await getDoc(doc(db('alice'),'requests',id))).data();assert.equal(saved.rejectionReason,'Outside maintenance scope');assert.equal(saved.rejectedBy,'admin');assert.ok(saved.rejectedAt instanceof Timestamp);
 }
});
test('rules enforce every allowed transition and deny every other pair',async()=>{
 const statuses=['Pending','Approved','In Progress','Finished','Rejected'];const allowed=new Set(['Pending>Approved','Pending>Rejected','Approved>In Progress','Approved>Rejected','In Progress>Finished']);
 for(const from of statuses)for(const to of statuses){
  const id='REQ-matrix';await seed(id,from);const write=atomic('admin',id,statusPatch('admin',to));
  if(allowed.has(from+'>'+to))await assertSucceeds(write);else await assertFails(write);
 }
});
test('completion requires real notes, actor UID and server timestamps; failures leave no history',async()=>{
 await seed('REQ-a','In Progress');
 for(const patch of [{completionNotes:''},{completionNotes:'  '},{completionNotes:'x'.repeat(4001)},{finishedBy:'bob'},{statusChangedBy:'bob'},{finishedAt:Timestamp.fromMillis(1)}])await assertFails(atomic('admin','REQ-a',{...statusPatch('admin','Finished'),...patch}));
 assert.equal((await getDocs(collection(db('admin'),'requests','REQ-a','history'))).size,0);
 assert.equal((await getDoc(doc(db('admin'),'requests','REQ-a'))).data().status,'In Progress');
});
test('students, old staff and pending accounts cannot perform admin transitions even with matching audit',async()=>{
 for(const uid of ['alice','bob','tech','pending'])for(const [from,to]of [['Pending','Approved'],['Approved','In Progress'],['In Progress','Finished'],['Pending','Rejected']]){
  await seed('REQ-a',from);await assertFails(atomic(uid,'REQ-a',statusPatch(uid,to)));
 }
});
test('students edit/delete only before review, with history for edits',async()=>{
 await assertSucceeds(atomic('alice','REQ-a',{description:'More detail',priority:'Low'}));
 await assertFails(atomic('bob','REQ-a',{description:'Forged'}));
 await assertFails(atomic('alice','REQ-a',{assignedStaffId:'tech'}));
 for(const status of ['Approved','In Progress','Finished','Rejected','Resolved']){
  await seed('REQ-reviewed',status);await assertFails(atomic('alice','REQ-reviewed',{title:'Edit'}));await assertFails(deleteDoc(doc(db('alice'),'requests','REQ-reviewed')));
 }
 await assertSucceeds(deleteDoc(doc(db('alice'),'requests','REQ-a')));
});
test('admin priority changes are audited; terminal and unknown records are locked',async()=>{
 await assertFails(updateDoc(doc(db('admin'),'requests','REQ-a'),{priority:'Low',updatedAt:serverTimestamp()}));
 for(const from of ['Pending','Approved','In Progress']){await seed('REQ-a',from);await assertSucceeds(atomic('admin','REQ-a',{priority:'Low'}));}
 for(const from of ['Finished','Rejected','Resolved','Assigned','mystery']){await seed('REQ-a',from);await assertFails(atomic('admin','REQ-a',{priority:'Low'}));}
});
test('legacy fields are inert, missing new fields are accepted and original data is preserved',async()=>{
 const legacy={assignedStaffId:'tech',assignedStaffName:'Legacy Person',resolutionNotes:null,resolvedAt:null,legacyExtra:'keep'};
 await seed('REQ-a','Pending',legacy);await assertSucceeds(atomic('admin','REQ-a',statusPatch('admin','Approved')));
 const saved=(await getDoc(doc(db('admin'),'requests','REQ-a'))).data();for(const [key,value]of Object.entries(legacy))assert.equal(saved[key],value);
 await assertFails(atomic('admin','REQ-a',{assignedStaffId:'another'}));
 await seed('REQ-legacy','In Progress',legacy);await assertSucceeds(atomic('admin','REQ-legacy',statusPatch('admin','Finished')));
 await seed('REQ-resolved','Resolved',{resolutionNotes:'Old repair',resolvedAt:Timestamp.now()});await assertFails(atomic('admin','REQ-resolved',statusPatch('admin','Approved')));
 await seed('REQ-format','in_progress');await assertSucceeds(atomic('admin','REQ-format',statusPatch('admin','Finished')));
});
test('owners read only own data/history; old staff lose assignment-based access',async()=>{
 await seed('REQ-a','Pending',{assignedStaffId:'tech',assignedStaffName:'Tech'});
 await assertSucceeds(getDocs(query(collection(db('alice'),'requests'),where('ownerId','==','alice'),orderBy('createdAt','desc'))));
 await assertSucceeds(getDocs(collection(db('admin'),'requests')));
 for(const uid of ['bob','tech','pending']){await assertFails(getDoc(doc(db(uid),'requests','REQ-a')));await assertFails(getDocs(collection(db(uid),'requests')));}
 await assertFails(getDocs(collection(db('alice'),'requests')));
 await assertSucceeds(atomic('admin','REQ-a',statusPatch('admin','Approved')));
 await assertSucceeds(getDocs(collection(db('alice'),'requests','REQ-a','history')));await assertFails(getDocs(collection(db('tech'),'requests','REQ-a','history')));
});
test('request and history writes are inseparable; forged or extra events roll back',async()=>{
 const patch=statusPatch('admin','Approved');
 await assertFails(atomic('admin','REQ-a',patch,{omitEvent:true}));
 await assertFails(atomic('admin','REQ-a',patch,{omitUpdate:true}));
 for(const eventPatch of [{actorId:'bob'},{previousStatus:'Approved'},{action:'Started'},{notes:'Fake'},{priorityAfter:'Low'}])await assertFails(atomic('admin','REQ-a',patch,{eventPatch}));
 assert.equal((await getDocs(collection(db('admin'),'requests','REQ-a','history'))).size,0);
 await assertSucceeds(atomic('admin','REQ-a',patch));const saved=(await getDoc(doc(db('admin'),'requests','REQ-a'))).data();
 await assertFails(updateDoc(doc(db('admin'),'requests','REQ-a','history',saved.lastEventId),{notes:'Altered'}));
 await assertFails(deleteDoc(doc(db('admin'),'requests','REQ-a','history',saved.lastEventId)));
});
test('student feed, details and history listeners receive the same status and notes live',{timeout:15000},async()=>{
 const seen={feed:[],detail:[],history:[]};const stops=[];let finish;
 const complete=new Promise(resolve=>{finish=resolve;});
 function check(){if(seen.feed.some(item=>item.status==='Finished'&&item.completionNotes==='Live repair')&&seen.detail.some(item=>item.status==='Finished'&&item.completionNotes==='Live repair')&&seen.history.some(item=>item.status==='Finished'&&item.notes==='Live repair'))finish();}
 stops.push(onSnapshot(query(collection(db('alice'),'requests'),where('ownerId','==','alice')),snapshot=>{seen.feed.push(...snapshot.docs.map(item=>item.data()));check();}));
 stops.push(onSnapshot(doc(db('alice'),'requests','REQ-a'),snapshot=>{seen.detail.push(snapshot.data());check();}));
 stops.push(onSnapshot(collection(db('alice'),'requests','REQ-a','history'),snapshot=>{seen.history.push(...snapshot.docs.map(item=>item.data()));check();}));
 try{for(const status of ['Approved','In Progress','Finished'])await atomic('admin','REQ-a',statusPatch('admin',status,'Live repair'));await complete;}finally{stops.forEach(stop=>stop());}
});
test('profile ownership, protected role writes and manual approval remain secure',async()=>{
 await assertSucceeds(createMissingPendingAdminProfile(db('newadmin'),'newadmin','newadmin@example.test','Name'));
 await assertFails(updateDoc(doc(db('newadmin'),'users','newadmin'),{role:'admin',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(db('forged'),'users','forged'),{...profile('forged','admin'),createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(db('alice'),'users','alice'),{role:'admin',updatedAt:serverTimestamp()}));
 await env.withSecurityRulesDisabled(context=>updateDoc(doc(context.firestore(),'users','newadmin'),{role:'admin'}));
 await assertSucceeds(atomic('newadmin','REQ-a',statusPatch('newadmin','Approved')));
 assert.equal((await getDoc(doc(db('tech'),'users','tech'))).data().role,'staff');
 await assertSucceeds(getDoc(doc(db('alice'),'users','alice')));await assertFails(getDoc(doc(db('bob'),'users','alice')));
});
test('pending setup and student recovery preserve existing roles/data',async()=>{
 const before=(await getDoc(doc(db('alice'),'users','alice'))).data();
 await assert.rejects(createMissingPendingAdminProfile(db('alice'),'alice','alice@example.test','Admin'),/existing profile is preserved/);
 assert.deepEqual((await getDoc(doc(db('alice'),'users','alice'))).data(),before);
 for(const patch of [{email:'fake@example.test'},{uid:'bob'},{studentId:'fake'},{role:'staff'}])await assertFails(updateDoc(doc(db('alice'),'users','alice'),{...patch,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(db('alice'),'users','alice'),{displayName:'Alice',updatedAt:serverTimestamp()}));
 for(const uid of ['alice','admin','tech']){await assertFails(getDoc(doc(db(uid),'system','adminRegistration')));await assertFails(setDoc(doc(db(uid),'system','adminRegistration'),{approvedUids:[uid]}));}
});
test('Storage keeps owner/admin protection and removes legacy staff access (emulator only)',async()=>{
 const storage=uid=>env.authenticatedContext(uid,{email:uid+'@example.test'}).storage();const path='requests/alice/REQ-a/photo';
 const bytes=new Uint8Array([255,216,255,0]);const metadata={contentType:'image/jpeg',customMetadata:{ownerId:'alice',requestId:'REQ-a'}};
 await assertSucceeds(uploadBytes(ref(storage('alice'),path),bytes,metadata));
 await assertSucceeds(atomic('alice','REQ-a',{photoPath:path}));
 await assertSucceeds(getBytes(ref(storage('alice'),path)));await assertSucceeds(getBytes(ref(storage('admin'),path)));
 for(const uid of ['bob','tech','pending'])await assertFails(getBytes(ref(storage(uid),path)));
 await assertFails(deleteObject(ref(storage('alice'),path)));await assertFails(uploadBytes(ref(storage('alice'),path),bytes,metadata));
 await assertFails(uploadBytes(ref(storage('alice'),'requests/alice/REQ-a/text'),bytes,{...metadata,contentType:'text/plain'}));
 await assertFails(uploadBytes(ref(storage('alice'),'requests/alice/REQ-a/large'),new Uint8Array(5*1024*1024+1),metadata));
});
const profileInput = {displayName:'  New Student  ',studentId:'  02230145  ',hostel:' RK ',roomNumber:' 102 '};
test('production completion creates a missing owner profile with trimmed fields and server timestamps',async()=>{
 const owner=db('recovery');
 assert.equal((await getDoc(doc(owner,'users','recovery'))).exists(),false);
 assert.equal(await createMissingStudentProfile(owner,'recovery','recovery@example.test',profileInput),true);
 const saved=(await getDoc(doc(owner,'users','recovery'))).data();
 assert.deepEqual(Object.keys(saved).sort(),['uid','email','displayName','studentId','hostel','roomNumber','role','createdAt','updatedAt'].sort());
 assert.equal(saved.uid,'recovery');assert.equal(saved.role,'student');assert.equal(saved.email,'recovery@example.test');
 assert.equal(saved.displayName,'New Student');assert.equal(saved.studentId,'02230145');assert.equal(saved.hostel,'RK');assert.equal(saved.roomNumber,'102');
 assert.ok(saved.createdAt instanceof Timestamp);assert.ok(saved.updatedAt instanceof Timestamp);
 assert.equal(saved.createdAt.toMillis(),saved.updatedAt.toMillis());
});
test('completion retries preserve existing student, staff and administrator profiles exactly',async()=>{
 for(const uid of ['alice','tech','admin']){
  const owner=db(uid);const before=(await getDoc(doc(owner,'users',uid))).data();
  assert.equal(await createMissingStudentProfile(owner,uid,uid+'@example.test',profileInput),false);
  assert.deepEqual((await getDoc(doc(owner,'users',uid))).data(),before);
 }
});
test('concurrent completion attempts create once without overwriting the winning profile',async()=>{
 const owner=db('race');
 const results=await Promise.all([
  createMissingStudentProfile(owner,'race','race@example.test',profileInput),
  createMissingStudentProfile(owner,'race','race@example.test',{...profileInput,displayName:'Another attempt'}),
 ]);
 assert.deepEqual(results.sort(),[false,true]);
 assert.equal((await getDoc(doc(owner,'users','race'))).data().role,'student');
});
test('completion aborts before writing when the authenticated account changes during its read',async()=>{
 const owner=db('changed');let calls=0;
 await assert.rejects(createMissingStudentProfile(owner,'changed','changed@example.test',profileInput,()=>{if(++calls===3)throw new Error('Account changed');}),/Account changed/);
 assert.equal((await getDoc(doc(owner,'users','changed'))).exists(),false);
});
test('completion cannot create another authenticated users profile',async()=>{
 await assertFails(createMissingStudentProfile(db('alice'),'another','another@example.test',profileInput));
});
test('the reported deployed get-only policy reproduces the creation permission error',async()=>{
 const diagnostic=await initializeTestEnvironment({
  projectId:'demo-quickfix-readonly',
  firestore:{rules:fs.readFileSync('tests/fixtures/deployed-profile-read-only.rules','utf8')},
 });
 try {
  const owner=diagnostic.authenticatedContext('existing-account',{email:'existing@example.test'}).firestore();
  assert.equal((await getDoc(doc(owner,'users','existing-account'))).exists(),false);
  await assertFails(createMissingStudentProfile(owner,'existing-account','existing@example.test',profileInput));
  assert.equal((await getDoc(doc(owner,'users','existing-account'))).exists(),false);
 } finally {await diagnostic.cleanup();}
});




test('Supabase metadata accepts own bounded durable paths and rejects forged or signed URL metadata atomically',async()=>{
 const photo={provider:'supabase',bucket:'request-photos',path:'requests/alice/REQ-photo/a.jpg',mimeType:'image/jpeg',size:1000,width:1600,height:800};
 await assertSucceeds(create('alice','REQ-photo',{photo}));
 assert.deepEqual((await getDoc(doc(db('admin'),'requests','REQ-photo'))).data().photo,photo);
 const bad=[{...photo,path:'requests/bob/REQ-bad/a.jpg'},{...photo,path:'requests/alice/REQ-other/a.jpg'},{...photo,size:2097153},{...photo,mimeType:'image/png'},{...photo,bucket:'public'},{...photo,signedUrl:'https://expiring'},{...photo,width:0}];
 for(const value of bad)await assertFails(create('alice','REQ-bad',{photo:value}));
 const replacement={...photo,path:'requests/alice/REQ-photo/b.jpg'};
 await assertSucceeds(atomic('alice','REQ-photo',{photo:replacement},{action:'Updated'}));
 await assertFails(atomic('bob','REQ-photo',{photo:replacement},{action:'Updated'}));
 await assertSucceeds(atomic('admin','REQ-photo',statusPatch('admin','Approved'),{action:'Approved'}));
 await assertFails(atomic('alice','REQ-photo',{photo:null},{action:'Updated'}));
 await assertSucceeds(atomic('admin','REQ-photo',{priority:'Low'},{action:'Priority changed'}));
 await assertSucceeds(atomic('admin','REQ-photo',statusPatch('admin','In Progress'),{action:'Started'}));
 await assertSucceeds(atomic('admin','REQ-photo',statusPatch('admin','Finished'),{action:'Finished'}));
 const service=require('./helpers/load-source.cjs')('src/services/requests.ts',{'./firebase':{auth:{currentUser:{uid:'alice'},authStateReady:async()=>{}},db:db('alice')},'./photos':{},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
 const input={ownerId:'alice',title:'Original photo request',description:'Leak',category:'plumbing',hostel:'RK',roomNumber:'1',priority:'Medium',photo:{...photo,path:'requests/alice/REQ-retry-photo/a.jpg'}};
 await service.createRequest(input,'REQ-retry-photo');
 await assertSucceeds(atomic('admin','REQ-retry-photo',statusPatch('admin','Approved'),{action:'Approved'}));
 await service.createRequest({...input,title:'Retry must not overwrite'},'REQ-retry-photo');
 const saved=(await getDoc(doc(db('admin'),'requests','REQ-retry-photo'))).data();assert.equal(saved.title,input.title);assert.equal(saved.status,'Approved');assert.deepEqual(saved.photo,input.photo);
 assert.equal((await getDocs(collection(db('admin'),'requests','REQ-retry-photo','history'))).size,2);

});
