import { NotificationSettings } from '@/components/NotificationSettings';
import { PhotoCleanup } from '@/components/PhotoCleanup';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { editProfile } from '@/services/auth';
import { errorMessage } from '@/services/errors';
import { Screen, ui } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [editing,setEditing] = useState(false);
  const [name,setName] = useState(user?.displayName ?? '');
  const [hostel,setHostel] = useState(user?.hostel ?? '');
  const [room,setRoom] = useState(user?.roomNumber ?? '');
  const [error,setError] = useState(''); const [busy,setBusy] = useState(false); const lock=useRef(false);
  async function save() {
    if(lock.current)return;lock.current=true;setBusy(true);
    try { await editProfile(name,hostel,room); setEditing(false);setError(''); }
    catch(e) {setError(errorMessage(e));}
    finally {setBusy(false);lock.current=false;}
  }
  return <Screen>
    <View style={{ alignItems:'center',paddingVertical:12,gap:12 }}>
      <View style={{width:80,height:80,borderRadius:24,borderWidth:3,backgroundColor:'#edeef0',borderColor:'#e1e2e4',alignItems:'center',justifyContent:'center'}}><Text style={[ui.title,{fontSize:32,lineHeight:40,marginBottom:0,color:'#1e40af'}]}>{user?.displayName?.charAt(0)}</Text></View>
      <Text style={ui.title}>{user?.displayName}</Text><Text style={ui.body}>Student ID: {user?.studentId}</Text>
    </View>
    <Card style={{gap:16,padding:20}}><Text style={ui.label}>EMAIL ADDRESS</Text><Text style={ui.body}>{user?.email}</Text><Text style={ui.label}>CURRENT LOCATION</Text><Text style={ui.body}>{user?.hostel}, Room {user?.roomNumber}</Text><Text style={ui.label}>{user?.role}</Text></Card>
    {editing && <Card style={{gap:16}}><Input label="Full name" value={name} onChangeText={setName} maxLength={120} /><Input label="Hostel / Block" value={hostel} onChangeText={setHostel} maxLength={120} /><Input label="Room number" value={room} onChangeText={setRoom} maxLength={120} /><Button title={busy?'Savingâ€¦':'Save Profile'} onPress={()=>void save()} disabled={busy} /><Button title="Cancel" variant="outline" onPress={()=>setEditing(false)} disabled={busy} /></Card>}
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {!editing && <Button title="Edit Profile" onPress={()=>setEditing(true)} />}
    <Button title="Logout" variant="outline" onPress={()=>void signOut().catch(e=>setError(errorMessage(e)))} />
  <PhotoCleanup /><NotificationSettings /></Screen>;
}
