import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/constants/colors';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}
