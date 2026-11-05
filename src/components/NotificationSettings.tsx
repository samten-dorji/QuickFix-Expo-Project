import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { enableStatusNotifications } from '@/services/notifications';
import { errorMessage } from '@/services/errors';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ui } from './ui/Screen';
export function NotificationSettings(){
 const {user}=useAuth();const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function change(enable:boolean){if(busy||!user)return;setBusy(true);try{if(enable)await enableStatusNotifications(user.uid);else await AsyncStorage.removeItem('quickfix:notifications:'+user.uid);setMessage(enable?'Local status notifications enabled.':'Local notifications disabled.');}catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}}
 return <Card style={{gap:12}}><Text style={ui.heading}>Status Notifications</Text><Text style={ui.body}>Receive local alerts when the open app detects a status change.</Text><Button title="Enable Local Alerts" variant="outline" disabled={busy} onPress={()=>void change(true)}/><Button title="Disable Local Alerts" variant="outline" disabled={busy} onPress={()=>void change(false)}/>{!!message&&<Text accessibilityRole="alert" style={ui.body}>{message}</Text>}</Card>;
}
