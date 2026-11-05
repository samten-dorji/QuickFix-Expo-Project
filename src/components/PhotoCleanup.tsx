import { useState } from 'react';
import { Text } from 'react-native';
import { cleanupUnusedPhotos } from '@/services/photoCleanup';
import { errorMessage } from '@/services/errors';
import { Button } from './ui/Button';
import { ui } from './ui/Screen';
export function PhotoCleanup(){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function cleanup(){if(busy)return;setBusy(true);try{await cleanupUnusedPhotos();setMessage('Unused photo cleanup completed. Attached evidence was preserved.');}catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}}
 return <><Button title={busy?'Cleaning...':'Clean Up Unused Photos'} variant="outline" disabled={busy} onPress={()=>void cleanup()}/>{!!message&&<Text accessibilityRole="alert" style={ui.body}>{message}</Text>}</>;
}
