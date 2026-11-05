import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { errorMessage } from '@/services/errors';
import { logFirestoreListenerError } from '@/services/firestoreDiagnostics';

export function useHistoryPreferences() {
  const { user } = useAuth();
  const identity = user ? user.uid + ':' + user.role : '';
  const [state,setState] = useState<{identity:string;hiddenIds:string[];error:string}>({identity:'',hiddenIds:[],error:''});
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    if (!user || !['student','admin'].includes(user.role)) return;
    let active = true;
    const path = 'users/' + user.uid + '/historyPreferences';
    const stop = onSnapshot(collection(db,'users',user.uid,'historyPreferences'), {includeMetadataChanges:true}, snapshot => {
      if (!active || auth.currentUser?.uid !== user.uid || snapshot.metadata.fromCache) return;
      setState({identity,hiddenIds:snapshot.docs.filter(item=>item.data().hidden===true).map(item=>item.id),error:''});
    }, error => {
      if (!active || auth.currentUser?.uid !== user.uid) return;
      logFirestoreListenerError({source:'history-preferences',projectId:db.app.options.projectId,path},error);
      setState({identity,hiddenIds:[],error:errorMessage(error)});
    });
    return () => {active=false;stop();};
  },[identity,user,revision]);
  return {...(state.identity===identity?state:{hiddenIds:[],error:''}),loading:state.identity!==identity,retry:()=>setRevision(value=>value+1)};
}
