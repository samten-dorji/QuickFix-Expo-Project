const {test}=require('node:test');const assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs');
const {filterRequests}=load('src/utils/requestFilters.ts');
function elements(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(elements)];}
function harness(file,stubs,render){
 const state=[];let cursor=0;
 const react={useState:initial=>{const key=cursor++;if(!(key in state))state[key]=initial;return [state[key],value=>{state[key]=typeof value==='function'?value(state[key]):value;}];},useRef:value=>{const key=cursor++;return state[key]??={current:value};},useEffect:()=>{}};
 const hosts={};for(const name of ['Screen','Button','Input','Select','Choices','Card','RequestCard'])hosts['./ui/'+name]={[name]:name,ui:{}};
 const module=load(file,{react,'react-native':{Text:'Text',View:'View',Image:'Image',Pressable:'Pressable',ActivityIndicator:'ActivityIndicator'},'@expo/vector-icons/Feather':'Feather',...hosts,...stubs});
 return {render:()=>{cursor=0;return elements(render(module));}};
}
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
test('edit form is prefilled, saves only correction fields once, retains photo restrictions and shows success',async()=>{
 const request={id:'REQ-edit',ownerId:'alice',status:'Pending',createdAt:new Date(),title:'Original',category:'plumbing',description:'Leak',hostel:'RK',roomNumber:'1',priority:'High'};
 const writes=[];let finish;
 const app=harness('src/components/RequestForm.tsx',{
  '@/contexts/AuthContext':{useAuth:()=>({user:{uid:'alice',role:'student'}})},
  '@/hooks/useNetworkStatus':{useNetworkStatus:()=>({isOffline:false})},
  '@/services/requestSubmission':{allocateRequestId:()=>assert.fail('Do not recreate a request'),submitRequestWithPhoto:({id,fields})=>{writes.push({id,fields});return new Promise(resolve=>{finish=changed=>resolve({id,changed});});}},
  '@/services/photos':{},'expo-image-picker':{},'expo-router':{router:{replace:()=>{}}},
 },module=>module.RequestForm({request}));
 let tree=app.render();
 for(const [label,value]of [['Problem Title','Original'],['Issue Category','plumbing'],['Detailed Description','Leak'],['Hostel / Block','RK'],['Room Number','1']])assert.equal(tree.find(node=>node.props?.label===label).props.value,value);
 assert.equal(tree.some(node=>node.props?.children==='Photo attachments are not configured. The project owner must complete Supabase setup. You can submit without a photo.'),true);
 assert.equal(tree.some(node=>['Camera','Gallery'].includes(node.props?.title)),false);
 tree.find(node=>node.props?.label==='Problem Title').props.onChangeText(' Corrected ');tree=app.render();
 const save=tree.find(node=>node.props?.title==='Save Changes');save.props.onPress();save.props.onPress();
 assert.equal(writes.length,1);assert.deepEqual(writes[0],{id:'REQ-edit',fields:{category:'plumbing',priority:'High',hostel:'RK',roomNumber:'1',title:'Corrected',description:'Leak'}});
 assert.equal(app.render().find(node=>node.props?.title==='Saving...').props.disabled,true);
 finish(true);await nextTurn();tree=app.render();
 assert.equal(tree.some(node=>node.props?.children==='Request updated successfully.'),true);
 assert.equal(tree.some(node=>node.props?.title==='View Saved Request'),true);
 tree.find(node=>node.props?.label==='Problem Title').props.onChangeText('   ');
 app.render().find(node=>node.props?.title==='Save Changes').props.onPress();await nextTurn();
 assert.equal(writes.length,1);
 assert.equal(app.render().some(node=>node.props?.accessibilityRole==='alert'),true);
});
test('private preference listener waits for server data, uses the current user path and cleans up safely',()=>{
 let observer;let failure;let cleanup;let subscribedPath;let stopped=0;const states=[];
 const auth={currentUser:{uid:'alice'}};
 const {useHistoryPreferences}=load('src/hooks/useHistoryPreferences.ts',{
  react:{useState:initial=>[initial,value=>states.push(value)],useEffect:effect=>{cleanup=effect();}},
  '@/contexts/AuthContext':{useAuth:()=>({user:{uid:'alice',role:'student'}})},
  '@/services/firebase':{auth,db:{app:{options:{projectId:'demo-quickfix'}}}},
  'firebase/firestore':{collection:(_, ...parts)=>parts.join('/'),onSnapshot:(target,_,next,error)=>{subscribedPath=target;observer=next;failure=error;return()=>{stopped++;};}},
 });
 assert.equal(useHistoryPreferences().loading,true);assert.equal(subscribedPath,'users/alice/historyPreferences');
 observer({metadata:{fromCache:true},docs:[]});assert.equal(states.length,0);
 observer({metadata:{fromCache:false},docs:[{id:'REQ-a',data:()=>({hidden:true})}]});
 assert.deepEqual(states.at(-1).hiddenIds,['REQ-a']);
 failure(Object.assign(new Error('denied'),{code:'permission-denied'}));assert.ok(states.at(-1).error);
 const before=states.length;auth.currentUser={uid:'bob'};
 observer({metadata:{fromCache:false},docs:[]});assert.equal(states.length,before);
 cleanup();assert.equal(stopped,1);
});
test('student edit validator rejects protected fields, whitespace, oversized values and invalid selections',()=>{
 const {validateStudentRequestChanges}=load('src/services/requestValidation.ts');
 for(const input of [{ownerId:'other'},{id:'new'},{status:'Approved'},{createdAt:new Date()},{completionNotes:'fake'},{approvedBy:'alice'},{title:'   '},{description:'x'.repeat(4001)},{category:'invalid'},{priority:'Urgent'}])assert.throws(()=>validateStudentRequestChanges(input));
 assert.deepEqual(validateStudentRequestChanges({title:' Corrected ',priority:'Low'}),{title:'Corrected',priority:'Low'});
});
test('student and admin History confirm before private hide, support Undo/Restore and retain all operational requests',async()=>{
 for(const role of ['student','admin']){
  const requests=['Pending','Finished','Rejected'].map((status,index)=>({id:'REQ-'+index,ownerId:'alice',status,title:status,category:'plumbing',priority:'High'}));
  const original=structuredClone(requests);const prefs={hiddenIds:[],loading:false,error:'',retry:()=>{}};
  const calls=[];let dialog;
  const app=harness('src/components/HistoryEntries.tsx',{
   'react-native':{Text:'Text',View:'View',ActivityIndicator:'ActivityIndicator',Alert:{alert:(...args)=>{dialog=args;}}},
   '@/contexts/AuthContext':{useAuth:()=>({user:{uid:role==='student'?'alice':'admin',role}})},
   '@/hooks/useRequests':{useRequests:()=>({requests,loading:false,error:'',cached:false})},
   '@/hooks/useHistoryPreferences':{useHistoryPreferences:()=>prefs},
   '@/hooks/useNetworkStatus':{useNetworkStatus:()=>({isOffline:false})},
   '@/services/requests':{filterRequests},
   '@/services/historyPreferences':{hideHistoryRequest:async(id,uid)=>{calls.push(['hide',id,uid]);prefs.hiddenIds.push(id);},restoreHistoryRequest:async(id,uid)=>{calls.push(['restore',id,uid]);prefs.hiddenIds=prefs.hiddenIds.filter(value=>value!==id);}},
  },module=>module.HistoryEntries());
  let tree=app.render();assert.equal(tree.filter(node=>node.props?.title==='Delete from my history').length,2);
  tree.find(node=>node.props?.title==='Delete from my history').props.onPress();assert.equal(calls.length,0);
  assert.match(dialog[1],/only from your History screen.*audit events.*dashboard counts/);
  dialog[2].find(button=>button.text==='Delete from my history').onPress();await nextTurn();tree=app.render();
  assert.equal(tree.filter(node=>node.type==='RequestCard').length,2);
  assert.deepEqual(calls[0],['hide','REQ-1',role==='student'?'alice':'admin']);
  tree.find(node=>node.props?.title==='Undo').props.onPress();await nextTurn();tree=app.render();assert.equal(tree.filter(node=>node.type==='RequestCard').length,3);
  tree.find(node=>node.props?.title==='Delete from my history').props.onPress();dialog[2][1].onPress();await nextTurn();tree=app.render();
  tree.find(node=>node.props?.title?.startsWith('Show hidden entries')).props.onPress();tree=app.render();
  assert.equal(tree.filter(node=>node.type==='RequestCard').length,1);
  tree.find(node=>node.props?.title==='Restore to my history').props.onPress();await nextTurn();tree=app.render();
  assert.equal(tree.some(node=>node.props?.children==='No hidden entries match these filters.'),true);
  assert.deepEqual(requests,original);
 }
});

test('Firebase token rotation keeps an active profile listener and form session; UID changes still reset it',()=>{
 let tokenChanged;let effect;let snapshots=0;let stopped=0;const changes=[];let cursor=0;
 const auth={currentUser:{uid:'alice'}};
 const provider=load('src/contexts/AuthContext.tsx',{
  react:{createContext:()=>({Provider:'Provider'}),useCallback:fn=>fn,useRef:value=>({current:value}),useState:initial=>{const slot=cursor++;return[initial,value=>changes.push([slot,value])];},useEffect:fn=>{effect=fn;}},
  '@react-native-async-storage/async-storage':{getItem:async()=>null},'firebase/auth':{onIdTokenChanged:(_,fn)=>{tokenChanged=fn;return()=>{};}},
  'firebase/firestore':{doc:()=>({}),onSnapshot:()=>{snapshots++;return()=>stopped++;}},
  '@/services/firebase':{auth,db:{}},'@/hooks/useNetworkStatus':{useNetworkStatus:()=>({isOffline:false})},
 });
 provider.AuthProvider({children:null});const cleanup=effect();tokenChanged(auth.currentUser);assert.equal(snapshots,1);
 changes.length=0;tokenChanged(auth.currentUser);assert.equal(snapshots,1);assert.equal(stopped,0);assert.equal(changes.length,1);assert.equal(changes[0][0],1); // firebaseUser only; no user/profileLoading reset
 auth.currentUser={uid:'bob'};tokenChanged(auth.currentUser);assert.equal(snapshots,2);assert.equal(stopped,1);cleanup();assert.equal(stopped,2);
});

test('configured photo form handles picker cancellation, permission rejection, preview/remove/replace and duplicate submit taps',async()=>{
 const user={uid:'alice',role:'student'};let canceled=true;let grant=true;let chosen=0;let prepared=0;const submits=[];let resolveSave;
 const app=harness('src/components/RequestForm.tsx',{
  '@/contexts/AuthContext':{useAuth:()=>({user})},'@/hooks/useNetworkStatus':{useNetworkStatus:()=>({isOffline:false})},
  '@/config/photoStorage':{PHOTO_UPLOADS_AVAILABLE:true},
  '@/services/requestSubmission':{allocateRequestId:()=> 'REQ-photo',submitRequestWithPhoto:options=>{submits.push(options);return new Promise(resolve=>{resolveSave=()=>resolve({id:options.id,changed:true});});}},
  '@/services/photos':{preparePhoto:async(uri,width,height)=>{prepared++;return{uri:'file://prepared-'+chosen,width,height,size:1000};}},
  'expo-image-picker':{requestMediaLibraryPermissionsAsync:async()=>({granted:grant}),requestCameraPermissionsAsync:async()=>({granted:grant}),launchImageLibraryAsync:async()=>{chosen++;return{canceled,assets:[{uri:'file://original',width:100,height:100}]};},launchCameraAsync:async()=>{chosen++;return{canceled,assets:[{uri:'file://camera',width:100,height:100}]};}},
  'expo-router':{router:{replace:()=>{}}},
 },module=>module.RequestForm({}));
 let tree=app.render();assert.ok(tree.some(node=>node.props?.title==='Take Photo'));assert.ok(tree.some(node=>node.props?.title==='Choose from Gallery'));
 tree.find(node=>node.props?.title==='Choose from Gallery').props.onPress();await nextTurn();assert.equal(prepared,0);assert.equal(app.render().some(node=>node.type==='Image'),false);
 canceled=false;grant=false;app.render().find(node=>node.props?.title==='Take Photo').props.onPress();await nextTurn();assert.equal(prepared,0);assert.ok(app.render().some(node=>node.props?.accessibilityRole==='alert'));
 grant=true;app.render().find(node=>node.props?.title==='Choose from Gallery').props.onPress();await nextTurn();tree=app.render();assert.equal(prepared,1);assert.ok(tree.some(node=>node.type==='Image'&&node.props.source.uri==='file://prepared-2'));
 tree.find(node=>node.props?.title==='Take Photo').props.onPress();await nextTurn();assert.equal(prepared,2);tree=app.render();tree.find(node=>node.props?.title==='Remove Photo').props.onPress();assert.equal(app.render().some(node=>node.type==='Image'),false);
 app.render().find(node=>node.props?.title==='Choose from Gallery').props.onPress();await nextTurn();tree=app.render();
 for(const [label,value]of [['Problem Title','Leak'],['Detailed Description','Tap broken'],['Hostel / Block','RK'],['Room Number','1']])tree.find(node=>node.props?.label===label).props.onChangeText(value);
 tree=app.render();const button=tree.find(node=>node.props?.title==='Submit Request');button.props.onPress();button.props.onPress();assert.equal(submits.length,1);assert.equal(submits[0].image.size,1000);resolveSave();await nextTurn();
});
