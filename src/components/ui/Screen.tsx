import type { ReactNode } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
export const ui = StyleSheet.create({
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, color: '#444653' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 32, color: '#191c1e', letterSpacing: -.4, marginBottom: 4, flexShrink: 1 },
  heading: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 26, color: '#191c1e', letterSpacing: -.2, flexShrink: 1 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18, color: '#444653', letterSpacing: .3 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stack: { gap: 16 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: '#444653', flexShrink: 1 },
  empty: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, color: '#444653', textAlign: 'center', padding: 24, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7e8ea' },
  error: { fontFamily: 'Inter_400Regular', color: '#93000a', fontSize: 14, lineHeight: 22, padding: 12, borderRadius: 12, backgroundColor: '#ffdad6', borderWidth: 1, borderColor: '#ffb4ab', flexShrink: 1 },
  link: { fontFamily: 'Inter_600SemiBold', color: '#00288e', fontSize: 14, lineHeight: 20, paddingVertical: 10 },
});
export function Screen({ children, title = 'Quick Fix', back = false, refresh, refreshing = false }: { children: ReactNode; title?: string; back?: boolean; refresh?: () => void; refreshing?: boolean }) {
  const insets = useSafeAreaInsets();
  const { isOffline, isOnline } = useNetworkStatus();
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f8f9fb', paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={{ borderBottomWidth: 1, borderColor: '#e7e8ea', backgroundColor: '#ffffff', paddingLeft: Math.max(insets.left,16), paddingRight: Math.max(insets.right,16), minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Pressable accessibilityLabel={back ? 'Go back' : 'Dashboard'} accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => back && router.canGoBack() ? router.back() : router.replace('/dashboard')}><Feather name={back ? 'arrow-left' : 'tool'} size={22} color="#00288e" /></Pressable>
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 26, color: '#00288e', flex: 1, flexShrink: 1 }}>{title}</Text>
      <Feather accessibilityLabel={isOffline ? 'Offline' : isOnline ? 'Connected' : 'Connection unknown'} name={isOffline ? 'wifi-off' : 'wifi'} size={22} color="#00288e" />
    </View>
    {isOffline && <Text accessibilityRole="alert" style={{ ...ui.body, backgroundColor: '#fff7ed', paddingVertical: 10, paddingHorizontal: 20 }}>Offline · showing saved data. Reconnect before making changes.</Text>}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 16, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center', flexGrow: 1 }} refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} /> : undefined}>{children}</ScrollView>
  </KeyboardAvoidingView>;
}
