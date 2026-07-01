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
import { useAddSongToGroup } from '@/hooks/useGroups';
import { useGroupSongs } from '@/hooks/useGroups';
import { useSearchSongs } from '@/hooks/useSongs';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { Song } from '@/types';

export default function BuscarMusicaModal() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data: results, isLoading } = useSearchSongs(query);
  const { data: groupSongs } = useGroupSongs(groupId);
  const { mutate: addSong, isPending } = useAddSongToGroup(groupId);

  const groupSongIds = new Set((groupSongs ?? []).map((s) => s.id));

  function handleAdd(song: Song) {
    if (groupSongIds.has(song.id)) return;
    addSong(song.id, {
      onSuccess: () => {
        Alert.alert('Adicionado!', `${song.title} adicionada ao repertório.`);
      },
      onError: (e) => Alert.alert('Erro', e.message),
    });
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
            const added = groupSongIds.has(item.id);
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
