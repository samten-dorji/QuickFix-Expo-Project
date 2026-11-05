import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { loginUser } from '@/services/auth';
import { errorMessage } from '@/services/errors';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen, ui } from '@/components/ui/Screen';
export default function LoginScreen() {
  const { firebaseUser } = useAuth();
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const lock = useRef(false);
  async function submit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (!email.trim() || !password) throw new Error('Enter your email and password.');
      await loginUser(email,password);
    } catch (e) { setError(errorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  if (firebaseUser) return <Redirect href="/dashboard" />;
  return <Screen>
    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 20 }}>
      <Card style={{ padding: 20, gap: 20, borderRadius: 16 }}>
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center' }}><Feather name="tool" size={32} color="#a8b8ff" /></View>
          <Text style={[ui.title,{color:'#00288e'}]}>Quick Fix</Text>
          <Text style={[ui.body,{textAlign:'center'}]}>College of Science and Technology</Text>
        </View>
        <Input label="Email Address" placeholder="Enter your account email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" icon={<Feather name="user" size={20} />} />
        <Input label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" icon={<Feather name="lock" size={20} />} />
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        <Button title={busy ? 'Please wait…' : 'Login'} onPress={() => void submit()} disabled={busy} />
        <Text style={[ui.body,{textAlign:'center'}]}>Don&apos;t have an account? <Link href="/register" style={ui.link}>Register</Link></Text>
      </Card>
    </View>
  </Screen>;
}
