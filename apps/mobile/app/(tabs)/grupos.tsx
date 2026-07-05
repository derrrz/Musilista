import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { Eyebrow, PageTitle } from '@/components/ui/Typography';
import { useSession } from '@/context/SessionContext';
import { useGroups } from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { Group } from '@/types';

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Avatar name={group.name} url={group.imageUrl} size={44} shape="square" />
        <RoleBadge role={group.myRole} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
      {group.description ? (
        <Text style={styles.desc} numberOfLines={2}>{group.description}</Text>
      ) : null}
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>
          {group.memberCount ?? 0} {group.memberCount === 1 ? 'membro' : 'membros'}
        </Text>
        {group.inviteCode ? <Text style={styles.code}>{group.inviteCode}</Text> : null}
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
          <View style={styles.headerText}>
            <Eyebrow>Grupos · bandas e corais</Eyebrow>
            <PageTitle>Meus Grupos</PageTitle>
          </View>
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
        <View style={styles.headerText}>
          <Eyebrow>Grupos · bandas e corais</Eyebrow>
          <PageTitle>Meus Grupos</PageTitle>
        </View>
        <View style={styles.actions}>
          <Button
            label="Entrar com código"
            variant="outline"
            size="sm"
            onPress={() => router.push('/(modals)/entrar-codigo')}
          />
          <Button
            label="+ Novo Grupo"
            size="sm"
            onPress={() => router.push('/(modals)/novo-grupo')}
          />
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
            <GroupCard group={item} onPress={() => router.push(`/groups/${item.id}`)} />
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  headerText: { gap: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.raised,
    padding: 20,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  desc: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  meta: {
    color: colors.faint,
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
  },
  code: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
});
