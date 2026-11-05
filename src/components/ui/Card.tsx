import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
}

export function Card({ children, style, onPress, disabled = false }: CardProps) {
  const cardStyle = [
    styles.card,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.surfaceContainerHigh,
    padding: Spacing.three,
    ...Shadows.small,
  },
  pressed: {
    backgroundColor: Colors.light.surfaceContainerLow,
  },
  disabled: {
    opacity: 0.5,
  },
});
