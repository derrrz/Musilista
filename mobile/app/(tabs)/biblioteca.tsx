import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { useRecents, useSearchSongs } from '@/hooks/useSongs';
import { colors } from '@/constants/colors';
import { fonts, fontSize, fontWeight } from '@/constants/typography';
import type { Song } from '@/types';

function SongRow({ song, onPress }: { song: Song; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.keyBadge}>
        <Text style={styles.keyText}>{song.key ?? '?'}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BibliotecaScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data: results, isLoading: searching } = useSearchSongs(query);
  const { data: recents, isLoading: loadingRecents } = useRecents();

  const showSearch = query.trim().length > 1;
  const songs = showSearch ? (results ?? []) : (recents ?? []);
  const isLoading = showSearch ? searching : loadingRecents;

  const openSong = useCallback(
    (id: string) => router.push(`/songs/${id}`),
    [router],
  );

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
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {!showSearch && (
        <Text style={styles.sectionLabel}>
          {loadingRecents ? 'Carregando...' : 'Recentes'}
        </Text>
      )}

      {isLoading ? (
        <>
          <SkeletonSongRow />
          <SkeletonSongRow />
          <SkeletonSongRow />
        </>
      ) : songs.length === 0 ? (
        <EmptyState
          icon={showSearch ? '🔍' : '🎵'}
          title={showSearch ? 'Nenhum resultado' : 'Nenhum acesso recente'}
          description={
            showSearch
              ? `Sem resultados para "${query}"`
              : 'Busque uma música para começar'
          }
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SongRow song={item} onPress={() => openSong(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
        />
      )}
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
  sectionLabel: {
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  keyBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    color: colors.accent,
    fontFamily: fonts.monoBold,
    fontSize: fontSize.sm,
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
  separator: { height: 1, backgroundColor: colors.line },
});
