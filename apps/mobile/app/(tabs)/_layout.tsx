import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111114',
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
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
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🎸" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="grupos"
        options={{
          title: 'Grupos',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
