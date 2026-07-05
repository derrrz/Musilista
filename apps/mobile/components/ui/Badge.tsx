import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { textPresets } from '@/constants/typography';

type Variant = 'neutral' | 'accent' | 'outline';
type Role = 'DONO' | 'ADMIN' | 'MEMBRO';
type EventType = 'SHOW' | 'ENSAIO' | 'OUTRO';

interface BadgeProps {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
}

const VARIANTS: Record<Variant, { border: string; bg: string; text: string }> = {
  neutral: { border: colors.line, bg: colors.raised, text: colors.muted },
  accent: { border: colors.accent, bg: colors.accent, text: colors.accentInk },
  outline: { border: colors.accent, bg: 'transparent', text: colors.accent },
};

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const cfg = VARIANTS[variant];
  return (
    <View style={[styles.badge, { borderColor: cfg.border, backgroundColor: cfg.bg }, style]}>
      <Text style={[styles.label, { color: cfg.text }]}>{label}</Text>
    </View>
  );
}

const ROLE_CFG: Record<Role, { bg: string; text: string; label: string }> = {
  DONO: { bg: colors.accentTint15, text: colors.accent, label: 'Dono' },
  ADMIN: { bg: colors.blueTint15, text: colors.blue400, label: 'Admin' },
  MEMBRO: { bg: colors.mutedTint15, text: colors.muted, label: 'Membro' },
};

export function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CFG[role];
  return (
    <View style={[styles.badge, styles.noBorder, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const EVENT_CFG: Record<EventType, { border: string; bg: string; text: string; label: string }> = {
  SHOW: { border: colors.amberBorder40, bg: colors.amberTint10, text: colors.amber400, label: 'Show' },
  ENSAIO: { border: colors.blueBorder40, bg: colors.blueTint15, text: colors.blue400, label: 'Ensaio' },
  OUTRO: { border: colors.line, bg: colors.surface, text: colors.muted, label: 'Outro' },
};

export function EventTypeBadge({ type }: { type: EventType }) {
  const cfg = EVENT_CFG[type];
  return (
    <View style={[styles.badge, { borderColor: cfg.border, backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  noBorder: { borderWidth: 0, paddingVertical: 3 },
  label: textPresets.badge,
});
