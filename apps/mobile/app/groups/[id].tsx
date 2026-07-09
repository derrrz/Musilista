import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReferencesPanel } from '@/components/groups/ReferencesPanel';
import { SetlistPanel } from '@/components/groups/SetlistPanel';
import { Avatar } from '@/components/ui/Avatar';
import { EventTypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconBack,
  IconCheck,
  IconClose,
  IconEdit,
  IconPin,
  IconWarning,
} from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { Eyebrow } from '@/components/ui/Typography';
import { useSession } from '@/context/SessionContext';
import {
  useConfirmAttendance,
  useDeleteEvent,
  useGroup,
  useGroupEvents,
  useGroupMembers,
  useGroupRepertoires,
  useRevokeShare,
  useShareEvent,
  useUpdateGroup,
} from '@/hooks/useGroups';
import { BASE_URL } from '@/lib/api';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { GroupEvent, Member } from '@/types';

const SECTIONS = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'setlists', label: 'Setlists' },
  { key: 'referencias', label: 'Referências' },
  { key: 'membros', label: 'Membros' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

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
        <View>
          <Text style={styles.eventSectionLabel}>Repertórios</Text>
          <Chip label={event.setlistName} pill mono />
        </View>
      ) : null}

      {event.roles.length > 0 && (
        <View style={styles.roles}>
          <Text style={styles.eventSectionLabel}>Funções</Text>
          {event.roles.map((role) => (
            <Text key={role.id} style={styles.roleItem}>
              {role.label}: {role.assigneeName ?? '—'}
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
      <RoleLabel role={member.role} />
    </View>
  );
}

function RoleLabel({ role }: { role: Member['role'] }) {
  const cfg = {
    DONO: { bg: colors.accentTint15, text: colors.accent, label: 'Dono' },
    ADMIN: { bg: colors.blueTint15, text: colors.blue400, label: 'Admin' },
    MEMBRO: { bg: colors.mutedTint15, text: colors.muted, label: 'Membro' },
  }[role];
  return (
    <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.roleBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const [copied, setCopied] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<SectionKey, number>>({
    agenda: 0,
    setlists: 0,
    referencias: 0,
    membros: 0,
  });

  const { data: group, isLoading: loadingGroup, refetch: refetchGroup } = useGroup(id);
  const { data: repertoires, isLoading: loadingSetlists, refetch: refetchSetlists } =
    useGroupRepertoires(id);
  const { data: members, isLoading: loadingMembers, refetch: refetchMembers } =
    useGroupMembers(id);
  const { data: events, isLoading: loadingEvents, refetch: refetchEvents } =
    useGroupEvents(id);
  const { mutate: updateGroup, isPending: savingGroup } = useUpdateGroup(id);

  const canManage = Boolean(group && group.myRole !== 'MEMBRO');

  async function copyCode() {
    if (!group?.inviteCode) return;
    await Clipboard.setStringAsync(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function scrollToSection(key: SectionKey) {
    scrollRef.current?.scrollTo({ y: sectionY.current[key] - 44, animated: true });
  }

  function openEditGroup() {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description ?? '');
    setEditingGroup(true);
  }

  function saveGroup() {
    if (!editName.trim()) {
      Alert.alert('Nome obrigatório', 'O grupo precisa de um nome.');
      return;
    }
    updateGroup(
      { name: editName.trim(), description: editDescription.trim() || null },
      {
        onSuccess: () => setEditingGroup(false),
        onError: (e) => Alert.alert('Erro', e.message),
      },
    );
  }

  function refetchAll() {
    refetchGroup();
    refetchSetlists();
    refetchMembers();
    refetchEvents();
  }

  if (loadingGroup) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <SkeletonSongRow />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetchAll} tintColor={colors.accent} />
        }
      >
        {/* [0] Hero */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backRow}>
            <IconBack size={12} color={colors.muted} />
            <Text style={styles.backLink}>Grupos</Text>
          </TouchableOpacity>

          <View style={styles.heroRow}>
            <Avatar name={group?.name} url={group?.imageUrl} size={48} shape="square" />
            <View style={styles.heroInfo}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroName}>{group?.name}</Text>
                {canManage && (
                  <TouchableOpacity onPress={openEditGroup} hitSlop={8} style={styles.heroEditBtn}>
                    <IconEdit size={16} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
              {group?.description ? (
                <Text style={styles.heroDesc}>{group.description}</Text>
              ) : null}
              <Text style={styles.heroMeta}>
                {group?.memberCount ?? 0} {group?.memberCount === 1 ? 'membro' : 'membros'}
              </Text>
            </View>
          </View>

          {group?.inviteCode && (
            <View style={styles.codeBox}>
              <Eyebrow>Código de convite</Eyebrow>
              <TouchableOpacity onPress={copyCode} activeOpacity={0.7} style={styles.codeBtn}>
                <Text style={styles.code}>{copied ? 'copiado' : group.inviteCode}</Text>
                {copied && <IconCheck size={13} color={colors.accent} />}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* [1] Navegação âncora (sticky) */}
        <View style={styles.anchorNav}>
          {SECTIONS.map((s) => (
            <TouchableOpacity key={s.key} onPress={() => scrollToSection(s.key)} hitSlop={4}>
              <Text style={styles.anchorLink}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* [2] Seções */}
        <View style={styles.sections}>
          {/* Agenda */}
          <View
            style={styles.section}
            onLayout={(e) => {
              sectionY.current.agenda = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Agenda</Text>
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
              <EmptyState icon="📅" title="Nenhum evento agendado" />
            ) : (
              (events ?? []).map((ev) => (
                <EventCard key={ev.id} event={ev} groupId={id} canManage={canManage} />
              ))
            )}
          </View>

          {/* Setlists */}
          <View
            style={styles.section}
            onLayout={(e) => {
              sectionY.current.setlists = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionTitle}>Setlists</Text>
            <SetlistPanel
              groupId={id}
              repertoires={repertoires ?? []}
              loading={loadingSetlists}
              canManage={canManage}
            />
          </View>

          {/* Referências */}
          <View
            style={styles.section}
            onLayout={(e) => {
              sectionY.current.referencias = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionTitle}>Referências da banda</Text>
            <ReferencesPanel groupId={id} myUserId={session?.user.id} canManage={canManage} />
          </View>

          {/* Membros */}
          <View
            style={styles.section}
            onLayout={(e) => {
              sectionY.current.membros = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionTitle}>Membros</Text>
            {loadingMembers ? (
              <SkeletonSongRow />
            ) : (members ?? []).length === 0 ? (
              <EmptyState icon="👤" title="Sem membros" />
            ) : (
              (members ?? []).map((m) => <MemberCard key={m.id} member={m} />)
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal de edição do grupo (nome/descrição) — só dono/admin */}
      <Modal visible={editingGroup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>Editar grupo</Text>
            <Input label="Nome" value={editName} onChangeText={(t) => setEditName(t.slice(0, 80))} />
            <Input
              label="Descrição"
              value={editDescription}
              onChangeText={(t) => setEditDescription(t.slice(0, 280))}
              placeholder="O que é esse grupo? Estilo, propósito, vibe…"
              textarea
            />
            <View style={styles.modalActions}>
              <Button
                label="Cancelar"
                variant="outline"
                onPress={() => setEditingGroup(false)}
                style={styles.modalBtn}
              />
              <Button
                label="Salvar"
                loading={savingGroup}
                onPress={saveGroup}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Hero
  hero: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 14 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backLink: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroInfo: { flex: 1, minWidth: 0 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  heroName: {
    flexShrink: 1,
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  heroEditBtn: { marginTop: 8 },
  heroDesc: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 6,
  },
  heroMeta: { color: colors.faint, fontFamily: fonts.mono, fontSize: fontSize.xs, marginTop: 8 },
  codeBox: { gap: 2 },
  codeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  code: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: 15 },

  // Anchor nav
  anchorNav: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  anchorLink: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },

  // Sections
  sections: { padding: 16, gap: 36, paddingBottom: 64 },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.xl },

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
  eventSectionLabel: {
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
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
    marginBottom: 8,
  },
  memberText: { flex: 1, minWidth: 0 },
  memberName: { color: colors.ink, fontFamily: fonts.sansSemiBold, fontSize: fontSize.sm },
  memberEmail: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs, marginTop: 1 },
  availableDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.emerald500 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Modal editar grupo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalPanel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.raised,
    padding: 24,
    gap: 16,
  },
  modalTitle: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.xl },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1 },
});
