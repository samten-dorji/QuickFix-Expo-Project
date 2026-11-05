import { Tabs } from 'expo-router';
import { TabIcon } from '@/components/ui/TabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthGate } from '@/components/AuthGate';
export default function StudentLayout() {
  const insets = useSafeAreaInsets();
  return <AuthGate roles={['student']}><Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1e40af', tabBarActiveBackgroundColor: 'transparent', tabBarItemStyle: { marginHorizontal: 4, minHeight: 62 }, tabBarIconStyle: { width: 60, height: 34 }, tabBarInactiveTintColor: '#444653', tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16, marginTop: 2 }, tabBarStyle: { backgroundColor: '#ffffff', paddingHorizontal: 8, height: 68 + Math.max(8,insets.bottom), paddingTop: 6, paddingBottom: Math.max(8,insets.bottom), borderTopColor: '#e7e8ea', elevation: 0, shadowOpacity: 0 } }}>
    <Tabs.Screen name="home" options={{title:'Home',tabBarIcon:({focused})=><TabIcon name="home" active={focused} />}} />
    <Tabs.Screen name="requests" options={{title:'Requests',tabBarIcon:({focused})=><TabIcon name="list" active={focused} />}} />
    <Tabs.Screen name="history" options={{title:'History',tabBarIcon:({focused})=><TabIcon name="clock" active={focused} />}} />
    <Tabs.Screen name="profile" options={{title:'Profile',tabBarIcon:({focused})=><TabIcon name="user" active={focused} />}} />
  </Tabs></AuthGate>;
}
