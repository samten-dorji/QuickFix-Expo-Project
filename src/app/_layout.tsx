import { RequestsProvider } from '@/hooks/useRequests';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LaunchOverlay } from '@/components/LaunchScreen';

void SplashScreen.preventAutoHideAsync().catch(() => {});
function hideNativeSplash() {
  try { SplashScreen.hide(); } catch { /* Expo Go/web may have no native splash to hide. */ }
}

function InitialAuthReady({ onReady }: { onReady: () => void }) {
  const { loading } = useAuth();
  const reported = useRef(false);
  useEffect(() => {
    if (!loading && !reported.current) { reported.current = true; onReady(); }
  }, [loading, onReady]);
  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const [authReady, setAuthReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const finishInitialAuth = useCallback(() => setAuthReady(true), []);
  const ready = authReady || !!error || expired;
  useEffect(() => {
    if (ready) {
      const frame = requestAnimationFrame(hideNativeSplash);
      return () => cancelAnimationFrame(frame);
    }
    // A maximum wait, not a minimum delay. Never bypass the existing auth guards.
    const timer = setTimeout(() => { hideNativeSplash(); setExpired(true); }, 12000);
    return () => clearTimeout(timer);
  }, [ready]);
  return <View style={{ flex: 1, backgroundColor: '#f8f9fb' }}>
    <StatusBar style="dark" />
    {error || (!loaded && expired)
      ? <View style={{ flex: 1, justifyContent: 'center', padding: 32 }}><Text>Could not load the bundled Inter fonts. Restart the app.</Text></View>
      : loaded ? <AuthProvider><RequestsProvider>
        <InitialAuthReady onReady={finishInitialAuth} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f8f9fb' } }} />
      </RequestsProvider></AuthProvider> : null}
    <LaunchOverlay ready={ready} fontsReady={loaded} onReady={hideNativeSplash} />
  </View>;
}
