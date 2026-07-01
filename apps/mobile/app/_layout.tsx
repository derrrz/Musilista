import { QueryClientProvider } from '@tanstack/react-query';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { queryClient } from '@/lib/queryClient';

function NavigationGuard() {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)/biblioteca');
    }
  }, [session, isLoading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    JetBrainsMono: JetBrainsMono_400Regular,
    'JetBrainsMono-Bold': JetBrainsMono_700Bold,
  });

  // Render immediately even while fonts load — fallback to system fonts
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0f1214' }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <NavigationGuard />
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
