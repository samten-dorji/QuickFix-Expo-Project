const {test}=require('node:test');const assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs');
function elements(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(elements)];}
function screen(file,role,status,uid){
 const request={id:'REQ-a',ownerId:'student',category:'plumbing',title:'Tap',description:'Leaking',hostel:'RK',roomNumber:'1',priority:'High',status,createdAt:new Date(),updatedAt:new Date(),completionNotes:status==='Finished'?'Repaired':null,rejectionReason:status==='Rejected'?'Not in scope':null};
 const native={Text:'Text',View:'View',Image:'Image',ActivityIndicator:'ActivityIndicator',Alert:{alert:()=>{}}};
 const stubs={react:{useState:value=>[value,()=>{}],useRef:value=>({current:value}),useEffect:()=>{}},'react-native':native,'expo-router':{router:{}},
  '@/contexts/AuthContext':{useAuth:()=>({user:{uid:uid??(role==='student'?'student':'admin'),role}})},
  '@expo/vector-icons/Feather':'Feather',
  '@/hooks/useRequest':{useRequest:()=>({request,loading:false,error:'',retry:()=>{}})},
  '@/hooks/useNetworkStatus':{useNetworkStatus:()=>({isOffline:false})},
  '@/services/requests':{},'@/services/photos':{},'@/services/errors':{errorMessage:e=>e.message},
  './RequestHistory':{RequestHistory:'RequestHistory'},'./AdminRequestActions':{AdminRequestActions:'AdminRequestActions'},
 };
 for(const name of ['Screen','Card','Select','Input','Button','StatusBadge','PriorityBadge'])stubs['./ui/'+name]={[name]:name,ui:{}};
 const module=load(file,stubs);return elements((module.AdminRequestActions??module.RequestDetails)({request,id:request.id}));
}
test('admin actions follow five-state workflow with no assignment prerequisites',()=>{
 const expected={Pending:['Approve Request','Reject Request'],Approved:['Start Work','Reject Request'],'In Progress':['Mark Finished'],Finished:[],Rejected:[]};
 for(const [status,actions]of Object.entries(expected)){
  const tree=screen('src/components/AdminRequestActions.tsx','admin',status);const labels=tree.filter(node=>node.type==='Button').map(node=>node.props.title).filter(title=>title!=='Save Priority');
  assert.deepEqual(labels,actions);
  for(const title of ['Reject Request','Mark Finished']){const button=tree.find(node=>node.props?.title===title);if(button)assert.equal(button.props.disabled,true);}
 }
});
test('request details contain neither removed card nor assignment controls; students see terminal notes',()=>{
 for(const role of ['student','admin'])for(const status of ['Pending','Approved','In Progress','Finished','Rejected']){
  const tree=screen('src/components/RequestDetails.tsx',role,status);
  const content=JSON.stringify(tree,(key,value)=>typeof value==='function'?undefined:value);
  assert.doesNotMatch(content,/Assigned To|Awaiting assignment|Assign Maintenance|Load Staff|RequestTimeline|Submitted.*Assigned/);
  assert.equal(tree.some(node=>node.type==='AdminRequestActions'),role==='admin');
  if(status==='Finished')assert.match(content,/Completion Notes.*Repaired/);
  if(status==='Rejected')assert.match(content,/Rejection Reason.*Not in scope/);
 }
});
test('Edit Request appears only on the signed-in student owner Pending details',()=>{
 for(const status of ['Pending','Approved','In Progress','Finished','Rejected']){
  assert.equal(screen('src/components/RequestDetails.tsx','student',status).some(node=>node.props?.title==='Edit Request'),status==='Pending');
  assert.equal(screen('src/components/RequestDetails.tsx','student',status,'another-student').some(node=>node.props?.title==='Edit Request'),false);
  assert.equal(screen('src/components/RequestDetails.tsx','admin',status).some(node=>node.props?.title==='Edit Request'),false);
 }
});
test('legacy Resolved decodes to Finished and unknown statuses remain explicit',()=>{
 const {decodeRequest}=load('src/services/requests.ts',{'./firebase':{},'./photos':{},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
 const legacy=decodeRequest('legacy',{status:'Resolved',resolutionNotes:'Original notes',resolvedAt:'2020-01-01',createdAt:'2020-01-01',updatedAt:'2020-01-01'});
 assert.equal(legacy.status,'Finished');assert.equal(legacy.completionNotes,'Original notes');assert.equal(legacy.finishedAt.getFullYear(),2020);
 for(const status of ['Assigned','Submitted','mystery',null])assert.equal(decodeRequest('unknown',{status}).status,'Unknown status');
});
test('detail listener clears errors/data, unsubscribes and ignores late callbacks; legacy staff never subscribe',()=>{
 for(const role of ['student','staff']){
  let observer;let failure;let cleanup;let stops=0;const updates=[];
  const user={uid:'owner',role};
  const {useRequest}=load('src/hooks/useRequest.ts',{
   react:{useState:value=>[value,update=>updates.push(update)],useEffect:effect=>{cleanup=effect();}},
   'firebase/firestore':{doc:()=>({}),onSnapshot:(_,next,error)=>{observer=next;failure=error;return()=>{stops++;};}},
   '@/services/firebase':{db:{app:{options:{projectId:'demo-quickfix'}}},auth:{currentUser:{uid:'owner'}}},
   '@/contexts/AuthContext':{useAuth:()=>({user})},
   '@/services/requests':{decodeRequest:(id,data)=>({id,...data})},
   '@/services/errors':{errorMessage:error=>error.message},
  });
  useRequest('REQ-a');
  if(role==='staff'){assert.equal(observer,undefined);continue;}
  observer({id:'REQ-a',exists:()=>true,data:()=>({status:'Approved'})});
  assert.equal(updates.at(-1).request.status,'Approved');
  failure(new Error('Permission denied'));assert.equal(updates.at(-1).request,null);assert.equal(updates.at(-1).error,'Permission denied');
  cleanup();const count=updates.length;observer({id:'REQ-a',exists:()=>true,data:()=>({status:'Finished'})});
  assert.equal(stops,1);assert.equal(updates.length,count);
 }
});
