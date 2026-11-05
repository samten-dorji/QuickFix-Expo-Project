import { View, Text, StyleSheet } from 'react-native';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { statusBadge } from '@/constants/badges';

interface StatusBadgeProps {
  status?: string | null;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const { label, colors } = statusBadge(status);

  return (
    <View
      style={[
        styles.badge,
        styles[size],
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.text,
          styles[`${size}Text`],
          { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  small: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  text: {
    ...Typography.labelMD,
    textTransform: 'none',
    letterSpacing: 0,
    lineHeight: 18,
    textAlign: 'center',
  },
  smallText: {
    fontSize: 11,
  },
  mediumText: {
    fontSize: 12,
  },
});
