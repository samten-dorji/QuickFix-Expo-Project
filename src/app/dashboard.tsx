import { Redirect } from 'expo-router';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/contexts/AuthContext';
export default function DashboardRedirect() {
  const { user } = useAuth();
  return <AuthGate>{user && <Redirect href={user.role === 'admin' ? '/admin' : '/(student)/home'} />}</AuthGate>;
}
