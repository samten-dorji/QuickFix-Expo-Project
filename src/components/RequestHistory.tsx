import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { historyAttribution, historyDate } from '@/utils/historyDisplay';
import { db } from '@/services/firebase';
import { errorMessage } from '@/services/errors';
import { logFirestoreListenerError } from '@/services/firestoreDiagnostics';
import { StatusBadge } from './ui/StatusBadge';
import { ui } from './ui/Screen';
interface Event { id:string; action:string; status:string; date:string; attribution:string; notes?:string; priorityBefore?:string; priorityAfter?:string }
export function RequestHistory({id}:{id:string}) {
 const {user}=useAuth();
 const [state,setState]=useState<{id:string;events:Event[];error:string}>({id:'',events:[],error:''});
 const {events,error}=state.id===id?state:{events:[],error:''};const loading=state.id!==id;
 useEffect(()=>{
  let active=true;
  let revision=0;
  const stop=onSnapshot(query(collection(db,'requests',id,'history'),orderBy('createdAt','asc')),async snapshot=>{
   if(!active)return;
   const version=++revision;
   const profiles=new Map<string,{displayName?:unknown;role?:unknown}>();
   if(user)profiles.set(user.uid,user);
   // Students never request another user's profile. Ignore untrusted name/role event fields.
   if(user?.role==='admin')await Promise.all([...new Set(snapshot.docs.map(item=>item.data().actorId))].filter((uid):uid is string=>typeof uid==='string'&&!!uid&&!uid.includes('/')&&uid!==user.uid).map(async uid=>{
    try{const profile=await getDoc(doc(db,'users',uid));if(profile.exists())profiles.set(uid,profile.data());}
    catch(failure){logFirestoreListenerError({source:'history-actor-profile',projectId:db.app.options.projectId,path:'users/'+uid,query:'document GET'},failure);}
   }));
   if(!active||version!==revision)return;
   setState({id,error:'',events:snapshot.docs.map(item=>{const value=item.data();return {id:item.id,action:value.action==='Resolved'?'Finished':value.action==='Assigned'?'Legacy update':value.action,status:value.status,attribution:historyAttribution(value.action,profiles.get(value.actorId)),notes:value.notes,priorityBefore:value.priorityBefore,priorityAfter:value.priorityAfter,date:historyDate(value.createdAt?.toDate?.())};})});
  },failure=>{if(active){
   logFirestoreListenerError({source:'request-history',projectId:db.app.options.projectId,path:'requests/'+id+'/history',query:'createdAt ASC'},failure);
   revision++;setState({id,error:errorMessage(failure),events:[]});
  }});
  return()=>{active=false;stop();};
 },[id,user]);
 return <View style={{gap:12}}><Text style={ui.heading}>Request History</Text>{loading&&<ActivityIndicator/>}{events.map(item=><View key={item.id} style={{gap:8,paddingVertical:14,borderBottomWidth:1,borderColor:'#e7e8ea'}}><Text style={[ui.body,{fontFamily:'Inter_600SemiBold',color:'#191c1e'}]}>{item.action}</Text><StatusBadge status={item.status}/><Text style={ui.caption}>{item.date}{'\n'}{item.attribution}</Text>{!!item.notes&&<Text style={ui.body}>{item.notes}</Text>}{item.priorityBefore&&item.priorityBefore!==item.priorityAfter&&<Text style={ui.body}>Priority: {item.priorityBefore} {'\u2192'} {item.priorityAfter}</Text>}</View>)}{!loading&&!events.length&&!error&&<Text style={ui.body}>No recorded events for this older request.</Text>}{!!error&&<Text accessibilityRole="alert" style={ui.error}>{error}</Text>}</View>;
}
