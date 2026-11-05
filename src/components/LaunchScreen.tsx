import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, Text, View } from 'react-native';

interface LaunchScreenProps { fontsReady: boolean; onReady?: () => void }

export function LaunchScreen({ fontsReady, onReady }: LaunchScreenProps) {
  const surface = useRef({ layout: false, image: false, reported: false });
  function reportReady() {
    if (surface.current.layout && surface.current.image && !surface.current.reported) {
      surface.current.reported = true;
      onReady?.();
    }
  }
  return <View style={styles.screen} onLayout={() => { surface.current.layout = true; reportReady(); }}>
    <View style={styles.mark}>
      <Image source={require('../../assets/images/quickfix-splash.png')} accessible={false} fadeDuration={0} resizeMode="contain" style={styles.image} onLoadEnd={() => { surface.current.image = true; reportReady(); }} />
      <View style={styles.words}>
        <Text accessibilityRole="header" style={[styles.title, fontsReady && styles.titleFont]}>QuickFix</Text>
        <Text style={[styles.tagline, fontsReady && styles.bodyFont]}>Hostel maintenance, simplified.</Text>
      </View>
    </View>
  </View>;
}

// Root-only overlay: readiness is latched by the root and never resets on tab changes.
export function LaunchOverlay({ ready, fontsReady, onReady }: LaunchScreenProps & { ready: boolean }) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [gone, setGone] = useState(false);
  // Fail safe: do not animate before the accessibility preference is known.
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    if (gone) return;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, [gone]);
  useEffect(() => {
    if (!ready || gone) return;
    if (reduceMotion) {
      const frame = requestAnimationFrame(() => setGone(true));
      return () => cancelAnimationFrame(frame);
    }
    const animation = Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) setGone(true); });
    return () => animation.stop();
  }, [ready, reduceMotion, opacity, gone]);
  if (gone) return null;
  return <Animated.View accessibilityViewIsModal style={[styles.overlay, { opacity }]}>
    <LaunchScreen fontsReady={fontsReady} onReady={onReady} />
  </Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fb', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  mark: { width: '100%', height: 128, alignItems: 'center' },
  image: { width: 128, height: 128 },
  words: { position: 'absolute', top: 136, left: 0, right: 0, alignItems: 'center', gap: 6 },
  title: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -.8, color: '#1e40af', textAlign: 'center' },
  titleFont: { fontFamily: 'Inter_700Bold' },
  tagline: { fontSize: 14, lineHeight: 22, color: '#444653', textAlign: 'center' },
  bodyFont: { fontFamily: 'Inter_400Regular' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, backgroundColor: '#f8f9fb' },
});
