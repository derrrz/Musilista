import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { useSession } from '@/context/SessionContext';
import {
  useFavorites,
  useLetterSongs,
  useRecents,
  useSearchSongs,
} from '@/hooks/useSongs';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { Song } from '@/types';

const LETTERS = ['0-9', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

function SongRow({ song, onPress }: { song: Song; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowText}>
        <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SongSection({
  label,
  songs,
  onOpen,
}: {
  label: string;
  songs: Song[];
  onOpen: (id: string) => void;
}) {
  if (songs.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      {songs.map((s) => (
        <SongRow key={s.id} song={s} onPress={() => onOpen(s.id)} />
      ))}
    </View>
  );
}

function LoginTeaser({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={styles.teaser}>
      <Text style={styles.teaserTitle}>
        Favoritos, histórico e grupos ficam salvos quando você entra
      </Text>
      <Text style={styles.teaserHint}>Crie sua conta grátis para não perder nada.</Text>
      <TouchableOpacity style={styles.teaserBtn} onPress={onLogin} activeOpacity={0.8}>
        <Text style={styles.teaserBtnText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BibliotecaScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [query, setQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const showSearch = query.trim().length > 1;
  const { data: results, isLoading: searching } = useSearchSongs(query);
  const { data: letterResults, isLoading: loadingLetter } = useLetterSongs(activeLetter);
  const { data: favorites } = useFavorites(Boolean(session));
  const { data: recents } = useRecents(Boolean(session));

  const idle = !showSearch && !activeLetter;
  const songs = showSearch ? (results ?? []) : (letterResults ?? []);
  const isLoading = showSearch ? searching : activeLetter ? loadingLetter : false;

  const openSong = useCallback(
    (id: string) => router.push(`/songs/${id}`),
    [router],
  );

  function handleQuery(q: string) {
    setQuery(q);
    if (q.trim()) setActiveLetter(null);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Cifras</Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar música ou artista..."
          placeholderTextColor={colors.faint}
          value={query}
          onChangeText={handleQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!showSearch && (
          <View style={styles.letters}>
            {LETTERS.map((letter) => {
              const active = activeLetter === letter;
              return (
                <TouchableOpacity
                  key={letter}
                  style={[styles.letterBtn, active && styles.letterBtnActive]}
                  onPress={() => setActiveLetter(active ? null : letter)}
                >
                  <Text style={[styles.letterText, active && styles.letterTextActive]}>
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {isLoading ? (
          <>
            <SkeletonSongRow />
            <SkeletonSongRow />
            <SkeletonSongRow />
          </>
        ) : !idle && songs.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Nenhum resultado"
            description={showSearch ? `Sem resultados para "${query}"` : 'Nada nesta letra ainda'}
          />
        ) : !idle ? (
          <View>
            {songs.map((s) => (
              <SongRow key={s.id} song={s} onPress={() => openSong(s.id)} />
            ))}
          </View>
        ) : session ? (
          <>
            <SongSection
              label="Favoritas"
              songs={(favorites ?? []).slice(0, 5)}
              onOpen={openSong}
            />
            <SongSection label="Vistas recentemente" songs={recents ?? []} onOpen={openSong} />
            {(favorites ?? []).length === 0 && (recents ?? []).length === 0 && (
              <EmptyState
                icon="🎵"
                title="Comece buscando uma música"
                description="Suas favoritas e acessos recentes aparecem aqui"
              />
            )}
          </>
        ) : (
          <LoginTeaser onLogin={() => router.push('/(auth)/login')} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  heading: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: fontSize['2xl'],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  searchIcon: { fontSize: 16, opacity: 0.6 },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: fontSize.base,
    paddingVertical: 13,
  },
  clearIcon: { color: colors.muted, fontSize: 14, padding: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  letters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  letterBtn: {
    minWidth: 34,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  letterBtnActive: { borderColor: colors.accent, backgroundColor: colors.avatarBg },
  letterText: { color: colors.muted, fontFamily: fonts.monoBold, fontSize: fontSize.xs },
  letterTextActive: { color: colors.accent },
  sectionLabel: {
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowText: { flex: 1 },
  title: {
    color: colors.ink,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
  },
  artist: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  teaser: {
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
    marginTop: 8,
  },
  teaserTitle: { color: colors.ink, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
  teaserHint: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs },
  teaserBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  teaserBtnText: { color: colors.ink, fontFamily: fonts.sansSemiBold, fontSize: fontSize.sm },
});
