import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { RegistrationTabs } from '@/components/RegistrationTabs';
import { Screen, ui } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { registerAdmin } from '@/services/auth';
import { errorMessage } from '@/services/errors';

export default function AdminRegistrationScreen() {
  const { user, loading, profileError, refreshUser } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function submit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (isOffline) throw new Error('Reconnect to create your administrator account.');
      await registerAdmin(email, password, name);
      await refreshUser();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  if (user?.role === 'admin' && !busy && !loading && !error) return <Redirect href="/admin" />;
  if (user?.role === 'pending_admin' && !busy && !loading && !error) return <Redirect href="/pending-admin" />;
  return <Screen title="Admin Registration" back>
    <RegistrationTabs selected="admin" />
    <Text style={ui.title}>Join the Administration</Text>
    <Card style={{ gap: 14, padding: 20 }}>
      <Input label="Full Name" value={name} onChangeText={setName} maxLength={120} autoCapitalize="words" editable={!busy} />
      <Input label="Email Address" value={email} onChangeText={setEmail} maxLength={320} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} />
      <View>
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} editable={!busy} onSubmitEditing={() => void submit()} style={{ paddingRight: 44 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} disabled={busy} onPress={() => setVisible(value => !value)} style={{ position: 'absolute', right: 4, top: 30, minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={visible ? 'eye-off' : 'eye'} size={20} color="#444653" />
        </Pressable>
      </View>
      <Button title={busy ? 'Creating...' : 'Create Admin Account'} disabled={busy || loading || isOffline} onPress={() => void submit()} />
    </Card>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {!!profileError && <Text accessibilityRole="alert" style={ui.error}>{profileError}</Text>}
  </Screen>;
}
