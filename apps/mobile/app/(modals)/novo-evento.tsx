import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventForm } from '@/components/EventForm';
import { IconClose } from '@/components/ui/icons';
import { useCreateEvent } from '@/hooks/useGroups';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

export default function NovoEventoModal() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { mutate: createEvent, isPending } = useCreateEvent(groupId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Novo evento</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <IconClose size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>
      <EventForm
        groupId={groupId}
        submitLabel="Criar evento"
        submitting={isPending}
        onSubmit={(data) =>
          createEvent(data, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Erro', e.message),
          })
        }
      />
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
});
