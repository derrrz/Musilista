import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import type { ApiEventRow, EventInput } from '@/hooks/useGroups';
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
  /** Row cru vindo do GET (modo edição); ausente = criação */
  initial?: ApiEventRow;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (data: EventInput) => void;
}

export function EventForm({ initial, submitLabel, submitting, onSubmit }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<EventType>('ENSAIO');
  const [location, setLocation] = useState('');
  const [notice, setNotice] = useState('');
  const [rider, setRider] = useState('');

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
  }, [initial]);

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
});
