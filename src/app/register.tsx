import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { RegistrationTabs } from '@/components/RegistrationTabs';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { completeProfile, registerUser } from '@/services/auth';
import { errorMessage } from '@/services/errors';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Screen, ui } from '@/components/ui/Screen';
export default function RegisterScreen() {
  const { firebaseUser, user, profileError, loading, refreshUser, signOut } = useAuth();
  const [name,setName] = useState(''); const [studentId,setStudentId] = useState('');
  const [email,setEmail] = useState(''); const [hostel,setHostel] = useState(''); const [room,setRoom] = useState('');
  const [password,setPassword] = useState(''); const [confirm,setConfirm] = useState('');
  const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const lock = useRef(false);
  const recovery = !!firebaseUser; const { isOffline } = useNetworkStatus();
  async function submit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (![name,studentId,hostel,room].every(value => value.trim())) throw new Error('Complete all profile fields.');
      if (!recovery && (password.length < 6 || password !== confirm)) throw new Error('Passwords must match and contain at least 6 characters.');
      if (recovery) await completeProfile(name,studentId,hostel,room);
      else await registerUser(email,password,name,studentId,hostel,room);
      await refreshUser();
    } catch(e) { setError(errorMessage(e)); }
    finally { setBusy(false); lock.current = false; }
  }
  if (user && !busy && !loading) return <Redirect href="/dashboard" />;
  return <Screen title={recovery ? 'Complete Profile' : 'Create Account'} back={!recovery}>
    <RegistrationTabs selected="student"/>
    {recovery && <Text style={ui.body}>Signed in as {firebaseUser.email}. Complete your student profile to continue. Existing roles are preserved. If you previously had a staff or administrator role, contact the administrator to restore your profile.</Text>}
    {profileError ? <><Text accessibilityRole="alert" style={ui.error}>{profileError}</Text><Button title="Retry profile access" disabled={loading || busy} onPress={() => void refreshUser()} /></> : <>
      <Input label="Full Name" placeholder="Enter your full name" value={name} onChangeText={setName} maxLength={120} />
      <Input label="Student ID" placeholder="Enter your Student ID" value={studentId} onChangeText={setStudentId} maxLength={120} />
      {!recovery && <Input label="Email Address" placeholder="student@college.edu" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />}
      <Input label="Hostel / Block" placeholder="e.g. RK Hostel" value={hostel} onChangeText={setHostel} maxLength={120} />
      <Input label="Room Number" placeholder="e.g. 204A" value={room} onChangeText={setRoom} maxLength={120} />
      {!recovery && <View style={{gap:16}}><Input label="Password" placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry /><Input label="Confirm Password" placeholder="Confirm your password" value={confirm} onChangeText={setConfirm} secureTextEntry /></View>}
      <Button title={busy ? 'Saving...' : recovery ? 'Complete Profile' : 'Register'} disabled={busy || loading || isOffline} onPress={() => void submit()} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {loading && <Text accessibilityLiveRegion="polite" style={ui.body}>Checking your existing profile...</Text>}
    {recovery ? <Button title="Sign out" disabled={busy} variant="outline" onPress={() => void signOut().catch(e => setError(errorMessage(e)))} /> : <Text style={[ui.body,{textAlign:'center'}]}>Already have an account? <Link href="/login" style={ui.link}>Login</Link></Text>}
  </Screen>;
}
