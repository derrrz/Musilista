import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

interface ChipProps {
  label: string;
  onPress?: () => void;
  active?: boolean;
  /** rounded-full com fonte mono (chips de meta da cifra, código, tom) */
  pill?: boolean;
  mono?: boolean;
  /** dot colorido à esquerda (disponibilidade) */
  dotColor?: string;
  /** cores custom quando ativo (ex.: disponibilidade por estado) */
  activeColors?: { border: string; bg: string; text: string };
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Chip({
  label,
  onPress,
  active = false,
  pill = false,
  mono = false,
  dotColor,
  activeColors,
  icon,
  style,
}: ChipProps) {
  const activeCfg = activeColors ?? {
    border: colors.accent,
    bg: colors.accentTint15,
    text: colors.accent,
  };

  const body = (
    <>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      {icon}
      <Text
        style={[
          styles.label,
          mono && styles.mono,
          { color: active ? activeCfg.text : colors.muted },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </>
  );

  const chipStyle = [
    styles.chip,
    pill && styles.pill,
    active
      ? { borderColor: activeCfg.border, backgroundColor: activeCfg.bg }
      : { borderColor: colors.line, backgroundColor: colors.surface },
    style,
  ];

  if (!onPress) return <View style={chipStyle}>{body}</View>;

  return (
    <TouchableOpacity style={chipStyle} onPress={onPress} activeOpacity={0.7}>
      {body}
    </TouchableOpacity>
  );
}

/** Chip de letra do índice A–Z (mono xs, minWidth 32) */
export function LetterChip({
  letter,
  active,
  onPress,
}: {
  letter: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.letter,
        active
          ? { borderColor: colors.accent, backgroundColor: colors.accentTint15 }
          : { borderColor: colors.line, backgroundColor: colors.surface },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.letterText, { color: active ? colors.accent : colors.muted }]}>
        {letter}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  pill: { borderRadius: 999 },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
  },
  mono: { fontFamily: fonts.mono, fontSize: fontSize.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  letter: {
    minWidth: 32,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  letterText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xs,
  },
});
