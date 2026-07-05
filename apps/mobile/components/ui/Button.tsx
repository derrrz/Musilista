import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  label: string;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  label,
  icon,
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
        <>
          {icon}
          <Text style={[styles.label, styles[`${variant}Label`], styles[`${size}Label`]]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
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
    borderColor: colors.red400,
  },

  // Sizes (h-8 / h-9 / h-11 da web)
  sm: { height: 32, paddingHorizontal: 12 },
  md: { height: 36, paddingHorizontal: 16 },
  lg: { height: 44, paddingHorizontal: 20 },

  disabled: { opacity: 0.5 },

  // Labels
  label: { fontFamily: fonts.sansMedium },
  primaryLabel: { color: colors.accentInk },
  outlineLabel: { color: colors.ink },
  ghostLabel: { color: colors.muted },
  destructiveLabel: { color: colors.red400 },
  smLabel: { fontSize: 12 },
  mdLabel: { fontSize: 14 },
  lgLabel: { fontSize: 16 },
});
