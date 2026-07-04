import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { useSession } from '@/context/SessionContext';
import { useGroups } from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize, fontWeight } from '@/constants/typography';
import type { Group } from '@/types';

function GroupRow({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={group.name} url={group.imageUrl} size={44} shape="square" />
      <View style={styles.rowText}>
        <View style={styles.rowHeader}>
          <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
          <RoleBadge role={group.myRole} />
        </View>
        <Text style={styles.meta}>
          {group.songCount ?? 0} músicas · {group.memberCount ?? 0} membros
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function GruposScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { data: groups, isLoading, refetch, isRefetching } = useGroups(Boolean(session));

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.heading}>Grupos</Text>
        </View>
        <EmptyState
          icon="👥"
          title="Entre para ver seus grupos"
          description="Grupos, repertórios e agenda ficam salvos na sua conta"
          actionLabel="Entrar"
          onAction={() => router.push('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Grupos</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(modals)/novo-grupo')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>+ Novo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.outlineBtn]}
            onPress={() => router.push('/(modals)/entrar-codigo')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, styles.outlineBtnText]}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          <SkeletonSongRow />
          <SkeletonSongRow />
          <SkeletonSongRow />
        </View>
      ) : (groups ?? []).length === 0 ? (
        <EmptyState
          icon="👥"
          title="Nenhum grupo"
          description="Crie ou entre em um grupo para compartilhar repertórios"
          actionLabel="Criar grupo"
          onAction={() => router.push('/(modals)/novo-grupo')}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <GroupRow group={item} onPress={() => router.push(`/groups/${item.id}`)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  heading: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: fontSize['2xl'],
  },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionBtnText: {
    color: colors.accentInk,
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  outlineBtnText: { color: colors.ink },
  list: { paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowText: { flex: 1 },
  name: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
  },
  meta: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
  separator: { height: 1, backgroundColor: colors.line },
});
