import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventForm } from '@/components/EventForm';
import { IconClose } from '@/components/ui/icons';
import { SkeletonSongRow } from '@/components/ui/Skeleton';
import { useEvent, useUpdateEvent } from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

export default function EditarEventoModal() {
  const { groupId, eventId } = useLocalSearchParams<{ groupId: string; eventId: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(groupId, eventId);
  const { mutate: updateEvent, isPending } = useUpdateEvent(groupId, eventId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Editar evento</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <IconClose size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>
      {isLoading || !event ? (
        <View style={styles.loading}>
          <SkeletonSongRow />
        </View>
      ) : (
        <EventForm
          initial={event}
          submitLabel="Salvar alterações"
          submitting={isPending}
          onSubmit={(data) =>
            updateEvent(data, {
              onSuccess: () => router.back(),
              onError: (e) => Alert.alert('Erro', e.message),
            })
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: fontSize.lg },
  loading: { padding: 16 },
});
