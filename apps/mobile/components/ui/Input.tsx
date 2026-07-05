import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fontSize, textPresets } from '@/constants/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  textarea?: boolean;
}

export function Input({ label, error, textarea, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          textarea && styles.textarea,
          focused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.faint}
        selectionColor={colors.accent}
        multiline={textarea}
        textAlignVertical={textarea ? 'top' : 'center'}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...textPresets.eyebrow, color: colors.muted },
  input: {
    height: 36,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 0,
    color: colors.ink,
    fontSize: fontSize.sm,
  },
  textarea: {
    height: undefined,
    minHeight: 80,
    paddingVertical: 10,
  },
  inputFocused: { borderColor: colors.accent },
  inputError: { borderColor: colors.red500 },
  error: {
    color: colors.red400,
    fontSize: fontSize.xs,
  },
});
