const {test}=require('node:test');const assert=require('node:assert/strict');const load=require('./helpers/load-source.cjs');
const available={PHOTO_UPLOADS_AVAILABLE:false,PHOTO_UPLOAD_UNAVAILABLE_MESSAGE:'Photo attachments are not configured.'};
test('missing configuration fails before authentication or any storage request',async()=>{
 const service=load('src/services/supabase.ts',{'react-native-url-polyfill/auto':{},'@supabase/supabase-js':{createClient:()=>assert.fail('No network')},'./firebase':{auth:{authStateReady:()=>assert.fail('No auth')}},'../config/photoStorage':available});
 await assert.rejects(service.photoIdentity(),{message:available.PHOTO_UPLOAD_UNAVAILABLE_MESSAGE});
 assert.throws(()=>service.photoClient(),{message:available.PHOTO_UPLOAD_UNAVAILABLE_MESSAGE});
});
function photos({size=1000,uploadError,abort=false}={}) {
 const calls=[];let tokenUid='alice';let signed=0;
 const module=load('src/services/photos.ts',{
  'react-native':{Platform:{OS:'ios'}},'expo-file-system':{File:class{async arrayBuffer(){const bytes=new Uint8Array(size);bytes.set([255,216,255]);return bytes.buffer;}delete(){}}},
  'expo-image-manipulator':{SaveFormat:{JPEG:'jpeg'},ImageManipulator:{manipulate:()=>({resize:options=>calls.push(['resize',options]),renderAsync:async()=>({saveAsync:async options=>{calls.push(['save',options]);return{uri:'file://compressed.jpg',width:1600,height:800};},release(){}}),release(){}})}},
  'expo-crypto':{randomUUID:()=> 'abc-123'},'./firebase':{auth:{get currentUser(){return{uid:tokenUid};}}},
  './supabase':{photoIdentity:async()=>tokenUid,photoClient:()=>({storage:{from:bucket=>({upload:async(path,bytes,options)=>{calls.push(['upload',bucket,path,bytes,options]);return{error:uploadError};},createSignedUrl:async(path,ttl)=>{signed++;return{data:{signedUrl:'https://signed/'+signed},error:null};},remove:async paths=>({error:null})})}})},
  './photoQueue':{rememberPhoto:async photo=>calls.push(['queued',photo])},
 });
 return{...module,calls,setUid:uid=>tokenUid=uid,signedCount:()=>signed};
}
test('image preparation resizes and saves JPEG; upload sends ArrayBuffer, queues before upload and stores durable metadata',async()=>{
 const p=photos();const image=await p.preparePhoto('file://original',4000,2000);
 assert.equal(image.size,1000);assert.deepEqual(p.calls[0],['resize',{width:1600,height:800}]);assert.equal(p.calls[1][1].format,'jpeg');
 const attachment=await p.uploadPhoto('REQ-a',image);
 assert.equal(attachment.path,'requests/alice/REQ-a/abc-123.jpg');assert.equal(attachment.provider,'supabase');assert.equal(attachment.size,1000);assert.equal('signedUrl' in attachment,false);
 const upload=p.calls.find(call=>call[0]==='upload');assert.ok(upload[3] instanceof ArrayBuffer);assert.equal(upload[4].upsert,false);assert.ok(p.calls.findIndex(call=>call[0]==='queued')<p.calls.indexOf(upload));
});
test('oversized images, canceled upload and storage failures do not return an attachment',async()=>{
 const p=photos({size:2097153});await assert.rejects(p.preparePhoto('file://large',4000,2000),/below 2 MB/);
 const canceled=photos();await assert.rejects(canceled.uploadPhoto('REQ-a',{uri:'x',width:1,height:1},{signal:AbortSignal.abort()}),/canceled/);assert.equal(canceled.calls.length,0);
 const failed=photos({uploadError:{message:'RLS rejected'}});await assert.rejects(failed.uploadPhoto('REQ-a',{uri:'x',width:1,height:1}),/RLS rejected/);
});
test('signed URL cache is scoped to Firebase UID, expires and supports forced refresh',async()=>{
 const p=photos();const attachment={bucket:'request-photos',path:'requests/alice/REQ-a/a.jpg'};const now=Date.now;let time=1000;Date.now=()=>time;
 try{assert.equal((await p.signedPhoto(attachment)).url,'https://signed/1');await p.signedPhoto(attachment);assert.equal(p.signedCount(),1);time+=121000;await p.signedPhoto(attachment);assert.equal(p.signedCount(),2);await p.signedPhoto(attachment,true);assert.equal(p.signedCount(),3);p.setUid('admin');await p.signedPhoto(attachment);assert.equal(p.signedCount(),4);}finally{Date.now=now;}
});
test('upload precedes Firestore creation; failure never creates request; ambiguous retry returns the existing request',async()=>{
 const calls=[];let exists=null;let fail=false;
 const service=load('src/services/requestSubmission.ts',{'./requests':{allocateRequestId:()=> 'REQ-a',getRequestFromServer:async()=>exists,createRequest:async(data,id)=>{calls.push(['create',data,id]);},updateRequest:async()=>true},'./photos':{uploadPhoto:async()=>{calls.push(['upload']);if(fail)throw Error('offline');return{path:'requests/alice/REQ-a/x.jpg'};}},'./photoQueue':{forgetPhoto:async()=>{},rememberPhoto:async()=>{}}});
 const options={id:'REQ-a',ownerId:'alice',editing:false,fields:{title:'Leak'},photoChanged:true,image:{uri:'x'}};
 fail=true;await assert.rejects(service.submitRequestWithPhoto(options),/offline/);assert.equal(calls.some(call=>call[0]==='create'),false);
 fail=false;calls.length=0;await service.submitRequestWithPhoto(options);assert.deepEqual(calls.map(call=>call[0]),['upload','create']);assert.ok(calls[1][1].photo.path);
 calls.length=0;exists={ownerId:'alice'};await service.submitRequestWithPhoto(options);assert.equal(calls.length,0);
 exists=null;calls.length=0;await service.submitRequestWithPhoto({...options,image:null});assert.deepEqual(calls.map(call=>call[0]),['create']);assert.equal(calls[0][1].photo,null);
});

test('photo viewer renders signed image, opens enlargement, retries failed images and refreshes before expiry; listeners clean up',async()=>{
 const states=[];const deps=[];const cleanups=[];let cursor=0;let pending=[];let signings=0;let foreground;let stopped=0;let timer;
 const equal=(a,b)=>a&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
 const react={useState:initial=>{const index=cursor++;if(!(index in states))states[index]=initial;return[states[index],value=>states[index]=typeof value==='function'?value(states[index]):value];},useEffect:(effect,values)=>{const index=cursor++;if(!equal(deps[index],values)){deps[index]=values;pending.push(()=>{cleanups[index]?.();cleanups[index]=effect();});}}};
 const module=load('src/components/RequestPhoto.tsx',{react,'react-native':{ActivityIndicator:'ActivityIndicator',AppState:{addEventListener:(_,fn)=>{foreground=fn;return{remove:()=>stopped++};}},Image:'Image',Modal:'Modal',Pressable:'Pressable',Text:'Text',View:'View'},'@/contexts/AuthContext':{useAuth:()=>({user:{uid:'admin',role:'admin'}})},'@/services/photos':{signedPhoto:async()=>({url:'https://private-signed/'+(++signings),expires:Date.now()+120000})},'./ui/Card':{Card:'Card'},'./ui/Button':{Button:'Button'},'./ui/Screen':{ui:{}}});
 const elements=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(elements)];
 const request={photo:{path:'requests/alice/REQ-a/a.jpg'}};
 const render=()=>{cursor=0;const tree=elements(module.RequestPhoto({request}));const tasks=pending;pending=[];tasks.forEach(fn=>fn());return tree;};
 const timeout=global.setTimeout;const clear=global.clearTimeout;global.setTimeout=fn=>{timer=fn;return 1;};global.clearTimeout=()=>{};
 try{
  assert.ok(render().some(node=>node.type==='ActivityIndicator'));await new Promise(setImmediate);let tree=render();assert.equal(signings,1);assert.ok(tree.some(node=>node.type==='Image'&&node.props.source.uri==='https://private-signed/1'));
  tree.find(node=>node.type==='Pressable').props.onPress();assert.equal(render().find(node=>node.type==='Modal').props.visible,true);
  tree.find(node=>node.type==='Image').props.onError();tree=render();assert.ok(tree.some(node=>node.props?.title==='Retry Photo'));assert.equal(tree.find(node=>node.type==='Modal').props.visible,false);
  tree.find(node=>node.props?.title==='Retry Photo').props.onPress();render();await new Promise(setImmediate);tree=render();assert.equal(signings,2);
  timer();render();await new Promise(setImmediate);render();assert.equal(signings,3);foreground('active');render();await new Promise(setImmediate);render();assert.equal(signings,4);
 }finally{cleanups.forEach(fn=>fn?.());global.setTimeout=timeout;global.clearTimeout=clear;}assert.ok(stopped>=1);
});
test('orphan cleanup checks fresh server metadata, preserves attached photos and leaves failed cleanup queued',async()=>{
 const removed=[];const forgotten=[];const now=Date.now()-120000;const attachment=path=>({bucket:'request-photos',path});
 const entries=['attached','orphan','offline'].map(name=>({photo:attachment('requests/alice/REQ-'+name+'/a.jpg'),createdAt:now}));
 const module=load('src/services/photoCleanup.ts',{'firebase/firestore':{doc:(_,collection,id)=>id,getDocFromServer:async id=>{if(id==='REQ-offline')throw Error('offline');return{data:()=>id==='REQ-attached'?{photo:{path:entries[0].photo.path}}:undefined};}},'./firebase':{auth:{currentUser:{uid:'alice'}},db:{}},'./photoQueue':{queuedPhotos:async()=>entries,forgetPhoto:async photo=>forgotten.push(photo.path)},'./photos':{removePhoto:async photo=>removed.push(photo.path)}});
 await assert.rejects(module.cleanupUnusedPhotos(),/1 photo/);assert.deepEqual(removed,[entries[1].photo.path]);assert.deepEqual(forgotten,[entries[0].photo.path,entries[1].photo.path]);
});

test('Supabase client uses Firebase accessToken callback and rejects missing or foreign-project claims',async()=>{
 let options;let claims={aud:'fixquickproject',iss:'https://securetoken.google.com/fixquickproject',role:'authenticated'};
 const auth={app:{options:{projectId:'fixquickproject'}},authStateReady:async()=>{},currentUser:{uid:'firebase-string-uid',getIdTokenResult:async force=>{assert.equal(force,true);return{claims};},getIdToken:async()=> 'firebase-id-token'}};
 const module=load('src/services/supabase.ts',{'react-native-url-polyfill/auto':{},'@supabase/supabase-js':{createClient:(url,key,value)=>{options=value;assert.equal(url,'https://test.supabase.co');return{storage:{}};}},'./firebase':{auth},'../config/photoStorage':{PHOTO_UPLOADS_AVAILABLE:true,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}});
 assert.equal(await module.photoIdentity(),'firebase-string-uid');module.photoClient();assert.equal(await options.accessToken(),'firebase-id-token');assert.equal(options.auth.persistSession,false);assert.equal(options.auth.autoRefreshToken,false);
 claims={...claims,role:'admin'};await assert.rejects(module.photoIdentity(),/not been enrolled/);claims={...claims,role:'authenticated',aud:'attacker'};await assert.rejects(module.photoIdentity(),/not been enrolled/);
 auth.currentUser=null;assert.equal(await options.accessToken(),null);
});

test('deleting a Pending request queues its attached photo before deletion so a failed cleanup remains retryable',async()=>{
 const calls=[];const photo={path:'requests/alice/REQ-a/a.jpg'};
 const module=load('src/services/requests.ts',{'firebase/firestore':{doc:()=>({}),getDoc:async()=>({exists:()=>true,id:'REQ-a',data:()=>({ownerId:'alice',status:'Pending',photo,createdAt:new Date(),updatedAt:new Date()})}),deleteDoc:async()=>calls.push('delete')},'./firebase':{auth:{currentUser:{uid:'alice'}},db:{}},'./photos':{removePhoto:async()=>{calls.push('remove');throw Error('offline');}},'./photoQueue':{rememberPhoto:async()=>calls.push('queue'),forgetPhoto:async()=>calls.push('forget')}});
 await assert.rejects(module.deleteRequest('REQ-a'),/Request deleted.*cleanup/);assert.deepEqual(calls,['queue','delete','remove']);
});
