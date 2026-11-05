import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { decodeRequest } from '@/services/requests';
import { errorMessage } from '@/services/errors';
import { logFirestoreListenerError } from '@/services/firestoreDiagnostics';
import type { MaintenanceRequest } from '@/types';
export function useRequest(id: string) {
  const { user } = useAuth();
  const identity = user ? user.uid+':'+user.role : '';
  const allowed = !!user && ['student','admin'].includes(user.role);
  const [state,setState]=useState<{id:string;identity:string;request:MaintenanceRequest|null;loading:boolean;error:string}>({id:'',identity:'',request:null,loading:true,error:''});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!user || !['student','admin'].includes(user.role))return;
    let active=true;
    const fresh=()=>active&&auth.currentUser?.uid===user.uid;
    const stop=onSnapshot(doc(db,'requests',id),snapshot=>{
      if(!fresh())return;
      try {setState({id,identity,request:snapshot.exists()?decodeRequest(snapshot.id,snapshot.data()):null,loading:false,error:''});}
      catch(error){setState({id,identity,request:null,loading:false,error:errorMessage(error)});}
    },error=>{if(fresh()){
      logFirestoreListenerError({source:'request-details',projectId:db.app.options.projectId,path:'requests/'+id},error);
      setState({id,identity,request:null,loading:false,error:errorMessage(error)});
    }});
    return()=>{active=false;stop();};
  },[id,revision,identity,user]);
  const visible=allowed&&state.id===id&&state.identity===identity?state:{request:null,loading:allowed,error:''};
  return {...visible,retry:()=>setRevision(value=>value+1)};
}
