import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useCreateEvent } from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';
import type { EventType } from '@/types';

const EVENT_TYPES: { key: EventType; label: string }[] = [
  { key: 'ENSAIO', label: 'Ensaio' },
  { key: 'SHOW', label: 'Show' },
  { key: 'OUTRO', label: 'Outro' },
];

export default function NovoEventoModal() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<EventType>('ENSAIO');
  const [description, setDescription] = useState('');
  const { mutate: createEvent, isPending } = useCreateEvent(groupId);

  function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Título obrigatório');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Data obrigatória', 'Use o formato DD/MM/AAAA');
      return;
    }
    const [day, month, year] = date.split('/');
    const isoDate = `${year}-${month}-${day}T00:00:00.000Z`;

    createEvent(
      { title: title.trim(), date: isoDate, type, description: description.trim() || undefined },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Erro', e.message),
      },
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Novo evento</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Ensaio sábado"
            placeholderTextColor={colors.faint}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Data *</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.faint}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.typeRow}>
            {EVENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeBtn, type === t.key && styles.typeBtnActive]}
                onPress={() => setType(t.key)}
              >
                <Text style={[styles.typeBtnText, type === t.key && styles.typeBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detalhes do evento..."
            placeholderTextColor={colors.faint}
            multiline
            numberOfLines={3}
          />
        </View>

        <Button label="Criar evento" onPress={handleCreate} loading={isPending} size="lg" />
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
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  typeBtnActive: {
    backgroundColor: colors.avatarBg,
    borderColor: colors.accent,
  },
  typeBtnText: { color: colors.muted, fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
  typeBtnTextActive: { color: colors.accent },
});
