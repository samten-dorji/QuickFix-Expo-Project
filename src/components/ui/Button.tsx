import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const buttonStyle = [
    styles.button,
    styles[variant],
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text`],
    disabled && styles.disabledText,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        buttonStyle,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={textStyle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.lg,
    gap: Spacing.one,
  },
  primary: {
    backgroundColor: Colors.light.primary,
  },
  primaryText: {
    color: Colors.light.onPrimary,
  },
  secondary: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  secondaryText: {
    color: Colors.light.primary,
  },
  danger: {
    backgroundColor: Colors.light.error,
  },
  dangerText: {
    color: Colors.light.onError,
  },
  outline: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.light.outlineVariant,
  },
  outlineText: {
    color: Colors.light.onSurface,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.82,
  },
  text: {
    ...Typography.bodyLG,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
    flexShrink: 1,
    fontSize: 16,
  },
  iconContainer: {
    flexShrink: 0,
  },
});
