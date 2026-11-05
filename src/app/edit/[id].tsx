import { Text, ActivityIndicator } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { AuthGate } from '@/components/AuthGate';
import { RequestForm } from '@/components/RequestForm';
import { useRequest } from '@/hooks/useRequest';
import { useAuth } from '@/contexts/AuthContext';
import { Screen, ui } from '@/components/ui/Screen';
function Edit({id}:{id:string}){
 const {request,loading,error}=useRequest(id);const {user}=useAuth();
 if(loading)return <ActivityIndicator/>;
 if(error || !request || request.ownerId!==user?.uid)return <Screen back><Text style={ui.error}>{error||'Only your own Pending requests can be edited.'}</Text></Screen>;
 if(request.status!=='Pending')return <Redirect href={{pathname:'/requests/[id]',params:{id}}}/>;
 return <RequestForm key={id} request={request}/>;
}
export default function EditScreen(){const {id}=useLocalSearchParams<{id:string}>();return <AuthGate roles={['student']}><Edit id={id}/></AuthGate>;}
