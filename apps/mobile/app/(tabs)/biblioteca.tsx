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
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LetterChip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconClose, IconSearch } from '@/components/ui/icons';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { Caption, Eyebrow, PageTitle } from '@/components/ui/Typography';
import { useSession } from '@/context/SessionContext';
import {
  useArtistSongs,
  useFavorites,
  useLetterArtists,
  useRecents,
  useSearchSongs,
} from '@/hooks/useSongs';
import { BASE_URL } from '@/lib/api';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { ArtistResult, Song, SongResult } from '@/types';

const LETTERS = ['0-9', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

function coverUrl(song: { title: string; artist: string }) {
  return `${BASE_URL}/api/song-cover?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`;
}

function artistPhotoUrl(name: string) {
  return `${BASE_URL}/api/artist-photo?name=${encodeURIComponent(name)}`;
}

// Card de música da Home web: avatar quadrado sm + título/artista, grid de 3 colunas
function SongCard({ song, onPress }: { song: SongResult; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.songCard} onPress={onPress} activeOpacity={0.7}>
      <Avatar
        name={song.artist}
        url={coverUrl(song)}
        fallbackUrls={[artistPhotoUrl(song.artist)]}
        size={28}
        shape="square"
      />
      <View style={styles.songCardText}>
        <Text style={styles.songCardTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.songCardArtist} numberOfLines={1}>{song.artist}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ArtistCard({ artist, onPress }: { artist: ArtistResult; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.artistCard} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={artist.name} url={artistPhotoUrl(artist.name)} size={48} shape="circle" />
      <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
      <Text style={styles.artistCount}>
        {artist.count} {artist.count === 1 ? 'música' : 'músicas'}
      </Text>
    </TouchableOpacity>
  );
}

function SongGrid({
  label,
  songs,
  onOpen,
}: {
  label?: string;
  songs: SongResult[];
  onOpen: (id: string) => void;
}) {
  if (songs.length === 0) return null;
  return (
    <View style={styles.section}>
      {label ? <Caption>{label}</Caption> : null}
      <View style={styles.grid}>
        {songs.map((s) => (
          <SongCard key={s.id} song={s} onPress={() => onOpen(s.id)} />
        ))}
      </View>
    </View>
  );
}

function LoginTeaser({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={styles.teaser}>
      <View style={styles.teaserText}>
        <Text style={styles.teaserTitle}>
          Favoritos, histórico e grupos ficam salvos quando você entra
        </Text>
        <Text style={styles.teaserHint}>Crie sua conta grátis para não perder nada.</Text>
      </View>
      <Button label="Entrar" variant="outline" size="sm" onPress={onLogin} />
    </View>
  );
}

export default function BibliotecaScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [query, setQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  const showSearch = query.trim().length > 1;
  const { data: results, isLoading: searching } = useSearchSongs(query);
  const { data: letterArtists, isLoading: loadingArtists } = useLetterArtists(
    showSearch ? null : activeLetter,
  );
  const { data: artistSongs, isLoading: loadingArtistSongs } = useArtistSongs(
    showSearch ? null : selectedArtist,
  );
  const { data: favorites } = useFavorites(Boolean(session));
  const { data: recents } = useRecents(Boolean(session));

  const idle = !showSearch && !activeLetter;

  const openSong = useCallback(
    (id: string) => router.push(`/songs/${id}`),
    [router],
  );

  function handleQuery(q: string) {
    setQuery(q);
    if (q.trim()) {
      setActiveLetter(null);
      setSelectedArtist(null);
    }
  }

  function toggleLetter(letter: string) {
    setSelectedArtist(null);
    setActiveLetter((prev) => (prev === letter ? null : letter));
  }

  const favoriteIds = new Set((favorites ?? []).map((s) => s.id));
  const recentsExceptFavorites = (recents ?? []).filter((s) => !favoriteIds.has(s.id));
  const toResult = (s: Song): SongResult => ({ id: s.id, title: s.title, artist: s.artist });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[1]}
      >
        <View style={styles.header}>
          {!session && <Eyebrow>Acervo · busca</Eyebrow>}
          <PageTitle>Buscar música</PageTitle>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <IconSearch size={16} color={colors.faint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nome da música ou artista..."
              placeholderTextColor={colors.faint}
              value={query}
              onChangeText={handleQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleQuery('')} hitSlop={8}>
                <IconClose size={14} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!showSearch && (
          <View style={styles.letters}>
            {LETTERS.map((letter) => (
              <LetterChip
                key={letter}
                letter={letter}
                active={activeLetter === letter}
                onPress={() => toggleLetter(letter)}
              />
            ))}
          </View>
        )}

        {showSearch ? (
          searching ? (
            <View style={styles.section}>
              <SkeletonSongRow />
              <SkeletonSongRow />
              <SkeletonSongRow />
            </View>
          ) : (results?.songs ?? []).length === 0 && (results?.artists ?? []).length === 0 ? (
            <EmptyState
              icon="🔍"
              title="Nenhum resultado"
              description={`Sem resultados para "${query}"`}
            />
          ) : (
            <>
              <SongGrid label="Músicas" songs={results?.songs ?? []} onOpen={openSong} />
              {(results?.artists ?? []).length > 0 && (
                <View style={styles.section}>
                  <Caption>Artistas</Caption>
                  <View style={styles.grid}>
                    {(results?.artists ?? []).map((a) => (
                      <ArtistCard
                        key={a.name}
                        artist={a}
                        onPress={() => {
                          setQuery('');
                          setActiveLetter(a.name.charAt(0).toUpperCase());
                          setSelectedArtist(a.name);
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          )
        ) : activeLetter && selectedArtist ? (
          <View style={styles.section}>
            <TouchableOpacity onPress={() => setSelectedArtist(null)} hitSlop={8}>
              <Caption style={styles.backLink}>← Artistas</Caption>
            </TouchableOpacity>
            <Text style={styles.artistHeading}>{selectedArtist}</Text>
            {loadingArtistSongs ? (
              <SkeletonSongRow />
            ) : (
              <View style={styles.grid}>
                {(artistSongs ?? []).map((s) => (
                  <SongCard key={s.id} song={s} onPress={() => openSong(s.id)} />
                ))}
              </View>
            )}
          </View>
        ) : activeLetter ? (
          <View style={styles.section}>
            <Caption>Artistas com {activeLetter}</Caption>
            {loadingArtists ? (
              <SkeletonSongRow />
            ) : (letterArtists ?? []).length === 0 ? (
              <EmptyState icon="🎵" title="Nada nesta letra ainda" />
            ) : (
              <View style={styles.grid}>
                {(letterArtists ?? []).map((a) => (
                  <ArtistCard
                    key={a.name}
                    artist={a}
                    onPress={() => setSelectedArtist(a.name)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : session ? (
          <>
            <SongGrid
              label="Favoritas"
              songs={(favorites ?? []).slice(0, 5).map(toResult)}
              onOpen={openSong}
            />
            <SongGrid
              label="Vistas recentemente"
              songs={recentsExceptFavorites.map(toResult)}
              onOpen={openSong}
            />
            {(favorites ?? []).length === 0 && recentsExceptFavorites.length === 0 && (
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
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { paddingTop: 12, paddingBottom: 4, gap: 4 },
  searchWrap: { backgroundColor: colors.bg, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: fontSize.sm,
    paddingVertical: 11,
  },
  letters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  section: { gap: 8, marginBottom: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexGrow: 1,
    flexBasis: '30%',
  },
  songCardText: { flex: 1, minWidth: 0 },
  songCardTitle: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
  },
  songCardArtist: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  artistCard: {
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 16,
    flexGrow: 1,
    flexBasis: '30%',
  },
  artistName: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  artistCount: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  backLink: { color: colors.muted },
  artistHeading: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: fontSize.lg,
    marginBottom: 4,
  },
  teaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.surface60,
    padding: 16,
    marginTop: 8,
  },
  teaserText: { flex: 1, gap: 2 },
  teaserTitle: { color: colors.ink, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
  teaserHint: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs },
});
