import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { notifyStatus } from '@/services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { decodeRequest } from '@/services/requests';
import { errorMessage } from '@/services/errors';
import { logFirestoreListenerError } from '@/services/firestoreDiagnostics';
import { useAuth } from '@/contexts/AuthContext';
import type { MaintenanceRequest } from '@/types';

function useRequestFeed() {
  const { user } = useAuth();
  const [state,setState] = useState<{ requests: MaintenanceRequest[]; loading: boolean; error: string; cached: boolean; notice: string; identity?: string }>({ requests: [], loading: true, error: '', cached: false, notice: '' });
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    if (!user || !['student','admin'].includes(user.role)) return;
    let active = true; let serverArrived = false;
    const key = `quickfix:requests:${user.uid}:${user.role}`;
    let previous: Map<string,string> | null = null;
    void AsyncStorage.getItem(key).then(raw => {
      if (!active || serverArrived) return;
      if (!raw) { setState({ requests: [], loading: false, error: "", cached: true, notice: "", identity: user.uid + ":" + user.role }); return; }
      const cached = (JSON.parse(raw) as MaintenanceRequest[]).map(item => decodeRequest(item.id,item));
      previous = new Map(cached.map(item => [item.id,item.status]));
      setState({ requests: cached, loading: false, error: '', cached: true, notice: '', identity: user.uid + ':' + user.role });
    }).catch(() => { /* A corrupt cache never substitutes for the server. */ });
    const constraints = user.role === 'student' ? [where('ownerId','==',user.uid)] : [];
    const stop = onSnapshot(query(collection(db,'requests'),...constraints,orderBy('createdAt','desc')), { includeMetadataChanges: true }, snapshot => {
      if (!active || auth.currentUser?.uid !== user.uid) return;
      serverArrived = true;
      const requests = snapshot.docs.map(item => decodeRequest(item.id,item.data()));
      const changes = previous && !snapshot.metadata.fromCache ? requests.filter(item => previous!.has(item.id) && previous!.get(item.id) !== item.status) : [];
      if (changes && changes.length) void notifyStatus(user.uid, changes.map(item => item.id + " is now " + item.status).join("; ")).catch(error => setState(old => ({ ...old, notice: "Notification delivery failed: " + errorMessage(error) })));
      previous = new Map(requests.map(item => [item.id,item.status]));
      setState(old => ({ requests, identity: user.uid + ":" + user.role, loading: false, error: '', cached: snapshot.metadata.fromCache, notice: changes && changes.length ? changes.map(item => `${item.id} is now ${item.status}`).join('\n') : old.notice }));
      if (!snapshot.metadata.fromCache) void AsyncStorage.setItem(key,JSON.stringify(requests)).catch(() => {});
    }, error => {
      if (!active || auth.currentUser?.uid !== user.uid) return;
      logFirestoreListenerError({ source: 'request-feed', projectId: db.app.options.projectId, path: 'requests', query: user.role === 'student' ? 'ownerId == currentUser; createdAt DESC' : 'createdAt DESC' }, error);
      serverArrived = true;
      const denied = error.code === 'permission-denied';
      if (denied) void AsyncStorage.removeItem(key);
      setState(old => ({ ...old, identity: user.uid + ":" + user.role, requests: denied ? [] : old.requests, loading: false, cached: !denied, error: errorMessage(error) }));
    });
    return () => { active = false; stop(); };
  }, [user?.uid,user?.role,revision,user]);
  const visible = !user || !['student','admin'].includes(user.role)
    ? { requests: [], loading: false, error: '', cached: false, notice: '' }
    : state.identity === user.uid + ":" + user.role ? state : { requests: [], loading: true, error: "", cached: false, notice: "" };
  return { ...visible, retry: () => setRevision(value => value + 1) };
}

const RequestsContext = createContext<ReturnType<typeof useRequestFeed> | null>(null);
export function RequestsProvider({children}:{children:ReactNode}) { const value=useRequestFeed(); return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>; }
export function useRequests(){const value=useContext(RequestsContext);if(!value)throw new Error("Missing RequestsProvider");return value;}
