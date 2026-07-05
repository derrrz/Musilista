import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors } from '@/constants/colors';

// Card padrão da web: rounded-xl border-line bg-surface p-5
export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

// Variante raised (cards de grupo/dropdowns da web usam bg-raised)
export function RaisedCard({ style, ...props }: ViewProps) {
  return <View style={[styles.card, styles.raised, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 20,
  },
  raised: { backgroundColor: colors.raised },
});
