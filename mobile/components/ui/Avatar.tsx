import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fontWeight } from '@/constants/typography';

type Shape = 'circle' | 'square';

interface AvatarProps {
  name?: string;
  url?: string;
  size?: number;
  shape?: Shape;
}

export function Avatar({ name, url, size = 44, shape = 'square' }: AvatarProps) {
  const radius = shape === 'circle' ? size / 2 : size * 0.23;
  const initial = (name ?? '?').charAt(0).toUpperCase();
  const textSize = size * 0.42;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.base, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        styles.placeholder,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text style={[styles.initial, { fontSize: textSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  placeholder: {
    backgroundColor: colors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.accent,
    fontWeight: fontWeight.black as '900',
  },
});
