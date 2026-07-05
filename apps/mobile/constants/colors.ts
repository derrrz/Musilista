export const colors = {
  // Backgrounds
  bg: '#0f1214',
  surface: '#161a1d',
  raised: '#1c2024',

  // Text
  ink: '#e5e7ea',
  muted: '#8b9296',
  faint: '#4a5054',

  // Borders
  line: '#23282c',

  // Brand
  accent: '#a1e645',
  accentInk: '#0f1214',

  // Cifra section colors (oklch do web convertido para sRGB)
  verse: '#48b7bd',
  chorus: '#a390dc',
  bridge: '#e1ac6e',
  solo: '#eb827b',

  // Status palette (Tailwind values usados pela web)
  blue400: '#60a5fa',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  emerald500: '#10b981',
  red400: '#f87171',
  red500: '#ef4444',
  error: '#ef4444',
  success: '#22c55e',

  // Tints (equivalente RN do color-mix da web)
  accentTint15: 'rgba(161,230,69,0.15)',
  mutedTint15: 'rgba(139,146,150,0.15)',
  blueTint15: 'rgba(96,165,250,0.15)',
  amberTint10: 'rgba(251,191,36,0.10)',
  amberBorder40: 'rgba(251,191,36,0.40)',
  blueBorder40: 'rgba(96,165,250,0.40)',
  surface60: 'rgba(22,26,29,0.6)',

  // Chord viewer
  chord: '#a1e645',
} as const;
