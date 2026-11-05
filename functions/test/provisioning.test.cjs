const { test, before, beforeEach, after }=require('node:test');
const assert=require('node:assert/strict');
const {initializeApp:adminApp}=require('firebase-admin/app');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const {getAuth:adminAuth}=require('firebase-admin/auth');
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,signInWithEmailAndPassword}=require('firebase/auth');
const {tokenId}=require('../src/provisioning.cjs');
const project='demo-quickfix';let db;let serverAuth;const clients=new Map();
const accounts={admin:{email:'admin@example.test',verified:true},student:{email:'student@example.test',verified:true},staff:{email:'staff@example.test',verified:true},target:{email:'target@example.test',verified:true},unverified:{email:'unverified@example.test',verified:false},wrong:{email:'wrong@example.test',verified:true}};
before(async()=>{
 if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.env.FIREBASE_EMULATOR_HUB)throw new Error('These tests require isolated local emulators; refusing to contact production.');
 const app=adminApp({projectId:project},'provisioning-tests');db=getFirestore(app);serverAuth=adminAuth(app);
 for(const [uid,account] of Object.entries(accounts)){
  try{await serverAuth.deleteUser(uid);}catch(error){if(error.code!=='auth/user-not-found')throw error;}
  await serverAuth.createUser({uid,email:account.email,password:'TestPassword123!',emailVerified:account.verified});
 }
});
beforeEach(async()=>{
 for(const name of ['users','invitations','roleAudit','system']){
  const docs=await db.collection(name).get();await Promise.all(docs.docs.map(doc=>doc.ref.delete()));
 }
 for(const [uid,role] of [['admin','admin'],['student','student'],['staff','staff']]){
  await db.doc('users/'+uid).set({uid,email:accounts[uid].email,displayName:uid,role,createdAt:Timestamp.now(),updatedAt:Timestamp.now(),...(role==='student'?{studentId:'02230145',hostel:'RK',roomNumber:'102'}:{})});
 }
});
after(async()=>{await Promise.all([...clients.values()].map(client=>deleteApp(client.app)));});
async function token(uid){
 if(!clients.has(uid)){
  const app=initializeApp({apiKey:'demo-api-key',projectId:project},'client-'+uid);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});
  clients.set(uid,{app,auth});
 }
 const auth=clients.get(uid).auth;
 const result=await signInWithEmailAndPassword(auth,accounts[uid].email,'TestPassword123!');
 return result.user.getIdToken(true);
}
async function call(name,data,uid='admin'){
 const headers={'Content-Type':'application/json'};
 if(uid)headers.Authorization='Bearer '+await token(uid);
 const response=await fetch('http://127.0.0.1:5001/'+project+'/us-central1/'+name,{method:'POST',headers,body:JSON.stringify({data})});
 const body=await response.json();
 if(body.error)throw new Error(body.error.status+': '+body.error.message);
 return body.result;
}
const invite=(email,role='admin',uid='admin')=>call('createInvitation',{email,role,expiresHours:24},uid);
const redeem=(code,uid='target',role='admin')=>call('redeemInvitation',{token:code,displayName:'Invited Person',role},uid);
test('callable protocol rejects unauthenticated, student and staff invitation issuers',async()=>{
 await assert.rejects(invite('target@example.test','admin',null),/Sign in|UNAUTHENTICATED/);
 await assert.rejects(invite('target@example.test','admin','student'),/Only an administrator/);
 await assert.rejects(invite('target@example.test','staff','staff'),/Only an administrator/);
});
test('invitation stores only a hash, is email-bound and single-use; privileged profile needs no student fields',async()=>{
 const grant=await invite(' TARGET@example.test ');
 assert.match(grant.token,/^[a-f0-9]{64}$/);assert.equal(grant.email,'target@example.test');
 const stored=(await db.doc('invitations/'+tokenId(grant.token)).get()).data();
 assert.equal(stored.token,undefined);assert.equal(stored.usedBy,null);
 await assert.rejects(redeem(grant.token,'wrong'),/belongs to another email/);
 await redeem(grant.token);
 const profile=(await db.doc('users/target').get()).data();
 assert.equal(profile.role,'admin');assert.equal(profile.studentId,undefined);assert.equal(profile.hostel,undefined);assert.equal(profile.roomNumber,undefined);
 assert.equal((await db.doc('invitations/'+tokenId(grant.token)).get()).data().usedBy,'target');
 assert.equal((await db.collection('roleAudit').get()).size,1);
 await assert.rejects(redeem(grant.token),/already used/);
});
test('email verification, expiry and invitation role are enforced server-side',async()=>{
 const unverified=await invite('unverified@example.test');
 await assert.rejects(redeem(unverified.token,'unverified'),/Verify your account email/);
 assert.equal((await db.doc('invitations/'+tokenId(unverified.token)).get()).data().usedBy,null);
 const expired=await invite('target@example.test');
 await db.doc('invitations/'+tokenId(expired.token)).update({expiresAt:Timestamp.fromMillis(Date.now()-1000)});
 await assert.rejects(redeem(expired.token),/expired/);
 const staff=await invite('target@example.test','staff');
 await assert.rejects(redeem(staff.token),/email\/role/);
 await redeem(staff.token,'target','staff');
 assert.equal((await db.doc('users/target').get()).data().role,'staff');
});
test('concurrent redemption consumes an invitation once',async()=>{
 const grant=await invite('target@example.test');
 const results=await Promise.allSettled([redeem(grant.token),redeem(grant.token)]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 assert.equal((await db.collection('roleAudit').get()).size,1);
});
test('authorized promotion preserves existing student data and cannot replace an existing different privileged role',async()=>{
 const before=(await db.doc('users/student').get()).data();
 const grant=await invite('student@example.test');
 await redeem(grant.token,'student');
 const after=(await db.doc('users/student').get()).data();
 assert.equal(after.role,'admin');assert.equal(after.studentId,before.studentId);assert.equal(after.hostel,before.hostel);assert.equal(after.createdAt.toMillis(),before.createdAt.toMillis());
 const forbidden=await invite('staff@example.test');
 await assert.rejects(redeem(forbidden.token,'staff'),/existing privileged role/);
 assert.equal((await db.doc('users/staff').get()).data().role,'staff');
});
test('disabled accounts and forged tokens do not receive roles',async()=>{
 await assert.rejects(redeem('a'.repeat(64)),/invalid/);
 const grant=await invite('target@example.test');
 await serverAuth.updateUser('target',{disabled:true});
 try{await assert.rejects(redeem(grant.token));}finally{await serverAuth.updateUser('target',{disabled:false});}
 assert.equal((await db.doc('users/target').get()).exists,false);
});

