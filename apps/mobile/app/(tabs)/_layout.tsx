import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconGroups, IconGuitar, IconProfile } from '@/components/ui/icons';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';

export default function TabsLayout() {
  // Android edge-to-edge: a barra de navegação do sistema sobrepõe o rodapé,
  // então a altura/padding da tab bar precisam somar o inset inferior.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold as '600',
        },
      }}
    >
      <Tabs.Screen
        name="biblioteca"
        options={{
          title: 'Cifras',
          tabBarIcon: ({ color }) => <IconGuitar size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="grupos"
        options={{
          title: 'Grupos',
          tabBarIcon: ({ color }) => <IconGroups size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <IconProfile size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
