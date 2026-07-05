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
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconClose, IconSearch } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import {
  useAddSongToRepertoire,
  useCreateRepertoire,
  useGroupRepertoires,
} from '@/hooks/useGroups';
import { useSearchSongs } from '@/hooks/useSongs';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { SongResult } from '@/types';

export default function BuscarMusicaModal() {
  const { groupId, repertoireId } = useLocalSearchParams<{
    groupId: string;
    repertoireId?: string;
  }>();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState<string | null>(repertoireId ?? null);
  const [selected, setSelected] = useState<SongResult | null>(null);
  const [songKey, setSongKey] = useState('');
  const [bpm, setBpm] = useState('');

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

  function isAdded(song: SongResult) {
    return targetSongKeys.has(`${song.title}::${song.artist}`.toLowerCase());
  }

  async function handleAdd() {
    if (!selected) return;
    try {
      let repId = target?.id;
      if (!repId) {
        repId = (await createRepertoire('Repertório')).id;
      }
      await addSong({
        repertoireId: repId,
        title: selected.title,
        artist: selected.artist,
        songKey: songKey.trim() || undefined,
        bpm: bpm.trim() || undefined,
      });
      router.back();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    }
  }

  const songs = results?.songs ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Adicionar música</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <IconClose size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {selected ? (
        <View style={styles.confirmBox}>
          <View style={styles.selectedCard}>
            <View style={styles.selectedText}>
              <Text style={styles.songTitle} numberOfLines={1}>{selected.title}</Text>
              <Text style={styles.songArtist} numberOfLines={1}>{selected.artist}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={8}>
              <IconClose size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.optRow}>
            <View style={styles.optItem}>
              <Input
                label="Tom (opcional)"
                value={songKey}
                onChangeText={setSongKey}
                placeholder="Ex: G, Am"
                autoCapitalize="characters"
                maxLength={5}
              />
            </View>
            <View style={styles.optItem}>
              <Input
                label="BPM (opcional)"
                value={bpm}
                onChangeText={setBpm}
                placeholder="Ex: 120"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>

          <View style={styles.confirmActions}>
            <Button
              label="Cancelar"
              variant="outline"
              onPress={() => setSelected(null)}
              style={styles.confirmBtn}
            />
            <Button
              label="Adicionar"
              loading={isPending}
              onPress={handleAdd}
              style={styles.confirmBtn}
            />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.searchBox}>
            <IconSearch size={16} color={colors.faint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Título ou artista..."
              placeholderTextColor={colors.faint}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          {!repertoireId && (repertoires ?? []).length > 1 && (
            <View style={styles.repertoireChips}>
              {(repertoires ?? []).map((r) => (
                <Chip
                  key={r.id}
                  label={r.name}
                  active={r.id === target?.id}
                  onPress={() => setTargetId(r.id)}
                />
              ))}
            </View>
          )}

          {isLoading ? (
            <View style={styles.list}>
              <SkeletonSongRow />
              <SkeletonSongRow />
            </View>
          ) : (
            <FlatList
              data={songs}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => {
                const added = isAdded(item);
                return (
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => setSelected(item)}
                    disabled={added || isPending}
                    activeOpacity={0.7}
                  >
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
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 16,
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
  list: { paddingHorizontal: 16 },
  repertoireChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowText: { flex: 1 },
  songTitle: { color: colors.ink, fontFamily: fonts.sansMedium, fontSize: 15 },
  songArtist: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  addedBadge: { color: colors.emerald500, fontFamily: fonts.sansBold, fontSize: 18 },
  addIcon: { color: colors.accent, fontFamily: fonts.sansBold, fontSize: 22 },
  separator: { height: 1, backgroundColor: colors.line },
  confirmBox: { padding: 16, gap: 16 },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentTint15,
    padding: 14,
  },
  selectedText: { flex: 1, minWidth: 0 },
  optRow: { flexDirection: 'row', gap: 12 },
  optItem: { flex: 1 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmBtn: { flex: 1 },
});
