import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, Modal, Pressable, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { signedPhoto } from '@/services/photos';
import { errorMessage } from '@/services/errors';
import type { MaintenanceRequest } from '@/types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ui } from './ui/Screen';
export function RequestPhoto({ request }: { request: MaintenanceRequest }) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const [image, setImage] = useState<{ uri: string; key: string } | null>(null);
  const [error, setError] = useState('');
  const [enlarged, setEnlarged] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const key = `${user?.uid}:${request.photo?.path ?? request.photoUrl ?? request.photoPath}`;
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void Promise.resolve().then(()=>{if(active){setError('');setImageFailed(false);setImage(null);setEnlarged(false);}});
    if (request.photo) void signedPhoto(request.photo, revision > 0).then(value => {
      if (!active) return;
      setImage({ uri: value.url, key });
      timer = setTimeout(() => setRevision(value => value + 1), Math.max(1000, value.expires - Date.now() - 15000));
    }).catch(e => { if (active) setError(errorMessage(e)); });
    else if (request.photoUrl || request.photoPath) void Promise.resolve().then(()=>{if(active)setError('This legacy photo is unavailable. New photos use private Supabase storage; existing Firebase evidence has not been migrated.');});
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setRevision(value => value + 1); });
    return () => { active = false; clearTimeout(timer); subscription.remove(); };
  }, [key, request.photo, request.photoPath, request.photoUrl, revision]);
  if (!request.photo && !request.photoUrl && !request.photoPath) return null;
  const uri = image?.key === key ? image.uri : null;
  return <Card style={{gap:12}}><Text style={ui.label}>Attached Evidence</Text>
    {uri && !imageFailed ? <Pressable accessibilityRole="button" accessibilityLabel="Enlarge maintenance photo" onPress={()=>setEnlarged(true)}><Image source={{uri}} accessibilityLabel="Maintenance evidence" style={{width:'100%',height:220,borderRadius:8}} onError={()=>{setImageFailed(true);setError('Photo could not be loaded. Retry to refresh access.');}}/><Text style={ui.body}>Tap to enlarge</Text></Pressable> : !error ? <ActivityIndicator accessibilityLabel="Loading photo"/> : null}
    {!!error && <><Text accessibilityRole="alert" style={ui.error}>{error}</Text><Button title="Retry Photo" onPress={()=>setRevision(value=>value+1)}/></>}
    <Modal visible={enlarged && !!uri && !imageFailed} animationType="fade" onRequestClose={()=>setEnlarged(false)}><View style={{flex:1,backgroundColor:'#111827',padding:24,paddingTop:60,gap:16}}><Button title="Close photo" onPress={()=>setEnlarged(false)}/>{uri && <Image source={{uri}} resizeMode="contain" style={{flex:1}} accessibilityLabel="Enlarged maintenance evidence" onError={()=>{setEnlarged(false);setImageFailed(true);setError('Photo unavailable. Retry to refresh access.');}}/>}</View></Modal>
  </Card>;
}
