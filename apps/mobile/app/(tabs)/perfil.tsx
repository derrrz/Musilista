import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { useSession } from '@/context/SessionContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

export default function PerfilScreen() {
  const { session, signOut } = useSession();
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [description, setDescription] = useState(profile?.description ?? '');
  const [available, setAvailable] = useState(profile?.available ?? false);

  const user = profile ?? session?.user;

  function handleSave() {
    updateProfile(
      { description, available },
      {
        onSuccess: () => Alert.alert('Salvo!', 'Perfil atualizado.'),
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <SkeletonSongRow />
        <SkeletonSongRow />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Perfil</Text>

        <View style={styles.card}>
          <Avatar name={user?.name} url={user?.avatarUrl} size={60} shape="circle" />
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.name ?? '—'}</Text>
            <Text style={styles.email}>{user?.email ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Fale um pouco sobre você..."
            placeholderTextColor={colors.faint}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.toggle}>
          <View>
            <Text style={styles.toggleLabel}>Disponível para tocar</Text>
            <Text style={styles.toggleHint}>Aparece para outros membros do grupo</Text>
          </View>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ false: colors.raised, true: colors.accent }}
            thumbColor={available ? colors.accentInk : colors.muted}
          />
        </View>

        <Button
          label="Salvar alterações"
          onPress={handleSave}
          loading={isPending}
          style={styles.saveBtn}
        />

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 20 },
  heading: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: fontSize['2xl'],
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  userInfo: { flex: 1 },
  name: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xl,
  },
  email: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  field: { gap: 8 },
  label: {
    color: colors.muted,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    color: colors.ink,
    fontSize: fontSize.base,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  toggleLabel: {
    color: colors.ink,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.base,
  },
  toggleHint: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  saveBtn: { marginTop: 4 },
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: 4,
  },
  signOutText: {
    color: colors.error,
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
});
