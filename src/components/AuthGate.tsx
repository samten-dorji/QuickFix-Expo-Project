import type { ReactNode } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/Button';
import type { UserRole } from '@/types';
export function AuthGate({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, firebaseUser, loading, profileError, refreshUser, signOut } = useAuth();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}><ActivityIndicator accessibilityLabel="Loading your account" /></View>;
  if (!firebaseUser) return <Redirect href="/login" />;
  if (profileError) return <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: 24 }}><Text accessibilityRole="alert">{profileError}</Text><Button title="Retry profile" onPress={() => void refreshUser()} /><Button title="Sign out" onPress={() => void signOut()} /></View>;
  if (!user) return <Redirect href="/register" />;
  if (user.role === 'pending_admin') return <Redirect href="/pending-admin" />;
  if (user.role === 'staff') return <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: 24 }}><Text>This legacy account has no active application access. Contact the project owner for review. Your account has not been promoted or deleted.</Text><Button title="Sign out" onPress={() => void signOut()} /></View>;
  if (roles && !roles.includes(user.role)) return <Redirect href="/dashboard" />;
  return children;
}
