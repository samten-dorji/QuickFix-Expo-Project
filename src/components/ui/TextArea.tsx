import { TextInput, StyleSheet, Text, View, TextInputProps } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';

interface TextAreaProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, style, ...props }: TextAreaProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.light.outline}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.three,
  },
  label: {
    ...Typography.labelMD,
    color: Colors.light.onSurface,
    marginBottom: Spacing.half,
  },
  inputContainer: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.light.outlineVariant,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 100,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  input: {
    flex: 1,
    ...Typography.bodyMD,
    color: Colors.light.onSurface,
    minHeight: 100,
  },
  errorText: {
    ...Typography.bodyMD,
    color: Colors.light.error,
    marginTop: Spacing.half,
  },
});
