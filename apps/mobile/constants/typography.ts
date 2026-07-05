export const fonts = {
  sans: 'SpaceGrotesk',
  sansMedium: 'SpaceGrotesk-Medium',
  sansSemiBold: 'SpaceGrotesk-SemiBold',
  sansBold: 'SpaceGrotesk-Bold',
  mono: 'JetBrainsMono',
  monoBold: 'JetBrainsMono-Bold',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
} as const;

export const letterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

// Presets espelhando Typography.tsx / Badge da web
export const textPresets = {
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.8, // 0.18em
    textTransform: 'uppercase' as const,
  },
  pageTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  caption: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.54, // 0.14em
    textTransform: 'uppercase' as const,
  },
  badge: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.8, // 0.08em
    textTransform: 'uppercase' as const,
  },
} as const;
