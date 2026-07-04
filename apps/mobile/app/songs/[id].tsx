import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AutoScrollView, type AutoScrollViewRef } from '@/components/AutoScrollView';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/context/SessionContext';
import { useSong, useToggleFavorite } from '@/hooks/useSongs';
import { colors } from '@/constants/colors';
import { fonts, fontSize, fontWeight } from '@/constants/typography';
import type { Section } from '@/types';

const SEMITONES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function transposeChord(chord: string, semitones: number): string {
  return chord.replace(/[A-G]#?/g, (note) => {
    const idx = SEMITONES.indexOf(note);
    if (idx === -1) return note;
    return SEMITONES[(idx + semitones + 12) % 12] ?? note;
  });
}

function ChordLine({ chord, lyric, transpose }: { chord?: string; lyric?: string; transpose: number }) {
  const transposedChord = chord ? transposeChord(chord, transpose) : undefined;
  return (
    <View style={styles.line}>
      {transposedChord ? (
        <Text style={styles.chord}>{transposedChord}</Text>
      ) : (
        <Text style={styles.chordPlaceholder}> </Text>
      )}
      {lyric ? <Text style={styles.lyric}>{lyric}</Text> : null}
    </View>
  );
}

function SectionView({ section, transpose }: { section: Section; transpose: number }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.dot, section.active && styles.dotActive]} />
        <Text style={styles.sectionLabel}>{section.label}</Text>
      </View>
      {section.lines.map((line, i) => (
        <ChordLine key={i} chord={line.chord} lyric={line.lyric} transpose={transpose} />
      ))}
    </View>
  );
}

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { data: song, isLoading } = useSong(id);
  const { mutate: toggleFavorite, isPending: togglingFavorite } = useToggleFavorite(id);

  const scrollRef = useRef<AutoScrollViewRef>(null);
  const [transpose, setTranspose] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(30);

  function toggleScroll() {
    if (scrolling) {
      scrollRef.current?.pause();
    } else {
      scrollRef.current?.play();
    }
    setScrolling((s) => !s);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.loading}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (!song) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState icon="🎵" title="Música não encontrada" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (!session) {
              router.push('/(auth)/login');
              return;
            }
            toggleFavorite(!song.favorite);
          }}
          disabled={togglingFavorite}
          style={styles.favBtn}
        >
          <Text style={styles.favIcon}>{song.favorite ? '★' : '☆'}</Text>
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.transpose}>
          <TouchableOpacity
            style={styles.transposeBtn}
            onPress={() => setTranspose((t) => t - 1)}
          >
            <Text style={styles.transposeBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.transposeValue}>
            {transpose > 0 ? `+${transpose}` : transpose}
          </Text>
          <TouchableOpacity
            style={styles.transposeBtn}
            onPress={() => setTranspose((t) => t + 1)}
          >
            <Text style={styles.transposeBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scrollControls}>
          <TouchableOpacity
            style={styles.transposeBtn}
            onPress={() => {
              const s = Math.max(10, speed - 10);
              setSpeed(s);
              scrollRef.current?.setSpeed(s);
            }}
          >
            <Text style={styles.transposeBtnText}>🐢</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.playBtn, scrolling && styles.playBtnActive]}
            onPress={toggleScroll}
          >
            <Text style={styles.playBtnText}>{scrolling ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.transposeBtn}
            onPress={() => {
              const s = Math.min(120, speed + 10);
              setSpeed(s);
              scrollRef.current?.setSpeed(s);
            }}
          >
            <Text style={styles.transposeBtnText}>🐇</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cifra */}
      <AutoScrollView ref={scrollRef} speed={speed} style={styles.scroll}>
        <View style={styles.cifra}>
          {(song.sections ?? []).map((section, i) => (
            <SectionView key={i} section={section} transpose={transpose} />
          ))}
        </View>
      </AutoScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { color: colors.muted, textAlign: 'center', marginTop: 40, fontFamily: fonts.sans },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { padding: 8 },
  backIcon: { color: colors.accent, fontSize: 20, fontFamily: fonts.sansBold },
  headerInfo: { flex: 1 },
  title: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.base },
  artist: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  favBtn: { padding: 8 },
  favIcon: { fontSize: 22, color: colors.accent },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  transpose: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  transposeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  transposeBtnText: { color: colors.ink, fontSize: fontSize.base, fontFamily: fonts.sansBold },
  transposeValue: {
    color: colors.accent,
    fontFamily: fonts.monoBold,
    fontSize: fontSize.base,
    minWidth: 30,
    textAlign: 'center',
  },
  scrollControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  playBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  playBtnText: { fontSize: 18 },
  scroll: { flex: 1 },
  cifra: { padding: 16, gap: 24, paddingBottom: 80 },
  section: { gap: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.faint },
  dotActive: { backgroundColor: colors.sectionDot },
  sectionLabel: {
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  line: { marginBottom: 2 },
  chord: {
    color: colors.chord,
    fontFamily: fonts.monoBold,
    fontSize: 14,
  },
  chordPlaceholder: { fontSize: 14 },
  lyric: { color: colors.ink, fontFamily: fonts.mono, fontSize: 14 },
});
