import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import {
  IconBack,
  IconCapo,
  IconHeart,
  IconPause,
  IconPlay,
} from '@/components/ui/icons';
import { Stepper } from '@/components/ui/Stepper';
import { useSession } from '@/context/SessionContext';
import { useSong, useToggleFavorite } from '@/hooks/useSongs';
import { transposedChordRow, type CifraBlock } from '@/lib/cifra';
import { preferFlats, transposeKey } from '@/lib/harmony';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

const BLOCK_TYPE_LABEL: Record<string, string> = {
  intro: 'Intro', verse: 'Verso', chorus: 'Refrão', bridge: 'Ponte', solo: 'Solo', unknown: '',
};

const BLOCK_TYPE_COLOR: Record<string, { text: string; border: string }> = {
  intro: { text: colors.muted, border: colors.line },
  verse: { text: colors.verse, border: `${colors.verse}80` },
  chorus: { text: colors.chorus, border: `${colors.chorus}80` },
  bridge: { text: colors.bridge, border: `${colors.bridge}80` },
  solo: { text: colors.solo, border: `${colors.solo}80` },
  unknown: { text: colors.muted, border: colors.line },
};

const MIN_FONT = 12;
const MAX_FONT = 22;
const DEFAULT_FONT = 15;
const MIN_BPM = 40;
const MAX_BPM = 240;
const DEFAULT_BPM = 90;
const MIN_SCROLL_SPEED = 10;
const MAX_SCROLL_SPEED = 100;
const DEFAULT_SCROLL_SPEED = 30; // px/s

function BlockView({
  block,
  semitones,
  flats,
  fontSizePx,
}: {
  block: CifraBlock;
  semitones: number;
  flats: boolean;
  fontSizePx: number;
}) {
  if (block.lines.length === 0) return null;
  const cfg = BLOCK_TYPE_COLOR[block.type] ?? BLOCK_TYPE_COLOR.unknown;
  const label = BLOCK_TYPE_LABEL[block.type];
  return (
    <View style={styles.block}>
      {label ? (
        <Text style={[styles.blockLabel, { color: cfg.text, borderLeftColor: cfg.border }]}>
          {label}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chart}
        contentContainerStyle={styles.chartContent}
      >
        <View>
          {block.lines.map((line, li) => {
            const row = transposedChordRow(line, semitones, flats);
            const sizing = { fontSize: fontSizePx, lineHeight: Math.round(fontSizePx * 1.6) };
            return (
              <View key={li}>
                {row ? <Text style={[styles.chordRow, sizing]}>{row}</Text> : null}
                <Text style={[styles.lyricRow, sizing]}>{line.text || ' '}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { data: song, isLoading } = useSong(id);
  const { mutate: toggleFavorite, isPending: togglingFavorite } = useToggleFavorite(id);

  // Tudo aqui é só da sessão de leitura — nada é persistido.
  const scrollRef = useRef<AutoScrollViewRef>(null);
  const [semitones, setSemitones] = useState(0);
  const [fontSizePx, setFontSizePx] = useState(DEFAULT_FONT);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [pulsing, setPulsing] = useState(false);
  const [beatOn, setBeatOn] = useState(false);
  const [autoscroll, setAutoscroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(DEFAULT_SCROLL_SPEED);

  const songKey = song?.key ?? null;
  const displayedKey =
    songKey && semitones !== 0 ? transposeKey(songKey, semitones) : songKey;
  const flats = preferFlats(displayedKey || songKey || '');

  // Pulso visual de metrônomo — sem áudio, só um intervalo local pelo BPM.
  useEffect(() => {
    if (!pulsing) {
      setBeatOn(false);
      return;
    }
    const halfBeatMs = 30000 / bpm;
    const iv = setInterval(() => setBeatOn((b) => !b), halfBeatMs);
    return () => clearInterval(iv);
  }, [pulsing, bpm]);

  function toggleScroll() {
    if (autoscroll) scrollRef.current?.pause();
    else scrollRef.current?.play();
    setAutoscroll((a) => !a);
  }

  function handleFavorite() {
    if (!session) {
      router.push('/(auth)/login');
      return;
    }
    if (song) toggleFavorite(!song.favorite);
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
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <IconBack size={18} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
        </View>
        <TouchableOpacity
          onPress={handleFavorite}
          disabled={togglingFavorite}
          style={[styles.favBtn, song.favorite && styles.favBtnActive]}
        >
          <IconHeart
            size={14}
            color={song.favorite ? colors.accent : colors.muted}
            filled={song.favorite}
          />
          <Text style={[styles.favText, song.favorite && styles.favTextActive]}>
            {song.favorite ? 'Favorita' : 'Favoritar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chips de meta */}
      {(displayedKey || song.capo || song.tuning) && (
        <View style={styles.metaRow}>
          {displayedKey ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaKey}>Tom {displayedKey}</Text>
            </View>
          ) : null}
          {song.capo ? (
            <View style={styles.metaChip}>
              <IconCapo size={12} color={colors.muted} />
              <Text style={styles.metaText}>Capo {song.capo}ª casa</Text>
            </View>
          ) : null}
          {song.tuning ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>Afinação {song.tuning}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Barra de controle — só da sessão, nada aqui altera a cifra salva */}
      <View style={styles.controls}>
        <Stepper
          label="Tom"
          value={semitones > 0 ? `+${semitones}` : String(semitones)}
          onDec={() => setSemitones((s) => s - 1)}
          onInc={() => setSemitones((s) => s + 1)}
        />
        <Stepper
          label="Fonte"
          value={String(fontSizePx)}
          onDec={() => setFontSizePx((f) => Math.max(MIN_FONT, f - 1))}
          onInc={() => setFontSizePx((f) => Math.min(MAX_FONT, f + 1))}
          decLabel="A−"
          incLabel="A+"
        />

        <View style={styles.controlGroup}>
          <TouchableOpacity
            onPress={() => setPulsing((p) => !p)}
            style={[styles.squareBtn, pulsing && styles.squareBtnActive]}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.beatDot,
                { backgroundColor: pulsing ? colors.accent : colors.muted },
                beatOn && styles.beatDotOn,
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.squareBtn}
            onPress={() => setBpm((b) => Math.max(MIN_BPM, b - 5))}
            activeOpacity={0.7}
          >
            <Text style={styles.squareBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.bpmValue}>{bpm} BPM</Text>
          <TouchableOpacity
            style={styles.squareBtn}
            onPress={() => setBpm((b) => Math.min(MAX_BPM, b + 5))}
            activeOpacity={0.7}
          >
            <Text style={styles.squareBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlGroup}>
          <TouchableOpacity
            onPress={toggleScroll}
            style={[styles.squareBtn, autoscroll && styles.squareBtnActive]}
            activeOpacity={0.7}
          >
            {autoscroll ? (
              <IconPause size={13} color={colors.accent} />
            ) : (
              <IconPlay size={13} color={colors.muted} />
            )}
          </TouchableOpacity>
          <Slider
            style={styles.slider}
            minimumValue={MIN_SCROLL_SPEED}
            maximumValue={MAX_SCROLL_SPEED}
            step={5}
            value={scrollSpeed}
            onValueChange={(v) => {
              setScrollSpeed(v);
              scrollRef.current?.setSpeed(v);
            }}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.accent}
          />
        </View>
      </View>

      {/* Corpo da cifra */}
      <AutoScrollView ref={scrollRef} speed={scrollSpeed} style={styles.scroll}>
        <View style={styles.cifra}>
          {(song.blocks ?? []).map((block, bi) => (
            <BlockView
              key={bi}
              block={block}
              semitones={semitones}
              flats={flats}
              fontSizePx={fontSizePx}
            />
          ))}
          {(song.blocks ?? []).length === 0 && (
            <Text style={styles.emptyText}>Cifra sem conteúdo disponível.</Text>
          )}
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
    gap: 10,
  },
  backBtn: { padding: 6 },
  headerInfo: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.lg },
  artist: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  favBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  favBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint15,
  },
  favText: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: fontSize.xs },
  favTextActive: { color: colors.accent },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaKey: {
    color: colors.accent,
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xs,
  },
  metaText: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 16,
    rowGap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.raised,
    padding: 12,
  },
  controlGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  squareBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareBtnActive: { borderColor: colors.accent },
  squareBtnText: { color: colors.ink, fontFamily: fonts.sansMedium, fontSize: 14 },
  beatDot: { width: 8, height: 8, borderRadius: 4 },
  beatDotOn: { transform: [{ scale: 1.5 }] },
  bpmValue: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    width: 64,
    textAlign: 'center',
  },
  slider: { width: 110, height: 32 },
  scroll: { flex: 1 },
  cifra: { paddingHorizontal: 12, paddingTop: 4, gap: 20, paddingBottom: 96 },
  block: { gap: 6 },
  blockLabel: {
    alignSelf: 'flex-start',
    borderLeftWidth: 2,
    paddingLeft: 8,
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chart: {
    borderRadius: 8,
    backgroundColor: colors.surface60,
  },
  chartContent: { paddingHorizontal: 12, paddingVertical: 8 },
  chordRow: { color: colors.accent, fontFamily: fonts.mono },
  lyricRow: { color: colors.ink, fontFamily: fonts.mono },
  emptyText: { color: colors.muted, fontFamily: fonts.sans },
});
