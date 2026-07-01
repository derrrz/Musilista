import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';
import { colors } from '@/constants/colors';
import { fontWeight, fontSize } from '@/constants/typography';

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  label: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  label,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.accentInk : colors.ink}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`], styles[`${size}Label`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },

  // Variants
  primary: { backgroundColor: colors.accent },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghost: { backgroundColor: 'transparent' },
  destructive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },

  // Sizes
  sm: { paddingVertical: 7, paddingHorizontal: 14 },
  md: { paddingVertical: 12, paddingHorizontal: 20 },
  lg: { paddingVertical: 15, paddingHorizontal: 24 },

  disabled: { opacity: 0.5 },

  // Labels
  label: { fontWeight: fontWeight.bold as '700' },
  primaryLabel: { color: colors.accentInk },
  outlineLabel: { color: colors.ink },
  ghostLabel: { color: colors.ink },
  destructiveLabel: { color: colors.error },
  smLabel: { fontSize: fontSize.sm },
  mdLabel: { fontSize: fontSize.base },
  lgLabel: { fontSize: fontSize.lg },
});
