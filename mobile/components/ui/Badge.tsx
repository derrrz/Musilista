import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';

type Role = 'DONO' | 'ADMIN' | 'MEMBRO';
type EventType = 'SHOW' | 'ENSAIO' | 'OUTRO';

interface RoleBadgeProps {
  role: Role;
}

interface EventBadgeProps {
  type: EventType;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const cfg = {
    DONO: { bg: colors.badgeDono, text: colors.badgeDonoText, label: 'DONO' },
    ADMIN: { bg: colors.badgeAdmin, text: colors.badgeAdminText, label: 'ADMIN' },
    MEMBRO: { bg: colors.badgeMembro, text: colors.badgeMembroText, label: 'MEMBRO' },
  }[role];

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

export function EventTypeBadge({ type }: EventBadgeProps) {
  const cfg = {
    SHOW: { bg: colors.badgeShow, text: colors.badgeShowText, label: 'SHOW' },
    ENSAIO: { bg: colors.badgeEnsaio, text: colors.badgeEnsaioText, label: 'ENSAIO' },
    OUTRO: { bg: colors.raised, text: colors.muted, label: 'OUTRO' },
  }[type];

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as '700',
    letterSpacing: 0.5,
  },
});
