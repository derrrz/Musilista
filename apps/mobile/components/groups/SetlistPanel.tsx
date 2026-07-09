import { useRouter } from 'expo-router';
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
import { Button } from '@/components/ui/Button';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconDocument,
  IconEdit,
  IconGroups,
  IconGuitar,
  IconHeart,
  IconMenu,
  IconMic,
  IconPause,
  IconPlay,
  IconScreen,
  IconSettings,
} from '@/components/ui/icons';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import {
  parseArtist,
  useCreateRepertoire,
  useDeleteRepertoire,
  useRemoveBlock,
  useRenameRepertoire,
  useReorderBlocks,
} from '@/hooks/useGroups';
import { blockDef, formatDuration, type BlockType } from '@/lib/setlistBlocks';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { IconProps } from '@/components/ui/icons';
import type { Repertoire, SetlistBlock } from '@/types';

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

// Ações do bloco (subir/descer/editar/remover) — na web aparecem no hover;
// no touch precisam estar sempre visíveis.
function BlockActions({
  index,
  total,
  onMove,
  onEdit,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.blockActions}>
      <TouchableOpacity onPress={() => onMove(-1)} disabled={index === 0} hitSlop={6} style={styles.blockActionBtn}>
        <IconChevronUp size={12} color={index === 0 ? colors.line : colors.faint} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onMove(1)} disabled={index === total - 1} hitSlop={6} style={styles.blockActionBtn}>
        <IconChevronDown size={12} color={index === total - 1 ? colors.line : colors.faint} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onEdit} hitSlop={6} style={styles.blockActionBtn}>
        <IconEdit size={12} color={colors.faint} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} hitSlop={6} style={styles.blockActionBtn}>
        <IconClose size={12} color={colors.red400} />
      </TouchableOpacity>
    </View>
  );
}

export function SetlistPanel({
  groupId,
  repertoires,
  loading,
  canManage,
}: {
  groupId: string;
  repertoires: Repertoire[];
  loading: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const { mutate: createRepertoire, isPending: creating } = useCreateRepertoire(groupId);
  const { mutate: renameRepertoire, isPending: renamingPending } = useRenameRepertoire(groupId);
  const { mutate: deleteRepertoire } = useDeleteRepertoire(groupId);
  const { mutate: removeBlock } = useRemoveBlock(groupId);
  const { mutate: reorderBlocks } = useReorderBlocks(groupId);

  const active = repertoires.find((r) => r.id === activeId) ?? repertoires[0] ?? null;
  const blocks = active?.songs ?? [];
  const songCount = blocks.filter((b) => (b.itemType ?? 'song') === 'song').length;
  const totalSec = blocks.reduce((acc, b) => acc + (b.durationSec ?? 0), 0);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createRepertoire(name, {
      onSuccess: (created) => {
        setNewName('');
        setShowNew(false);
        setActiveId(created.id);
      },
      onError: (e) => Alert.alert('Erro', e.message),
    });
  }

  function handleRename() {
    const name = renameValue.trim();
    if (!name || !active) return;
    renameRepertoire(
      { repertoireId: active.id, name },
      {
        onSuccess: () => setRenaming(false),
        onError: (e) => Alert.alert('Erro', e.message),
      },
    );
  }

  function handleDelete() {
    if (!active) return;
    Alert.alert('Remover setlist', `Remover "${active.name}" e todo o roteiro?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          deleteRepertoire(active.id, {
            onSuccess: () => setActiveId(null),
            onError: (e) => Alert.alert('Erro', e.message),
          }),
      },
    ]);
  }

  function handleRemoveBlock(block: SetlistBlock) {
    if (!active) return;
    Alert.alert('Remover bloco', `Remover "${block.title ?? 'bloco'}" do roteiro?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          removeBlock(
            { repertoireId: active.id, songItemId: block.id },
            { onError: (e) => Alert.alert('Erro', e.message) },
          ),
      },
    ]);
  }

  function moveBlock(index: number, dir: -1 | 1) {
    if (!active) return;
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const reordered = [...blocks];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderBlocks(
      { repertoireId: active.id, orderedIds: reordered.map((b) => b.id) },
      { onError: (e) => Alert.alert('Erro', e.message) },
    );
  }

  function openBlockModal(block?: SetlistBlock) {
    if (!active) return;
    router.push({
      pathname: '/(modals)/bloco-setlist',
      params: {
        groupId,
        repertoireId: active.id,
        ...(block ? { blockId: block.id } : {}),
      },
    });
  }

  if (loading) return <SkeletonSongRow />;

  if (repertoires.length === 0 && !showNew) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Nenhum setlist ainda</Text>
        {canManage ? (
          <>
            <Text style={styles.emptyHint}>
              Um setlist é o roteiro do show: músicas, falas, interações…
            </Text>
            <Button label="+ Novo Setlist" size="sm" onPress={() => setShowNew(true)} style={styles.emptyBtn} />
          </>
        ) : (
          <Text style={styles.emptyHint}>Os administradores ainda não criaram setlists</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      {canManage && (
        <View style={styles.topActions}>
          <Button
            label={showNew ? 'Cancelar' : '+ Novo Setlist'}
            size="sm"
            variant={showNew ? 'outline' : 'primary'}
            onPress={() => setShowNew((v) => !v)}
          />
        </View>
      )}

      {showNew && (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.inlineInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome do setlist (ex: Show Acústico · Verão 2026)"
            placeholderTextColor={colors.faint}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <Button label="Criar" size="sm" loading={creating} onPress={handleCreate} />
        </View>
      )}

      {/* Seletor de setlists (a sidebar de 200px da web vira fileira de chips) */}
      {repertoires.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.setlistChips}>
            {repertoires.map((r) => {
              const isActive = active?.id === r.id;
              const n = r.songs.filter((b) => (b.itemType ?? 'song') === 'song').length;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.setlistChip, isActive && styles.setlistChipActive]}
                  onPress={() => setActiveId(r.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.setlistChipName, isActive && styles.setlistChipNameActive]}>
                    {r.name}
                  </Text>
                  <Text style={styles.setlistChipCount}>
                    {n} {n === 1 ? 'música' : 'músicas'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {active && (
        <View style={styles.detail}>
          {/* Cabeçalho do setlist ativo */}
          {renaming ? (
            <View style={styles.inlineForm}>
              <TextInput
                style={styles.inlineInput}
                value={renameValue}
                onChangeText={setRenameValue}
                autoFocus
                onSubmitEditing={handleRename}
              />
              <TouchableOpacity onPress={handleRename} disabled={renamingPending} style={styles.iconBtn} hitSlop={6}>
                <IconCheck size={14} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRenaming(false)} style={styles.iconBtn} hitSlop={6}>
                <IconClose size={14} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailHeader}>
              <View style={styles.detailTitle}>
                <Text style={styles.detailName} numberOfLines={1}>{active.name}</Text>
                {canManage && (
                  <TouchableOpacity
                    onPress={() => {
                      setRenaming(true);
                      setRenameValue(active.name);
                    }}
                    hitSlop={8}
                  >
                    <IconEdit size={13} color={colors.faint} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.detailActions}>
                <Button label="+ Bloco" size="sm" onPress={() => openBlockModal()} />
                {canManage && (
                  <Button label="Excluir" size="sm" variant="outline" onPress={handleDelete} />
                )}
              </View>
            </View>
          )}

          {/* Blocos do roteiro */}
          {blocks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyHint}>
                Roteiro vazio. Adicione blocos: músicas, falas, interações, improvisos…
              </Text>
            </View>
          ) : (
            blocks.map((block, i) => {
              const def = blockDef(block.itemType);
              const Icon = BLOCK_ICON[def.type];
              const songNumber = blocks
                .slice(0, i + 1)
                .filter((b) => (b.itemType ?? 'song') === 'song').length;
              const artist = def.type === 'song' ? parseArtist(block.notes) : undefined;

              if (def.type === 'section') {
                return (
                  <View key={block.id} style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{block.title}</Text>
                    <View style={styles.sectionLine} />
                    <BlockActions
                      index={i}
                      total={blocks.length}
                      onMove={(d) => moveBlock(i, d)}
                      onEdit={() => openBlockModal(block)}
                      onRemove={() => handleRemoveBlock(block)}
                    />
                  </View>
                );
              }

              return (
                <View key={block.id}>
                  <View style={styles.blockRow}>
                    <View style={[styles.blockBadge, { backgroundColor: def.badge.bg }]}>
                      {def.type === 'song' ? (
                        <Text style={[styles.blockBadgeNumber, { color: def.badge.text }]}>
                          {songNumber}
                        </Text>
                      ) : (
                        <Icon size={13} color={def.badge.text} />
                      )}
                    </View>
                    <View style={styles.blockText}>
                      <View style={styles.blockTitleRow}>
                        <Text style={styles.blockTitle} numberOfLines={1}>{block.title}</Text>
                        {def.type !== 'song' && (
                          <Text style={styles.blockTypeLabel}>{def.label}</Text>
                        )}
                      </View>
                      {artist ? (
                        <Text style={styles.blockSub} numberOfLines={1}>{artist}</Text>
                      ) : null}
                      {def.type !== 'song' && block.body ? (
                        <Text style={styles.blockSub} numberOfLines={2}>{block.body}</Text>
                      ) : null}
                      <View style={styles.blockMeta}>
                        {block.songKey ? (
                          <View style={styles.keyBadge}>
                            <Text style={styles.keyText}>{block.songKey}</Text>
                          </View>
                        ) : null}
                        {block.bpm ? <Text style={styles.metaMono}>{block.bpm} bpm</Text> : null}
                        {block.durationSec ? (
                          <Text style={styles.metaMono}>{formatDuration(block.durationSec)}</Text>
                        ) : null}
                      </View>
                    </View>
                    <BlockActions
                      index={i}
                      total={blocks.length}
                      onMove={(d) => moveBlock(i, d)}
                      onEdit={() => openBlockModal(block)}
                      onRemove={() => handleRemoveBlock(block)}
                    />
                  </View>
                  {block.segue && i < blocks.length - 1 ? (
                    <Text style={styles.segue}>↓ emenda</Text>
                  ) : null}
                </View>
              );
            })
          )}

          {blocks.length > 0 && (
            <Text style={styles.footer}>
              {songCount} {songCount === 1 ? 'música' : 'músicas'}
              {totalSec > 0 ? ` · duração ~${formatDuration(totalSec)}` : ''}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  topActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  inlineForm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineInput: {
    flex: 1,
    height: 36,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: fontSize.sm,
  },
  iconBtn: { padding: 8 },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
  emptyHint: {
    color: colors.faint,
    fontFamily: fonts.sans,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyBtn: { marginTop: 8 },
  setlistChips: { flexDirection: 'row', gap: 8 },
  setlistChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 200,
  },
  setlistChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint15,
  },
  setlistChipName: { color: colors.muted, fontFamily: fonts.sansSemiBold, fontSize: 13 },
  setlistChipNameActive: { color: colors.accent },
  setlistChipCount: { color: colors.faint, fontFamily: fonts.mono, fontSize: 11, marginTop: 1 },
  detail: { gap: 10 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  detailName: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: 15, flexShrink: 1 },
  detailActions: { flexDirection: 'row', gap: 8 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 2,
  },
  sectionLabel: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.line },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.raised,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  blockBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBadgeNumber: { fontFamily: fonts.monoBold, fontSize: 11 },
  blockText: { flex: 1, minWidth: 0, gap: 2 },
  blockTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  blockTitle: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  blockTypeLabel: {
    color: colors.faint,
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  blockSub: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs },
  blockMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  keyBadge: {
    borderRadius: 6,
    backgroundColor: colors.blueTint15,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  keyText: { color: colors.blue400, fontFamily: fonts.monoBold, fontSize: 11 },
  metaMono: { color: colors.faint, fontFamily: fonts.mono, fontSize: 11 },
  segue: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingLeft: 24,
    marginBottom: 6,
  },
  blockActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  blockActionBtn: { padding: 4 },
  footer: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 11,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    marginTop: 4,
  },
});
