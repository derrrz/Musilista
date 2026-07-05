import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

type Shape = 'circle' | 'square';

interface AvatarProps {
  name?: string;
  /** URL principal e fallbacks em ordem (ex.: capa → foto do artista). 404 cai para o próximo. */
  url?: string;
  fallbackUrls?: string[];
  size?: number;
  shape?: Shape;
}

export function Avatar({ name, url, fallbackUrls = [], size = 36, shape = 'square' }: AvatarProps) {
  const sources = [url, ...fallbackUrls].filter((u): u is string => Boolean(u));
  const [srcIndex, setSrcIndex] = useState(0);
  const radius = shape === 'circle' ? size / 2 : 8;
  const initial = (name ?? '?').charAt(0).toUpperCase();
  const src = sources[srcIndex];

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        onError={() => setSrcIndex((i) => i + 1)}
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
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  placeholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.accentInk,
    fontFamily: fonts.sansSemiBold,
  },
});
