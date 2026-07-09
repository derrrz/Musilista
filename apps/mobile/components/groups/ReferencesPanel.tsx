import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { IconClose, IconPlay, IconShare } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import {
  useAddReference,
  useDeleteReference,
  useGroupReferences,
} from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { Reference } from '@/types';

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function hostLabel(url: string): string {
  const m = url.match(/^https?:\/\/(?:www\.)?([^/]+)/);
  return m ? m[1] : url;
}

function ReferenceCard({
  reference,
  canDelete,
  onDelete,
}: {
  reference: Reference;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const ytId = reference.kind === 'youtube' ? youtubeId(reference.url) : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => Linking.openURL(reference.url)} activeOpacity={0.8}>
        {ytId ? (
          <Image
            source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            {reference.kind === 'spotify' ? (
              <IconPlay size={22} color={colors.muted} />
            ) : (
              <IconShare size={20} color={colors.muted} />
            )}
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <TouchableOpacity
            style={styles.cardTitleTap}
            onPress={() => Linking.openURL(reference.url)}
          >
            <Text style={styles.cardTitle} numberOfLines={2}>
              {reference.title ?? hostLabel(reference.url)}
            </Text>
          </TouchableOpacity>
          {canDelete && (
            <TouchableOpacity onPress={onDelete} hitSlop={8}>
              <IconClose size={12} color={colors.faint} />
            </TouchableOpacity>
          )}
        </View>
        {reference.note ? (
          <Text style={styles.cardNote} numberOfLines={3}>{reference.note}</Text>
        ) : null}
        <Text style={styles.cardFooter}>
          {hostLabel(reference.url)}
          {reference.addedByName ? ` · ${reference.addedByName}` : ''}
        </Text>
      </View>
    </View>
  );
}

// Referências da banda: links que os membros adicionam (YouTube, Spotify…)
// e que vão desenhando a característica sonora do grupo.
export function ReferencesPanel({
  groupId,
  myUserId,
  canManage,
}: {
  groupId: string;
  myUserId?: string;
  canManage: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');

  const { data: references, isLoading } = useGroupReferences(groupId);
  const { mutate: addReference, isPending: adding } = useAddReference(groupId);
  const { mutate: deleteReference } = useDeleteReference(groupId);

  function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('Link obrigatório', 'Cole o link da referência (YouTube, Spotify…).');
      return;
    }
    addReference(
      { url: trimmed, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setUrl('');
          setNote('');
          setShowAdd(false);
        },
        onError: (e) => Alert.alert('Erro', e.message),
      },
    );
  }

  function handleDelete(ref: Reference) {
    Alert.alert('Remover referência', 'Remover este link do grupo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          deleteReference(ref.id, { onError: (e) => Alert.alert('Erro', e.message) }),
      },
    ]);
  }

  if (isLoading) return <SkeletonSongRow />;

  return (
    <View style={styles.panel}>
      <View style={styles.topActions}>
        <Button
          label={showAdd ? 'Cancelar' : '+ Adicionar referência'}
          size="sm"
          variant={showAdd ? 'outline' : 'primary'}
          onPress={() => setShowAdd((v) => !v)}
        />
      </View>

      {showAdd && (
        <View style={styles.addForm}>
          <Input
            label="Link"
            value={url}
            onChangeText={setUrl}
            placeholder="https://youtube.com/… ou https://open.spotify.com/…"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Input
            label="Por que essa referência? (opcional)"
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 280))}
            placeholder="Ex: vibe da bateria nesse arranjo; timbre de guitarra do refrão…"
            textarea
          />
          <Button label="Adicionar" loading={adding} onPress={handleAdd} />
        </View>
      )}

      {(references ?? []).length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nenhuma referência ainda.</Text>
          <Text style={styles.emptyHint}>
            Sons, clipes e artistas que definem a cara do grupo — qualquer membro pode adicionar.
          </Text>
        </View>
      ) : (
        (references ?? []).map((r) => (
          <ReferenceCard
            key={r.id}
            reference={r}
            canDelete={r.addedBy === myUserId || canManage}
            onDelete={() => handleDelete(r)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  topActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  addForm: {
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface60,
    padding: 16,
  },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  emptyHint: {
    color: colors.faint,
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.raised,
    overflow: 'hidden',
  },
  thumb: { width: '100%', aspectRatio: 16 / 9 },
  thumbPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 12, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitleTap: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.ink, fontFamily: fonts.sansSemiBold, fontSize: 13 },
  cardNote: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  cardFooter: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 4,
  },
});
