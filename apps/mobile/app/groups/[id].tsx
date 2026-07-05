import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { EventTypeBadge, RoleBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconCheck,
  IconClose,
  IconEdit,
  IconPin,
  IconPlus,
  IconWarning,
} from '@/components/ui/icons';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { Eyebrow, PageTitle } from '@/components/ui/Typography';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import {
  useConfirmAttendance,
  useCreateRepertoire,
  useDeleteEvent,
  useDeleteRepertoire,
  useGroup,
  useGroupEvents,
  useGroupMembers,
  useGroupRepertoires,
  useRemoveSongFromRepertoire,
  useRevokeShare,
  useShareEvent,
} from '@/hooks/useGroups';
import { BASE_URL } from '@/lib/api';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { GroupEvent, Member, Repertoire } from '@/types';

const TABS = [
  { key: 'repertorio', label: 'Repertório' },
  { key: 'membros', label: 'Membros' },
  { key: 'agenda', label: 'Agenda' },
];

// ─── Agenda ───────────────────────────────────────────────────────────────────

function formatEventDate(event: GroupEvent): string {
  // event.date vem como "YYYY-MM-DD"; new Date(string) trataria como UTC
  // e exibiria o dia anterior em fusos negativos
  const [y, m, d] = event.date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dateStr = date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return event.time ? `${dateStr} às ${event.time.slice(0, 5)}` : dateStr;
}

function EventCard({
  event,
  groupId,
  canManage,
}: {
  event: GroupEvent;
  groupId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const { mutate: confirm, isPending: confirming } = useConfirmAttendance(groupId, event.id);
  const { mutate: share, isPending: sharing } = useShareEvent(groupId, event.id);
  const { mutate: revoke, isPending: revoking } = useRevokeShare(groupId, event.id);
  const { mutate: deleteEvent, isPending: deleting } = useDeleteEvent(groupId);

  function handleShare() {
    if (event.publicToken) {
      Share.share({ title: event.title, url: `${BASE_URL}/agenda/${event.publicToken}` });
      return;
    }
    share(undefined, {
      onSuccess: (data) => Share.share({ title: event.title, url: data.url }),
      onError: (e) => Alert.alert('Erro', e.message),
    });
  }

  function handleRevoke() {
    Alert.alert('Revogar link', 'O link público deixará de funcionar. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revogar',
        style: 'destructive',
        onPress: () => revoke(undefined, { onError: (e) => Alert.alert('Erro', e.message) }),
      },
    ]);
  }

  function handleDelete() {
    Alert.alert('Excluir evento', `Excluir "${event.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          deleteEvent(event.id, { onError: (e) => Alert.alert('Erro', e.message) }),
      },
    ]);
  }

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={styles.eventMeta}>
          <EventTypeBadge type={event.type} />
          <Text style={styles.eventDate}>{formatEventDate(event)}</Text>
        </View>
        {canManage && (
          <View style={styles.eventActions}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(modals)/editar-evento',
                  params: { groupId, eventId: event.id },
                })
              }
              hitSlop={8}
              style={styles.eventActionBtn}
            >
              <IconEdit size={14} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              hitSlop={8}
              style={styles.eventActionBtn}
            >
              <IconClose size={14} color={colors.red400} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.eventTitle}>{event.title}</Text>

      {event.location ? (
        <View style={styles.eventLocation}>
          <IconPin size={12} color={colors.muted} />
          <Text style={styles.eventLocationText}>{event.location}</Text>
        </View>
      ) : null}

      {event.description ? (
        <View style={styles.noticeBox}>
          <IconWarning size={14} color={colors.amber400} />
          <Text style={styles.noticeText}>{event.description}</Text>
        </View>
      ) : null}

      {event.setlistName ? (
        <Chip label={event.setlistName} pill mono />
      ) : null}

      {event.roles.length > 0 && (
        <View style={styles.roles}>
          {event.roles.map((role) => (
            <Text key={role.id} style={styles.roleItem}>
              {role.label}
              {role.assigneeName ? `: ${role.assigneeName}` : ''}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.eventFooter}>
        {event.attendanceConfirmed ? (
          <View style={styles.confirmedRow}>
            <IconCheck size={14} color={colors.emerald500} />
            <Text style={styles.confirmedText}>Presença confirmada</Text>
          </View>
        ) : (
          <Button
            label="Confirmar presença"
            size="sm"
            variant="outline"
            loading={confirming}
            onPress={() =>
              confirm(undefined, { onError: (e) => Alert.alert('Erro', e.message) })
            }
          />
        )}
        {canManage && (
          <View style={styles.shareRow}>
            <Button
              label={event.publicToken ? 'Compartilhar link' : 'Gerar link público'}
              size="sm"
              variant="ghost"
              loading={sharing}
              onPress={handleShare}
            />
            {event.publicToken && (
              <Button
                label="Revogar"
                size="sm"
                variant="ghost"
                loading={revoking}
                onPress={handleRevoke}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Membros ──────────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: Member }) {
  return (
    <View style={styles.memberCard}>
      <Avatar name={member.name} url={member.avatarUrl} size={36} shape="circle" />
      <View style={styles.memberText}>
        <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
        <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
      </View>
      {member.available && <View style={styles.availableDot} />}
      <RoleBadge role={member.role} />
    </View>
  );
}

// ─── Repertório ───────────────────────────────────────────────────────────────

function RepertoirePanel({
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
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const { mutate: createRepertoire, isPending: creatingPending } = useCreateRepertoire(groupId);
  const { mutate: deleteRepertoire } = useDeleteRepertoire(groupId);
  const { mutate: removeSong } = useRemoveSongFromRepertoire(groupId);

  const active =
    repertoires.find((r) => r.id === activeId) ?? repertoires[0] ?? null;

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createRepertoire(name, {
      onSuccess: (created) => {
        setNewName('');
        setCreating(false);
        setActiveId(created.id);
      },
      onError: (e) => Alert.alert('Erro', e.message),
    });
  }

  function handleDeleteRepertoire(rep: Repertoire) {
    Alert.alert('Excluir repertório', `Excluir "${rep.name}" e suas músicas?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          deleteRepertoire(rep.id, { onError: (e) => Alert.alert('Erro', e.message) }),
      },
    ]);
  }

  function handleRemoveSong(songItemId: string, title: string) {
    Alert.alert('Remover música', `Remover "${title}" do repertório?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          removeSong(
            { repertoireId: active!.id, songItemId },
            { onError: (e) => Alert.alert('Erro', e.message) },
          ),
      },
    ]);
  }

  if (loading) return <SkeletonSongRow />;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Eyebrow>Repertórios</Eyebrow>
        {canManage && (
          <TouchableOpacity onPress={() => setCreating((c) => !c)} hitSlop={8}>
            <Text style={styles.panelAction}>
              {creating ? 'Cancelar' : '+ Novo repertório'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {creating && (
        <View style={styles.createRow}>
          <TextInput
            style={styles.createInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome do repertório"
            placeholderTextColor={colors.faint}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <Button label="Criar" size="sm" loading={creatingPending} onPress={handleCreate} />
        </View>
      )}

      {repertoires.length === 0 ? (
        <EmptyState
          icon="🎵"
          title="Sem repertórios"
          description={
            canManage
              ? 'Crie um repertório para organizar as músicas do grupo'
              : 'Os administradores ainda não criaram repertórios'
          }
        />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.repChips}>
              {repertoires.map((r) => (
                <Chip
                  key={r.id}
                  label={`${r.name} · ${r.songs.length}`}
                  active={active?.id === r.id}
                  onPress={() => setActiveId(r.id)}
                />
              ))}
            </View>
          </ScrollView>

          {active && (
            <View style={styles.repDetail}>
              <View style={styles.panelHeader}>
                <Text style={styles.repName}>{active.name}</Text>
                {canManage && (
                  <View style={styles.repActions}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(modals)/buscar-musica',
                          params: { groupId, repertoireId: active.id },
                        })
                      }
                      hitSlop={8}
                    >
                      <Text style={styles.panelAction}>+ Música</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRepertoire(active)} hitSlop={8}>
                      <Text style={styles.panelActionDanger}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {active.songs.length === 0 ? (
                <Text style={styles.emptySongs}>Nenhuma música ainda.</Text>
              ) : (
                active.songs.map((song, i) => (
                  <View key={song.id} style={styles.songRow}>
                    <Text style={styles.songIndex}>
                      {String(i + 1).padStart(2, '0')}
                    </Text>
                    <View style={styles.songText}>
                      <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                      {song.artist ? (
                        <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
                      ) : null}
                    </View>
                    {song.key ? (
                      <View style={styles.keyBadge}>
                        <Text style={styles.keyText}>{song.key}</Text>
                      </View>
                    ) : null}
                    {song.bpm ? (
                      <Text style={styles.bpmText}>{song.bpm} bpm</Text>
                    ) : null}
                    {canManage && (
                      <TouchableOpacity
                        onPress={() => handleRemoveSong(song.id, song.title)}
                        hitSlop={8}
                      >
                        <IconClose size={13} color={colors.faint} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('agenda');
  const [copied, setCopied] = useState(false);

  const { data: group, isLoading: loadingGroup } = useGroup(id);
  const { data: repertoires, isLoading: loadingSongs, refetch: refetchSongs } =
    useGroupRepertoires(id);
  const { data: members, isLoading: loadingMembers, refetch: refetchMembers } =
    useGroupMembers(id);
  const { data: events, isLoading: loadingEvents, refetch: refetchEvents } =
    useGroupEvents(id);

  const canManage = Boolean(group && group.myRole !== 'MEMBRO');

  async function copyCode() {
    if (!group?.inviteCode) return;
    await Clipboard.setStringAsync(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function refetchActive() {
    if (activeTab === 'repertorio') refetchSongs();
    else if (activeTab === 'membros') refetchMembers();
    else refetchEvents();
  }

  if (loadingGroup) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <SkeletonSongRow />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backLink}>← Grupos</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <PageTitle numberOfLines={1}>{group?.name}</PageTitle>
            {group?.description ? (
              <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
            ) : null}
          </View>
          {group?.inviteCode && (
            <TouchableOpacity onPress={copyCode} style={styles.codeBox} activeOpacity={0.7}>
              <Eyebrow>Código de convite</Eyebrow>
              <Text style={styles.code}>{copied ? 'copiado ✓' : group.inviteCode}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <UnderlineTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetchActive} tintColor={colors.accent} />
        }
      >
        {activeTab === 'repertorio' && (
          <RepertoirePanel
            groupId={id}
            repertoires={repertoires ?? []}
            loading={loadingSongs}
            canManage={canManage}
          />
        )}

        {activeTab === 'membros' && (
          <View style={styles.panel}>
            <Eyebrow>Membros</Eyebrow>
            {loadingMembers ? (
              <SkeletonSongRow />
            ) : (members ?? []).length === 0 ? (
              <EmptyState icon="👤" title="Sem membros" />
            ) : (
              (members ?? []).map((m) => <MemberCard key={m.id} member={m} />)
            )}
          </View>
        )}

        {activeTab === 'agenda' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Eyebrow>Agenda</Eyebrow>
              {canManage && (
                <Button
                  label="+ Evento"
                  size="sm"
                  onPress={() =>
                    router.push({ pathname: '/(modals)/novo-evento', params: { groupId: id } })
                  }
                />
              )}
            </View>
            {loadingEvents ? (
              <SkeletonSongRow />
            ) : (events ?? []).length === 0 ? (
              <EmptyState icon="📅" title="Sem eventos" description="Crie um ensaio ou show" />
            ) : (
              (events ?? []).map((ev) => (
                <EventCard key={ev.id} event={ev} groupId={id} canManage={canManage} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  backLink: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerInfo: { flex: 1, minWidth: 0, gap: 2 },
  groupDesc: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  codeBox: { alignItems: 'flex-end', gap: 2, paddingTop: 6 },
  code: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: 15 },
  list: { padding: 16, paddingBottom: 48 },
  panel: { gap: 12 },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelAction: { color: colors.accent, fontFamily: fonts.sansSemiBold, fontSize: fontSize.sm },
  panelActionDanger: { color: colors.red400, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },

  // Agenda
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  eventDate: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs },
  eventActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventActionBtn: { padding: 6 },
  eventTitle: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.xl },
  eventLocation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventLocationText: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.amberBorder40,
    backgroundColor: colors.amberTint10,
    padding: 10,
  },
  noticeText: { flex: 1, color: colors.amber400, fontFamily: fonts.sans, fontSize: fontSize.sm },
  roles: { gap: 4 },
  roleItem: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs },
  eventFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    gap: 8,
  },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmedText: { color: colors.emerald500, fontFamily: fonts.sansSemiBold, fontSize: fontSize.sm },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Membros
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.raised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  memberText: { flex: 1, minWidth: 0 },
  memberName: { color: colors.ink, fontFamily: fonts.sansSemiBold, fontSize: fontSize.sm },
  memberEmail: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs, marginTop: 1 },
  availableDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.emerald500 },

  // Repertório
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createInput: {
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
  repChips: { flexDirection: 'row', gap: 8 },
  repDetail: { gap: 8 },
  repName: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.base },
  repActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  emptySongs: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  songIndex: { color: colors.faint, fontFamily: fonts.mono, fontSize: fontSize.xs, width: 22 },
  songText: { flex: 1, minWidth: 0 },
  songTitle: { color: colors.ink, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
  songArtist: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs, marginTop: 1 },
  keyBadge: {
    borderRadius: 6,
    backgroundColor: colors.blueTint15,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  keyText: { color: colors.blue400, fontFamily: fonts.monoBold, fontSize: fontSize.xs },
  bpmText: { color: colors.faint, fontFamily: fonts.mono, fontSize: fontSize.xs },
});
