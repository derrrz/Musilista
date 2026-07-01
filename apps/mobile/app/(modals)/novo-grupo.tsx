import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useCreateGroup } from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

export default function NovoGrupoModal() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate: createGroup, isPending } = useCreateGroup();

  function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Informe um nome para o grupo.');
      return;
    }
    createGroup(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (group) => {
          router.back();
          router.push(`/groups/${group.id}`);
        },
        onError: (e) => Alert.alert('Erro', e.message),
      },
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Novo grupo</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Nome do grupo *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Banda do Bairro"
            placeholderTextColor={colors.faint}
            autoFocus
            maxLength={60}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Fale sobre o grupo..."
            placeholderTextColor={colors.faint}
            multiline
            numberOfLines={3}
          />
        </View>

        <Button label="Criar grupo" onPress={handleCreate} loading={isPending} size="lg" />
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
  close: { color: colors.muted, fontSize: 20, padding: 4 },
  content: { padding: 16, gap: 20 },
  field: { gap: 8 },
  label: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 13,
    color: colors.ink,
    fontSize: fontSize.base,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
});
