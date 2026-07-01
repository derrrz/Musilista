import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="md" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  icon: { fontSize: 40 },
  title: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    textAlign: 'center',
  },
  description: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
