import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

interface StepperProps {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  decLabel?: string;
  incLabel?: string;
}

// Port do Stepper do SongViewer da web: label uppercase faint,
// botões 32×32 quadrados, valor mono central.
export function Stepper({
  label,
  value,
  onDec,
  onInc,
  decLabel = '−',
  incLabel = '+',
}: StepperProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.btn} onPress={onDec} activeOpacity={0.7}>
        <Text style={styles.btnText}>{decLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity style={styles.btn} onPress={onInc} activeOpacity={0.7}>
        <Text style={styles.btnText}>{incLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.faint,
    marginRight: 2,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: colors.ink,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  value: {
    color: colors.ink,
    fontFamily: fonts.mono,
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
});
