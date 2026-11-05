import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { errorMessage } from '@/services/errors';
import { logFirestoreListenerError } from '@/services/firestoreDiagnostics';
import type { User } from '@/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { decodeUserProfile } from '@/services/userProfile';
interface AuthState {
  user: User | null; firebaseUser: FirebaseUser | null; loading: boolean;
  authLoading: boolean; profileLoading: boolean; profileError: string | null;
  signOut: () => Promise<void>; refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthState | undefined>(undefined);
function decodeProfile(uid:string,data:Record<string,unknown>):User {
  return decodeUserProfile(uid,data);
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isOffline } = useNetworkStatus();
  const [user,setUser]=useState<User|null>(null);
  const [firebaseUser,setFirebaseUser]=useState<FirebaseUser|null>(null);
  const [authLoading,setAuthLoading]=useState(true);const [profileLoading,setProfileLoading]=useState(false);
  const [profileError,setProfileError]=useState<string|null>(null);const [revision,setRevision]=useState(0);
  const generation=useRef(0);
  useEffect(()=>{
    let alive=true;let stopProfile=()=>{};let observedUid:string|null|undefined;
    const stopAuth=onIdTokenChanged(auth,current=>{
      // Refreshing the Firebase token for Supabase must not unmount an active form
      // or discard its live profile listener. Explicit refresh still recreates this effect.
      const uid=current?.uid??null;
      if(observedUid===uid){setFirebaseUser(current);return;}
      observedUid=uid;
      const version=++generation.current;stopProfile();setUser(null);setProfileError(null);
      setFirebaseUser(current);setAuthLoading(false);setProfileLoading(!!current);
      if(!current)return;
      let serverAnswered=false;const cacheKey='quickfix:profile:'+current.uid;
      const fresh=()=>alive&&generation.current===version&&auth.currentUser?.uid===current.uid;
      void AsyncStorage.getItem(cacheKey).then(raw=>{
        if(!fresh()||serverAnswered)return;
        if(raw) {
          setUser(decodeProfile(current.uid,JSON.parse(raw)));
          setProfileLoading(false);
        } else if(isOffline) {
          setProfileError('No saved profile is available offline. Reconnect, then retry loading your profile.');
          setProfileLoading(false);
        }
        // An empty local cache does not establish that the server profile is missing.
      }).catch(()=>{
        if(fresh()&&!serverAnswered&&isOffline) {
          setProfileError('Your saved profile could not be read. Reconnect and retry.');
          setProfileLoading(false);
        }
      });
      stopProfile=onSnapshot(doc(db,'users',current.uid),snapshot=>{
        if(!fresh())return;
        const data=snapshot.data();
        if(snapshot.metadata.fromCache&&!data)return;
        serverAnswered=true;
        try {
          const profile=data?decodeProfile(snapshot.id,data):null;
          setUser(profile);setProfileError(null);
          if(!snapshot.metadata.fromCache) {
            if(profile)void AsyncStorage.setItem(cacheKey,JSON.stringify(profile)).catch(()=>{});
            else void AsyncStorage.removeItem(cacheKey);
          }
        }catch(error){setUser(null);setProfileError(errorMessage(error));}
        setProfileLoading(false);
      },error=>{
        if(!fresh())return;serverAnswered=true;
        logFirestoreListenerError({source:'user-profile',projectId:db.app.options.projectId,path:'users/'+current.uid},error);
        const message=error.code==='permission-denied'
          ? `Firestore denied reading users/${current.uid} in project ${db.app.options.projectId}. Publish the owner profile rules, then retry.`
          : errorMessage(error);
        setUser(null);setProfileError(message);setProfileLoading(false);
        void AsyncStorage.removeItem(cacheKey);
      });
    });
    return()=>{alive=false;stopAuth();stopProfile();};
  },[revision,isOffline]);
  const refreshUser=useCallback(async()=>{setProfileLoading(true);setProfileError(null);setRevision(value=>value+1);},[]);
  const signOut=useCallback(async()=>{
    const uid=auth.currentUser?.uid;await firebaseSignOut(auth);setUser(null);
    if(uid){const keys=await AsyncStorage.getAllKeys();await AsyncStorage.multiRemove(keys.filter(key=>key.startsWith('quickfix:requests:'+uid+':')||key==='quickfix:profile:'+uid));}
  },[]);
  return <AuthContext.Provider value={{user,firebaseUser,loading:authLoading||profileLoading,authLoading,profileLoading,profileError,signOut,refreshUser}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth must be used within AuthProvider');return value;}
