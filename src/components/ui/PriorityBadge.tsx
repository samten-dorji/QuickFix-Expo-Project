import { View, Text, StyleSheet } from 'react-native';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { priorityBadge } from '@/constants/badges';
import type { RequestPriority } from '@/types';

interface PriorityBadgeProps {
  priority?: RequestPriority | null;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { label, colors } = priorityBadge(priority);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>
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
    alignSelf: 'flex-start',
    flexShrink: 0,
    maxWidth: '100%',
  },
  text: {
    ...Typography.labelMD,
    textTransform: 'none',
    letterSpacing: 0,
    lineHeight: 18,
    textAlign: 'center',
  },
});
