import { useState } from 'react';
import { Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { errorMessage } from '@/services/errors';
import { Screen, ui } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function PendingAdminScreen() {
  const { user, firebaseUser, loading, profileError, refreshUser, signOut } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [error, setError] = useState('');
  if (!firebaseUser && !loading) return <Redirect href="/login" />;
  if (user && user.role !== 'pending_admin' && !loading) return <Redirect href="/dashboard" />;
  if (!user && firebaseUser && !loading && !profileError) return <Redirect href="/register-admin" />;
  async function run(action: () => Promise<void>) {
    setError('');
    try { await action(); } catch (failure) { setError(errorMessage(failure)); }
  }
  return <Screen title="Administrator Approval">
    <Card style={{ gap: 16, padding: 20 }}>
      {user?.role === 'pending_admin' && <>
        <Text accessibilityLiveRegion="polite" style={ui.heading}>Account created. Awaiting administrator approval.</Text>
        <Text style={ui.body}>Approval is manual. The project owner must approve your account before you can access the Admin Dashboard.</Text>
        <Text style={ui.body}>{user.email}</Text>
      </>}
      {loading && <Text style={ui.body}>Checking your account...</Text>}
      <Button title="Refresh Approval Status" disabled={loading || isOffline} onPress={() => void run(refreshUser)} />
      <Button title="Sign Out" variant="outline" onPress={() => void run(signOut)} />
      {!!profileError && <Text accessibilityRole="alert" style={ui.error}>{profileError}</Text>}
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    </Card>
  </Screen>;
}
