import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

// Marca "Console" do brand kit: nota pixelada em escada ascendente (port do web).
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Rect x="2" y="2" width="36" height="36" rx="6" fill={colors.bg} />
      <Rect x="20" y="8" width="4" height="20" rx="1" fill={colors.accent} />
      <Rect x="24" y="8" width="6" height="4" rx="1" fill={colors.accent} />
      <Rect x="26" y="12" width="6" height="4" rx="1" fill={colors.accent} opacity={0.75} />
      <Rect x="28" y="16" width="4" height="4" rx="1" fill={colors.accent} opacity={0.5} />
      <Rect x="11" y="24" width="11" height="8" rx="1.6" fill={colors.accent} />
    </Svg>
  );
}

export function Wordmark({ fontSize = 14 }: { fontSize?: number }) {
  return (
    <Text style={[styles.wordmark, { fontSize, letterSpacing: fontSize * 0.18 }]}>
      MUSILISTA
    </Text>
  );
}

export function Logo({ markSize = 28 }: { markSize?: number }) {
  return (
    <View style={styles.logo}>
      <LogoMark size={markSize} />
      <Wordmark />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { color: colors.ink, fontFamily: fonts.sansSemiBold },
});
