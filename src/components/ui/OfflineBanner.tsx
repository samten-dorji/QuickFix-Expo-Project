import { View, StyleSheet, Text } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>â˜ï¸</Text>
      <Text style={styles.text}>
        Your data is saved locally and will synchronize when Internet connectivity is restored.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.surfaceContainer,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.outlineVariant,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    ...Typography.bodyMD,
    color: Colors.light.onSurfaceVariant,
    flex: 1,
  },
});
