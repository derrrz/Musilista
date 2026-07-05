import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { IconClose } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <IconClose size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Input
          label="Nome do grupo *"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Banda do Bairro"
          autoFocus
          maxLength={60}
        />
        <Input
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Fale sobre o grupo..."
          textarea
        />
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
  content: { padding: 16, gap: 20 },
});
