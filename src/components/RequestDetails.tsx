import { RequestHistory } from './RequestHistory';
import { AdminRequestActions } from './AdminRequestActions';
import { useRef, useState } from 'react';
import { Text, View, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/contexts/AuthContext';
import { useRequest } from '@/hooks/useRequest';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { deleteRequest } from '@/services/requests';
import { RequestPhoto } from './RequestPhoto';
import { errorMessage } from '@/services/errors';
import { Screen, ui } from './ui/Screen';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { PriorityBadge } from './ui/PriorityBadge';
export function RequestDetails({id}:{id:string}) {
  const { user } = useAuth();const data=useRequest(id);const { isOffline }=useNetworkStatus();
  const request=data.request;
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const lock=useRef(false);
  async function remove(){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try {if(isOffline)throw new Error('Reconnect before deleting.');await deleteRequest(id);router.replace('/dashboard');}
    catch(e){setError(errorMessage(e));}finally{lock.current=false;setBusy(false);}
  }
  const canEdit=request?.ownerId===user?.uid && user?.role==='student' && request?.status==='Pending';
  return <Screen back refresh={data.retry} refreshing={data.loading}>
    {data.loading && <ActivityIndicator />}
    {!!data.error && <><Text style={ui.error}>{data.error}</Text><Button title="Retry" onPress={data.retry}/></>}
    {!data.loading && !data.error && !request && <Text style={ui.body}>Request not found.</Text>}
    {request && <>
      <View style={[ui.row,{flexWrap:'wrap'}]}><View style={{flex:1,flexBasis:'100%',minWidth:0,gap:4}}><Text style={[ui.title,{fontFamily:'Inter_600SemiBold',fontSize:14,lineHeight:22,letterSpacing:0}]}>{request.id}</Text><Text style={ui.caption}>Submitted on {request.createdAt.toLocaleDateString()}</Text></View><StatusBadge status={request.status}/></View>
      {request.status==='Unknown status'&&<Text style={ui.error}>Unrecognized saved status: {request.rawStatus ?? '(missing)'}. Contact the project owner for review.</Text>}
      <Card style={{padding:20,gap:16}}><Text style={[ui.label,{color:'#00288e',textTransform:'uppercase'}]}>{request.category}</Text><Text style={ui.heading}>{request.title}</Text><Text style={ui.body}>{request.description}</Text><View style={{borderTopWidth:1,borderColor:'#e7e8ea',paddingTop:16,gap:8}}><Text style={ui.label}>LOCATION</Text><Text style={ui.body}>{request.hostel}, Room {request.roomNumber}</Text><PriorityBadge priority={request.priority}/></View></Card>
      <RequestPhoto request={request}/>
      {request.completionNotes && <Card style={{padding:20,gap:12}}><Text style={ui.heading}>Completion Notes</Text><Text style={ui.body}>{request.completionNotes}</Text>{request.finishedAt&&<Text style={ui.body}>Finished {request.finishedAt.toLocaleString()}</Text>}</Card>}
      {request.rejectionReason && <Card style={{padding:20,gap:12}}><Text style={ui.heading}>Rejection Reason</Text><Text style={ui.body}>{request.rejectionReason}</Text>{request.rejectedAt&&<Text style={ui.body}>Rejected {request.rejectedAt.toLocaleString()}</Text>}</Card>}
      {user?.role==='admin' && <AdminRequestActions key={request.id+request.priority+request.status} request={request}/>}
      <RequestHistory id={id}/>
      <Text style={ui.caption}>Last updated {request.updatedAt.toLocaleString()}</Text>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {canEdit && <><Button title="Edit Request" variant="outline" icon={<Feather name="edit-2" size={18} color="#00288e"/>} disabled={busy||isOffline} onPress={()=>router.push({pathname:'/edit/[id]',params:{id}})}/><Button title="Delete Request" variant="danger" disabled={busy||isOffline} onPress={()=>Alert.alert('Delete Request','Permanently delete this pending request?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void remove()}])}/></>}
    </>}
  </Screen>;
}
