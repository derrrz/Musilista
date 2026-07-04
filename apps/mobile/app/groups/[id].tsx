import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  SectionList,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge, EventTypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import {
  useGroup,
  useGroupEvents,
  useGroupMembers,
  useGroupRepertoires,
  useConfirmAttendance,
  useShareEvent,
  useRevokeShare,
} from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { GroupEvent, Member, RepertoireSong } from '@/types';

const TABS = [
  { key: 'repertorio', label: 'Repertório' },
  { key: 'membros', label: 'Membros' },
  { key: 'agenda', label: 'Agenda' },
];

function SongItem({ song }: { song: RepertoireSong }) {
  return (
    <View style={styles.row}>
      <View style={styles.keyBadge}>
        <Text style={styles.keyText}>{song.key ?? '?'}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>{song.title}</Text>
        {song.artist ? (
          <Text style={styles.rowSub} numberOfLines={1}>{song.artist}</Text>
        ) : null}
      </View>
    </View>
  );
}

function MemberItem({ member }: { member: Member }) {
  return (
    <View style={styles.row}>
      <Avatar name={member.name} url={member.avatarUrl} size={40} shape="circle" />
      <View style={styles.rowText}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>{member.name}</Text>
          <RoleBadge role={member.role} />
        </View>
        <Text style={styles.rowSub}>{member.email}</Text>
      </View>
      {member.available && <View style={styles.availableDot} />}
    </View>
  );
}

const APP_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://musilista.vercel.app';

function EventItem({
  event,
  groupId,
  myRole,
}: {
  event: GroupEvent;
  groupId: string;
  myRole: 'DONO' | 'ADMIN' | 'MEMBRO';
}) {
  const { mutate: confirm, isPending: confirming } = useConfirmAttendance(groupId, event.id);
  const { mutate: share, isPending: sharing } = useShareEvent(groupId, event.id);
  const { mutate: revoke, isPending: revoking } = useRevokeShare(groupId, event.id);

  const canManage = myRole !== 'MEMBRO';

  function handleConfirm() {
    confirm(undefined, {
      onError: (e) => Alert.alert('Erro', e.message),
    });
  }

  function handleShare() {
    if (event.publicToken) {
      const url = `${APP_URL}/agenda/${event.publicToken}`;
      Share.share({ title: event.title, url });
      return;
    }
    share(undefined, {
      onSuccess: (data) => Share.share({ title: event.title, url: data.url }),
      onError: (e) => Alert.alert('Erro', e.message),
    });
  }

  function handleRevoke() {
    Alert.alert(
      'Revogar link',
      'O link público deixará de funcionar. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revogar',
          style: 'destructive',
          onPress: () =>
            revoke(undefined, {
              onError: (e) => Alert.alert('Erro', e.message),
            }),
        },
      ],
    );
  }

  // event.date vem como "YYYY-MM-DD"; new Date(string) trataria como UTC
  // e exibiria o dia anterior em fusos negativos
  const [y, m, d] = event.date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dateStr = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={styles.eventMeta}>
          <EventTypeBadge type={event.type} />
          <Text style={styles.eventDate}>{dateStr}</Text>
        </View>
        {!event.attendanceConfirmed && (
          <Button
            label={confirming ? '...' : 'Confirmar'}
            size="sm"
            onPress={handleConfirm}
            loading={confirming}
          />
        )}
        {event.attendanceConfirmed && (
          <Text style={styles.confirmedText}>✓ Confirmado</Text>
        )}
      </View>
      <Text style={styles.eventTitle}>{event.title}</Text>
      {event.description ? (
        <Text style={styles.eventDesc}>{event.description}</Text>
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
      {canManage && (
        <View style={styles.shareRow}>
          <TouchableOpacity
            style={[styles.shareBtn, event.publicToken && styles.shareBtnActive]}
            onPress={handleShare}
            disabled={sharing || revoking}
          >
            <Text style={[styles.shareBtnText, event.publicToken && styles.shareBtnTextActive]}>
              {sharing ? 'Gerando...' : event.publicToken ? '🔗 Compartilhar link' : 'Compartilhar'}
            </Text>
          </TouchableOpacity>
          {event.publicToken && (
            <TouchableOpacity onPress={handleRevoke} disabled={revoking} style={styles.revokeBtn}>
              <Text style={styles.revokeBtnText}>{revoking ? '...' : 'Revogar'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('repertorio');

  const { data: group, isLoading: loadingGroup } = useGroup(id);
  const {
    data: repertoires,
    isLoading: loadingSongs,
    refetch: refetchSongs,
  } = useGroupRepertoires(id);
  const { data: members, isLoading: loadingMembers, refetch: refetchMembers } = useGroupMembers(id);
  const { data: events, isLoading: loadingEvents, refetch: refetchEvents } = useGroupEvents(id);

  const repertoireSections = (repertoires ?? []).map((r) => ({
    title: r.name,
    data: r.songs,
  }));

  async function copyCode() {
    if (!group?.inviteCode) return;
    await Clipboard.setStringAsync(group.inviteCode);
    Alert.alert('Copiado!', `Código ${group.inviteCode} copiado.`);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Avatar name={group?.name} size={40} shape="square" />
        <View style={styles.headerInfo}>
          <Text style={styles.groupName} numberOfLines={1}>{group?.name}</Text>
          <View style={styles.headerMeta}>
            {group && <RoleBadge role={group.myRole} />}
            {group?.inviteCode && (
              <TouchableOpacity onPress={copyCode}>
                <Text style={styles.code}>{group.inviteCode}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <SegmentedTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </View>

      {/* Content */}
      {activeTab === 'repertorio' && (
        <SectionList
          sections={repertoireSections}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SongItem song={item} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.repertoireHeader}>{section.title}</Text>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            group?.myRole !== 'MEMBRO' ? (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  router.push({ pathname: '/(modals)/buscar-musica', params: { groupId: id } })
                }
              >
                <Text style={styles.addBtnText}>+ Adicionar música</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            loadingSongs ? (
              <SkeletonSongRow />
            ) : (
              <EmptyState
                icon="🎵"
                title="Sem repertórios"
                description="Adicione uma música para criar o primeiro repertório"
              />
            )
          }
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetchSongs} tintColor={colors.accent} />
          }
        />
      )}

      {activeTab === 'membros' && (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MemberItem member={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loadingMembers ? <SkeletonSongRow /> : <EmptyState icon="👤" title="Sem membros" />
          }
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetchMembers} tintColor={colors.accent} />
          }
        />
      )}

      {activeTab === 'agenda' && (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetchEvents} tintColor={colors.accent} />
          }
        >
          {group?.myRole !== 'MEMBRO' && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                router.push({ pathname: '/(modals)/novo-evento', params: { groupId: id } })
              }
            >
              <Text style={styles.addBtnText}>+ Criar evento</Text>
            </TouchableOpacity>
          )}
          {loadingEvents ? (
            <SkeletonSongRow />
          ) : (events ?? []).length === 0 ? (
            <EmptyState icon="📅" title="Sem eventos" description="Crie um ensaio ou show" />
          ) : (
            (events ?? []).map((ev) => (
              <EventItem key={ev.id} event={ev} groupId={id} myRole={group?.myRole ?? 'MEMBRO'} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { padding: 6 },
  backIcon: { color: colors.accent, fontSize: 20, fontFamily: fonts.sansBold },
  headerInfo: { flex: 1 },
  groupName: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.base },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  code: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabsContainer: { padding: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  rowText: { flex: 1 },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  repertoireHeader: {
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingTop: 16,
    paddingBottom: 6,
  },
  rowTitle: { color: colors.ink, fontFamily: fonts.sansMedium, fontSize: 15 },
  rowSub: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm, marginTop: 2 },
  keyBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { color: colors.accent, fontFamily: fonts.monoBold, fontSize: fontSize.sm },
  addBtn: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  addBtnText: { color: colors.accent, fontFamily: fonts.sansSemiBold, fontSize: fontSize.sm },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventDate: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  eventTitle: { color: colors.ink, fontFamily: fonts.sansSemiBold, fontSize: fontSize.base },
  eventDesc: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.sm },
  confirmedText: { color: colors.success, fontFamily: fonts.sansSemiBold, fontSize: fontSize.sm },
  roles: { gap: 4 },
  roleItem: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  shareBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  shareBtnActive: { borderColor: colors.accent },
  shareBtnText: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: fontSize.xs },
  shareBtnTextActive: { color: colors.accent },
  revokeBtn: { paddingVertical: 7, paddingHorizontal: 10 },
  revokeBtnText: { color: colors.muted, fontFamily: fonts.sans, fontSize: fontSize.xs },
});
