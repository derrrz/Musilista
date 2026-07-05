import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconLogout } from '@/components/ui/icons';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { Eyebrow, PageTitle } from '@/components/ui/Typography';
import { useSession } from '@/context/SessionContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { Availability } from '@/types';

const BIO_MAX = 280;

const AVAILABILITY_OPTIONS: {
  key: Availability;
  label: string;
  dot: string;
  active: { border: string; bg: string; text: string };
}[] = [
  {
    key: 'available',
    label: 'Disponível',
    dot: colors.emerald500,
    active: { border: colors.emerald500, bg: 'rgba(16,185,129,0.12)', text: colors.emerald500 },
  },
  {
    key: 'busy',
    label: 'Ocupado',
    dot: colors.amber500,
    active: { border: colors.amber500, bg: 'rgba(245,158,11,0.12)', text: colors.amber500 },
  },
  {
    key: 'not_looking',
    label: 'Inativo',
    dot: colors.faint,
    active: { border: colors.faint, bg: colors.mutedTint15, text: colors.muted },
  },
];

function availabilityCfg(availability: Availability) {
  return AVAILABILITY_OPTIONS.find((o) => o.key === availability) ?? AVAILABILITY_OPTIONS[2];
}

export default function PerfilScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const { data: profile, isLoading } = useProfile(Boolean(session));
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState<Availability>('available');

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    setAvailability(profile.availability);
  }, [profile]);

  const user = session?.user;

  function handleSave() {
    updateProfile(
      { bio, availability },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => Alert.alert('Erro', e.message),
      },
    );
  }

  function handleSignOut() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Eyebrow>Perfil · músico</Eyebrow>
          <PageTitle>Perfil</PageTitle>
        </View>
        <EmptyState
          icon="👤"
          title="Entre para editar seu perfil"
          description="Sua descrição e disponibilidade aparecem para os membros dos seus grupos"
          actionLabel="Entrar"
          onAction={() => router.push('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <SkeletonSongRow />
        <SkeletonSongRow />
      </SafeAreaView>
    );
  }

  const avail = availabilityCfg(profile?.availability ?? 'not_looking');

  // ─── Modo edição ────────────────────────────────────────────────────────────
  if (editing) {
    const remaining = BIO_MAX - bio.length;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.editContent}>
          <View style={styles.header}>
            <Eyebrow>Perfil · edição</Eyebrow>
            <PageTitle>Editar perfil</PageTitle>
          </View>

          <View style={styles.field}>
            <Eyebrow>Disponibilidade</Eyebrow>
            <View style={styles.availRow}>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={opt.label}
                  dotColor={opt.dot}
                  active={availability === opt.key}
                  activeColors={opt.active}
                  onPress={() => setAvailability(opt.key)}
                  style={styles.availChip}
                />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Eyebrow>Bio</Eyebrow>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
              placeholder="Fale um pouco sobre você..."
              placeholderTextColor={colors.faint}
              multiline
              textAlignVertical="top"
              selectionColor={colors.accent}
            />
            <Text style={[styles.counter, remaining < 30 && styles.counterLow]}>
              {bio.length}/{BIO_MAX}
            </Text>
          </View>
        </ScrollView>

        {/* Barra fixa de salvar */}
        <View style={styles.saveBar}>
          <Button
            label="Cancelar"
            variant="outline"
            onPress={() => {
              setBio(profile?.bio ?? '');
              setAvailability(profile?.availability ?? 'available');
              setEditing(false);
            }}
            style={styles.saveBarBtn}
          />
          <Button
            label="Salvar"
            loading={isPending}
            onPress={handleSave}
            style={styles.saveBarBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Modo visualização ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Eyebrow>Perfil · músico</Eyebrow>
          <PageTitle>Perfil</PageTitle>
        </View>

        <View style={styles.card}>
          <Avatar name={user?.name} url={user?.avatarUrl} size={80} shape="square" />
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.name ?? '—'}</Text>
            <Text style={styles.email}>{user?.email ?? '—'}</Text>
            <View style={styles.availStatus}>
              <View style={[styles.availDot, { backgroundColor: avail.dot }]} />
              <Text style={[styles.availLabel, { color: avail.active.text }]}>
                {avail.label}
              </Text>
            </View>
          </View>
        </View>

        {profile?.bio ? (
          <View style={styles.bioCard}>
            <Eyebrow>Bio</Eyebrow>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        <Button
          label="Editar perfil"
          variant="outline"
          onPress={() => setEditing(true)}
        />

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <IconLogout size={16} color={colors.red400} />
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  editContent: { padding: 16, gap: 20, paddingBottom: 120 },
  header: { gap: 4, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
  },
  userInfo: { flex: 1, minWidth: 0 },
  name: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: fontSize['2xl'],
  },
  email: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  availStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availLabel: { fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
  bioCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 8,
  },
  bioText: {
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  signOutText: {
    color: colors.red400,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
  },

  // Edição
  field: { gap: 8 },
  availRow: { flexDirection: 'row', gap: 8 },
  availChip: { flex: 1, justifyContent: 'center', paddingVertical: 9 },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    color: colors.ink,
    fontSize: fontSize.sm,
    minHeight: 110,
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  counterLow: { color: colors.red400 },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveBarBtn: { flex: 1 },
});
