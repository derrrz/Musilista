import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import {
  IconCheck,
  IconClose,
  IconDocument,
  IconGroups,
  IconGuitar,
  IconHeart,
  IconMenu,
  IconMic,
  IconPause,
  IconPlay,
  IconScreen,
  IconSearch,
  IconSettings,
} from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { useAddBlock, useGroupRepertoires, useUpdateBlock } from '@/hooks/useGroups';
import { useSearchSongs } from '@/hooks/useSongs';
import { BLOCK_TYPES, blockDef, type BlockType } from '@/lib/setlistBlocks';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { IconProps } from '@/components/ui/icons';
import type { SongResult } from '@/types';

const BLOCK_ICON: Record<BlockType, (props: IconProps) => React.ReactNode> = {
  song: IconGuitar,
  section: IconMenu,
  talk: IconMic,
  interaction: IconGroups,
  improv: IconPlay,
  prayer: IconHeart,
  reading: IconDocument,
  media: IconScreen,
  break: IconPause,
  technical: IconSettings,
};

export default function BlocoSetlistModal() {
  const { groupId, repertoireId, blockId } = useLocalSearchParams<{
    groupId: string;
    repertoireId: string;
    blockId?: string;
  }>();
  const router = useRouter();

  const { data: repertoires } = useGroupRepertoires(groupId);
  const editingBlock = blockId
    ? repertoires
        ?.find((r) => r.id === repertoireId)
        ?.songs.find((b) => b.id === blockId)
    : undefined;

  const [type, setType] = useState<BlockType | null>(
    editingBlock ? (blockDef(editingBlock.itemType).type as BlockType) : null,
  );
  const [title, setTitle] = useState(editingBlock?.title ?? '');
  const [body, setBody] = useState(editingBlock?.body ?? '');
  const [minutes, setMinutes] = useState(
    editingBlock?.durationSec ? String(Math.round(editingBlock.durationSec / 60)) : '',
  );
  const [songKey, setSongKey] = useState(editingBlock?.songKey ?? '');
  const [bpm, setBpm] = useState(editingBlock?.bpm ? String(editingBlock.bpm) : '');

  // busca de música no acervo (só para bloco novo do tipo música)
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SongResult | null>(null);
  const { data: results, isLoading: searching } = useSearchSongs(query);

  const { mutate: addBlock, isPending: adding } = useAddBlock(groupId);
  const { mutate: updateBlock, isPending: updating } = useUpdateBlock(groupId);
  const isPending = adding || updating;
  const isEditing = Boolean(editingBlock);

  function pickType(t: BlockType) {
    setType(t);
    if (t !== 'section' && t !== 'song') setTitle(blockDef(t).label);
    else setTitle('');
  }

  function handleSubmit() {
    if (!type) return;
    const isSong = type === 'song';
    if (isSong && !isEditing && !selected) {
      Alert.alert('Escolha uma música', 'Busque e selecione uma música do acervo.');
      return;
    }
    if (!isSong && !title.trim()) {
      Alert.alert('Título obrigatório');
      return;
    }
    const durationSec = minutes.trim() ? Math.round(Number(minutes) * 60) : null;

    const done = {
      onSuccess: () => router.back(),
      onError: (e: Error) => Alert.alert('Erro', e.message),
    };

    if (isEditing && editingBlock) {
      updateBlock(
        {
          repertoireId,
          songItemId: editingBlock.id,
          ...(isSong ? { songKey, bpm } : { title: title.trim(), body }),
          durationSec,
        },
        done,
      );
    } else {
      addBlock(
        {
          repertoireId,
          itemType: type,
          ...(isSong
            ? { title: selected!.title, artist: selected!.artist, songKey, bpm }
            : { title: title.trim(), body }),
          durationSec,
        },
        done,
      );
    }
  }

  const def = type ? blockDef(type) : null;
  const headerTitle = !type
    ? 'Adicionar bloco'
    : isEditing
      ? `Editar ${def!.label.toLowerCase()}`
      : def!.label;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{headerTitle}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <IconClose size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Passo 1: escolher o tipo (só ao criar) */}
        {!type ? (
          <View style={styles.typeGrid}>
            {BLOCK_TYPES.map((b) => {
              const Icon = BLOCK_ICON[b.type];
              return (
                <TouchableOpacity
                  key={b.type}
                  style={styles.typeCard}
                  onPress={() => pickType(b.type)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.typeBadge, { backgroundColor: b.badge.bg }]}>
                    <Icon size={13} color={b.badge.text} />
                  </View>
                  <View style={styles.typeText}>
                    <Text style={styles.typeLabel}>{b.label}</Text>
                    <Text style={styles.typeHint}>{b.hint}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : type === 'song' && !isEditing ? (
          <>
            {/* Música nova: busca no acervo */}
            {!selected ? (
              <>
                <View style={styles.searchBox}>
                  <IconSearch size={16} color={colors.faint} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por título ou artista..."
                    placeholderTextColor={colors.faint}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                    autoCorrect={false}
                  />
                </View>
                {searching ? (
                  <Text style={styles.hint}>Buscando...</Text>
                ) : (
                  (results?.songs ?? []).map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.resultRow}
                      onPress={() => setSelected(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resultTitle} numberOfLines={1}>{s.title}</Text>
                      <Text style={styles.resultArtist} numberOfLines={1}>{s.artist}</Text>
                    </TouchableOpacity>
                  ))
                )}
                {query.trim().length > 1 && !searching && (results?.songs ?? []).length === 0 && (
                  <Text style={styles.hint}>Nenhuma música encontrada para "{query}"</Text>
                )}
              </>
            ) : (
              <>
                <View style={styles.selectedBox}>
                  <IconCheck size={13} color={colors.accent} />
                  <Text style={styles.selectedText} numberOfLines={1}>
                    {selected.title} — {selected.artist}
                  </Text>
                  <TouchableOpacity onPress={() => setSelected(null)} hitSlop={8}>
                    <IconClose size={12} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.row3}>
                  <View style={styles.rowItem}>
                    <Input label="Tom" value={songKey} onChangeText={setSongKey} placeholder="Am, G…" autoCapitalize="characters" />
                  </View>
                  <View style={styles.rowItem}>
                    <Input label="BPM" value={bpm} onChangeText={setBpm} placeholder="120" keyboardType="numeric" />
                  </View>
                  <View style={styles.rowItem}>
                    <Input label="Minutos" value={minutes} onChangeText={setMinutes} placeholder="4" keyboardType="numeric" />
                  </View>
                </View>
                <Button label="Adicionar" loading={isPending} onPress={handleSubmit} size="lg" />
              </>
            )}
          </>
        ) : (
          <>
            {/* Editar música: só tom/bpm/minutos. Outros tipos: título/roteiro/duração */}
            {type === 'song' ? (
              <View style={styles.row3}>
                <View style={styles.rowItem}>
                  <Input label="Tom" value={songKey} onChangeText={setSongKey} placeholder="Am, G…" autoCapitalize="characters" />
                </View>
                <View style={styles.rowItem}>
                  <Input label="BPM" value={bpm} onChangeText={setBpm} placeholder="120" keyboardType="numeric" />
                </View>
                <View style={styles.rowItem}>
                  <Input label="Minutos" value={minutes} onChangeText={setMinutes} placeholder="4" keyboardType="numeric" />
                </View>
              </View>
            ) : (
              <>
                <Input
                  label={type === 'section' ? 'Nome da seção' : 'Título'}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={
                    type === 'section'
                      ? 'Ex: Abertura, Bloco acústico, Bis'
                      : 'Ex: Boas-vindas, Apresentação da banda'
                  }
                  autoFocus={!isEditing}
                />
                {type !== 'section' && (
                  <>
                    <Input
                      label="Roteiro / texto (opcional)"
                      value={body}
                      onChangeText={setBody}
                      placeholder="O que acontece nesse momento? Fala, deixa, referência…"
                      textarea
                    />
                    <Input
                      label="Duração em minutos (opcional)"
                      value={minutes}
                      onChangeText={setMinutes}
                      placeholder="Ex: 3"
                      keyboardType="numeric"
                    />
                  </>
                )}
              </>
            )}
            <Button
              label={isEditing ? 'Salvar' : 'Adicionar'}
              loading={isPending}
              onPress={handleSubmit}
              size="lg"
            />
          </>
        )}
      </ScrollView>
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
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
    flexBasis: '46%',
  },
  typeBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  typeText: { flex: 1, minWidth: 0 },
  typeLabel: { color: colors.ink, fontFamily: fonts.sansSemiBold, fontSize: 13 },
  typeHint: { color: colors.faint, fontFamily: fonts.sans, fontSize: 11, marginTop: 1 },
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
  hint: { color: colors.faint, fontFamily: fonts.sans, fontSize: 13 },
  resultRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  resultTitle: { color: colors.ink, fontFamily: fonts.sansSemiBold, fontSize: fontSize.sm },
  resultArtist: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs, marginTop: 1 },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentTint15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedText: { flex: 1, color: colors.accent, fontFamily: fonts.sansMedium, fontSize: 13 },
  row3: { flexDirection: 'row', gap: 10 },
  rowItem: { flex: 1 },
});
