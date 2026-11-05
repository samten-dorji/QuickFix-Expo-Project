import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { errorMessage } from '@/services/errors';
import { logFirestoreListenerError } from '@/services/firestoreDiagnostics';
import { StatusBadge } from './ui/StatusBadge';
import { ui } from './ui/Screen';
interface Event { id:string; action:string; status:string; date:string; actorId:string; notes?:string; priorityBefore?:string; priorityAfter?:string }
export function RequestHistory({id}:{id:string}) {
 const [state,setState]=useState<{id:string;events:Event[];error:string}>({id:'',events:[],error:''});
 const {events,error}=state.id===id?state:{events:[],error:''};const loading=state.id!==id;
 useEffect(()=>{
  let active=true;
  const stop=onSnapshot(query(collection(db,'requests',id,'history'),orderBy('createdAt','asc')),snapshot=>{
   if(!active)return;
   setState({id,error:'',events:snapshot.docs.map(item=>{const value=item.data();return {id:item.id,action:value.action==='Resolved'?'Finished':value.action==='Assigned'?'Legacy update':value.action,status:value.status,actorId:value.actorId,notes:value.notes,priorityBefore:value.priorityBefore,priorityAfter:value.priorityAfter,date:value.createdAt?.toDate()?.toLocaleString()??'Saving...'};})});
  },failure=>{if(active){
   logFirestoreListenerError({source:'request-history',projectId:db.app.options.projectId,path:'requests/'+id+'/history',query:'createdAt ASC'},failure);
   setState({id,error:errorMessage(failure),events:[]});
  }});
  return()=>{active=false;stop();};
 },[id]);
 return <View style={{gap:12}}><Text style={ui.heading}>Request History</Text>{loading&&<ActivityIndicator/>}{events.map(item=><View key={item.id} style={{gap:8,paddingVertical:14,borderBottomWidth:1,borderColor:'#e7e8ea'}}><Text style={[ui.body,{fontFamily:'Inter_600SemiBold',color:'#191c1e'}]}>{item.action}</Text><StatusBadge status={item.status}/><Text style={ui.caption}>{item.date}{'\n'}Actor: {item.actorId}</Text>{!!item.notes&&<Text style={ui.body}>{item.notes}</Text>}{item.priorityBefore&&item.priorityBefore!==item.priorityAfter&&<Text style={ui.body}>Priority: {item.priorityBefore} ? {item.priorityAfter}</Text>}</View>)}{!loading&&!events.length&&!error&&<Text style={ui.body}>No recorded events for this older request.</Text>}{!!error&&<Text accessibilityRole="alert" style={ui.error}>{error}</Text>}</View>;
}
