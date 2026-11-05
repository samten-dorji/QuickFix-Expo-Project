const {test}=require('node:test');const assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs');
const indexes=require('../firestore.indexes.json');

function feed(){
 let target;let onError;let cleanup;const owner='signed-in-student';
 const {RequestsProvider}=load('src/hooks/useRequests.tsx',{
  react:{createContext:()=>({Provider:'Provider'}),useState:value=>[value,()=>{}],useEffect:effect=>{cleanup=effect();}},
  '@react-native-async-storage/async-storage':{getItem:()=>new Promise(()=>{}),removeItem:async()=>{}},
  'firebase/firestore':{
   collection:(_,path)=>({path}),where:(field,operator,value)=>({field,operator,value}),orderBy:(field,direction)=>({field,direction}),query:(collection,...constraints)=>({collection,constraints}),
   onSnapshot:(query,_,next,error)=>{target=query;onError=error;return()=>{};},
  },
  '@/services/firebase':{db:{app:{options:{projectId:'fixquickproject'}}},auth:{currentUser:{uid:owner}}},
  '@/contexts/AuthContext':{useAuth:()=>({user:{uid:owner,role:'student'}})},
  '@/services/notifications':{},'@/services/requests':{},
 });
 RequestsProvider({children:null});
 return {target,onError,stop:()=>cleanup()};
}
test('the executed student dashboard query has the exact declared composite index; existing definitions stay present',()=>{
 const listener=feed();
 try{
  assert.equal(listener.target.collection.path,'requests');
  assert.deepEqual(listener.target.constraints,[{field:'ownerId',operator:'==',value:'signed-in-student'},{field:'createdAt',direction:'desc'}]);
  assert.ok(indexes.indexes.some(index=>index.collectionGroup==='requests'&&index.queryScope==='COLLECTION'&&JSON.stringify(index.fields)===JSON.stringify([{fieldPath:'ownerId',order:'ASCENDING'},{fieldPath:'createdAt',order:'DESCENDING'}])));
  assert.ok(indexes.indexes.some(index=>index.collectionGroup==='requests'&&index.queryScope==='COLLECTION'&&JSON.stringify(index.fields)===JSON.stringify([{fieldPath:'status',order:'ASCENDING'},{fieldPath:'createdAt',order:'DESCENDING'}])));
  assert.deepEqual(indexes.fieldOverrides,[]);
 }finally{listener.stop();}
});
test('development feed logs retain original missing-index, permission and network errors including index link',()=>{
 const previous=global.__DEV__;const originalWarn=console.warn;const logged=[];
 global.__DEV__=true;console.warn=(...args)=>logged.push(args);const listener=feed();
 try{
  for(const [code,message]of [['failed-precondition','The query requires an index. https://console.firebase.google.com/v1/r/project/fixquickproject/firestore/indexes?create_composite=original-link'],['permission-denied','Missing or insufficient permissions.'],['unavailable','The operation could not be completed due to a network error.']]){
   const error=Object.assign(new Error(message),{code});listener.onError(error);
   const record=logged.at(-1);assert.equal(record[1].code,code);assert.equal(record[1].message,message);assert.equal(record[1].projectId,'fixquickproject');assert.equal(record[1].source,'request-feed');assert.equal(record[2],error);
  }
  assert.equal(logged.length,3);
  global.__DEV__=false;listener.onError(Object.assign(new Error('Production error'),{code:'unavailable'}));assert.equal(logged.length,3);
 }finally{listener.stop();console.warn=originalWarn;if(previous===undefined)delete global.__DEV__;else global.__DEV__=previous;}
});
