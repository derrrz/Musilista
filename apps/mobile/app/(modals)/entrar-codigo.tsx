import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { IconClose } from '@/components/ui/icons';
import { Eyebrow } from '@/components/ui/Typography';
import { useJoinGroup } from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

export default function EntrarCodigoModal() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const { mutate: joinGroup, isPending } = useJoinGroup();

  function handleJoin() {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      Alert.alert('Código obrigatório', 'Informe o código de convite.');
      return;
    }
    joinGroup(normalized, {
      onSuccess: (group) => {
        router.back();
        router.push(`/groups/${group.id}`);
      },
      onError: (e) => Alert.alert('Código inválido', e.message),
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Entrar em grupo</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <IconClose size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.hint}>
          Peça o código de convite para o administrador do grupo.
        </Text>

        <View style={styles.field}>
          <Eyebrow>Código de convite</Eyebrow>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="GRP-XXXXXX"
            placeholderTextColor={colors.faint}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={10}
          />
        </View>

        <Button label="Entrar no grupo" onPress={handleJoin} loading={isPending} size="lg" />
      </View>
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
  content: { padding: 16, gap: 20 },
  hint: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  field: { gap: 8 },
  input: {
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    color: colors.ink,
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    textAlign: 'center',
    letterSpacing: 4,
  },
});
