import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import {
  useAddSongToRepertoire,
  useCreateRepertoire,
  useGroupRepertoires,
} from '@/hooks/useGroups';
import { useSearchSongs } from '@/hooks/useSongs';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { Song } from '@/types';

export default function BuscarMusicaModal() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);

  const { data: results, isLoading } = useSearchSongs(query);
  const { data: repertoires } = useGroupRepertoires(groupId);
  const { mutateAsync: createRepertoire, isPending: creating } = useCreateRepertoire(groupId);
  const { mutateAsync: addSong, isPending: adding } = useAddSongToRepertoire(groupId);

  const isPending = creating || adding;
  const target =
    (repertoires ?? []).find((r) => r.id === targetId) ?? (repertoires ?? [])[0];

  const targetSongKeys = new Set(
    (target?.songs ?? []).map((s) => `${s.title}::${s.artist ?? ''}`.toLowerCase()),
  );

  function isAdded(song: Song) {
    return targetSongKeys.has(`${song.title}::${song.artist}`.toLowerCase());
  }

  async function handleAdd(song: Song) {
    if (isAdded(song)) return;
    try {
      let repertoireId = target?.id;
      if (!repertoireId) {
        repertoireId = (await createRepertoire('Repertório')).id;
      }
      await addSong({ repertoireId, title: song.title, artist: song.artist });
      Alert.alert('Adicionado!', `${song.title} adicionada ao repertório.`);
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscar música</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Título ou artista..."
          placeholderTextColor={colors.faint}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {(repertoires ?? []).length > 1 && (
        <View style={styles.repertoireChips}>
          {(repertoires ?? []).map((r) => {
            const selected = r.id === target?.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setTargetId(r.id)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {r.name}
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
        </>
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => {
            const added = isAdded(item);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleAdd(item)}
                disabled={added || isPending}
                activeOpacity={0.7}
              >
                <View style={styles.keyBadge}>
                  <Text style={styles.keyText}>{item.key ?? '?'}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                </View>
                {added ? (
                  <Text style={styles.addedBadge}>✓</Text>
                ) : (
                  <Text style={styles.addIcon}>+</Text>
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.lg },
  close: { color: colors.muted, fontSize: 20, padding: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 16,
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
  list: { paddingHorizontal: 16 },
  repertoireChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.avatarBg },
  chipText: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
  chipTextActive: { color: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  keyBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: fontSize.sm },
  rowText: { flex: 1 },
  songTitle: { color: colors.ink, fontFamily: fonts.sansMedium, fontSize: 15 },
  songArtist: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  addedBadge: { color: colors.success, fontFamily: fonts.sansBold, fontSize: 18 },
  addIcon: { color: colors.accent, fontFamily: fonts.sansBold, fontSize: 22 },
  separator: { height: 1, backgroundColor: colors.line },
});
