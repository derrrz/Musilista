import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors } from '@/constants/colors';
import { textPresets } from '@/constants/typography';

export function Eyebrow({ style, ...props }: TextProps) {
  return <Text style={[styles.eyebrow, style]} {...props} />;
}

export function PageTitle({ style, ...props }: TextProps) {
  return <Text style={[styles.pageTitle, style]} {...props} />;
}

export function Caption({ style, ...props }: TextProps) {
  return <Text style={[styles.caption, style]} {...props} />;
}

const styles = StyleSheet.create({
  eyebrow: { ...textPresets.eyebrow, color: colors.muted },
  pageTitle: { ...textPresets.pageTitle, color: colors.ink },
  caption: { ...textPresets.caption, color: colors.muted },
});
