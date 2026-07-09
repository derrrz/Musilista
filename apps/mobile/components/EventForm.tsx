import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { useGroupRepertoires, type ApiEventRow, type EventInput } from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import type { EventType } from '@/types';

const EVENT_TYPES: { key: EventType; label: string }[] = [
  { key: 'ENSAIO', label: 'Ensaio' },
  { key: 'SHOW', label: 'Show' },
  { key: 'OUTRO', label: 'Outro' },
];

const API_TYPE_TO_UI: Record<string, EventType> = {
  show: 'SHOW',
  ensaio: 'ENSAIO',
  other: 'OUTRO',
};

interface EventFormProps {
  groupId: string;
  /** Row cru vindo do GET (modo edição); ausente = criação */
  initial?: ApiEventRow;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (data: EventInput) => void;
}

export function EventForm({ groupId, initial, submitLabel, submitting, onSubmit }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<EventType>('ENSAIO');
  const [location, setLocation] = useState('');
  const [notice, setNotice] = useState('');
  const [rider, setRider] = useState('');
  const [repertoireIds, setRepertoireIds] = useState<string[]>([]);

  // Setlists do grupo para vincular ao evento (multiselect, como na web)
  const { data: setlists } = useGroupRepertoires(groupId);

  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title ?? '');
    if (initial.eventDate) {
      const [y, m, d] = initial.eventDate.split('-');
      setDate(`${d}/${m}/${y}`);
    }
    setTime(initial.eventTime ? initial.eventTime.slice(0, 5) : '');
    setType(API_TYPE_TO_UI[initial.eventType] ?? 'OUTRO');
    setLocation(initial.location ?? '');
    setNotice(initial.notice ?? '');
    setRider(initial.technicalRider ?? '');
    setRepertoireIds(initial.repertoireIds ?? []);
  }, [initial]);

  function toggleSetlist(id: string) {
    setRepertoireIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Título obrigatório');
      return;
    }
    const dateMatch = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dateMatch) {
      Alert.alert('Data obrigatória', 'Use o formato DD/MM/AAAA');
      return;
    }
    const [, day, month, year] = dateMatch;

    const trimmedTime = time.trim();
    if (trimmedTime && !/^\d{2}:\d{2}$/.test(trimmedTime)) {
      Alert.alert('Horário inválido', 'Use o formato HH:MM ou deixe em branco');
      return;
    }

    onSubmit({
      title: title.trim(),
      date: `${year}-${month}-${day}`,
      time: trimmedTime || undefined,
      type,
      location: location.trim() || undefined,
      notice: notice.trim() || undefined,
      technicalRider: rider.trim() || undefined,
      repertoireIds,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Input
        label="Título *"
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Ensaio sábado"
        autoFocus={!initial}
      />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Input
            label="Data *"
            value={date}
            onChangeText={setDate}
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <View style={styles.rowItem}>
          <Input
            label="Horário"
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
      </View>

      <View style={styles.typeRow}>
        {EVENT_TYPES.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            active={type === t.key}
            onPress={() => setType(t.key)}
            style={styles.typeChip}
          />
        ))}
      </View>

      <Input
        label="Local"
        value={location}
        onChangeText={setLocation}
        placeholder="Ex: Estúdio do Zé"
      />

      <Input
        label="Aviso / Observação"
        value={notice}
        onChangeText={setNotice}
        placeholder="Detalhes importantes para o grupo..."
        textarea
      />

      {(setlists ?? []).length > 0 && (
        <View style={styles.setlistsField}>
          <Text style={styles.setlistsLabel}>Setlists do show</Text>
          <View style={styles.setlistsChips}>
            {(setlists ?? []).map((s) => {
              const n = s.songs.filter((b) => (b.itemType ?? 'song') === 'song').length;
              return (
                <Chip
                  key={s.id}
                  label={`${s.name} · ${n}`}
                  active={repertoireIds.includes(s.id)}
                  onPress={() => toggleSetlist(s.id)}
                />
              );
            })}
          </View>
          <Text style={styles.setlistsHint}>
            O roteiro completo aparece no link público da agenda
          </Text>
        </View>
      )}

      <Input
        label="Rider Técnico"
        value={rider}
        onChangeText={setRider}
        placeholder="Equipamentos, canais, backline..."
        textarea
        style={styles.riderInput}
      />

      <Button label={submitLabel} onPress={handleSubmit} loading={submitting} size="lg" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, justifyContent: 'center', paddingVertical: 9 },
  riderInput: { fontFamily: fonts.mono, fontSize: 13 },
  setlistsField: { gap: 8 },
  setlistsLabel: {
    color: colors.muted,
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  setlistsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  setlistsHint: { color: colors.faint, fontFamily: fonts.sans, fontSize: 11 },
});
