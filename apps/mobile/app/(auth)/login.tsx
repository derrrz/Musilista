import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/context/SessionContext';
import { api } from '@/lib/api';
import { colors } from '@/constants/colors';
import { fonts, fontSize, fontWeight } from '@/constants/typography';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId:
    '285488021331-cu0mfhce635ums9a3koiq7e4e2dmk5tq.apps.googleusercontent.com',
});

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const [loading, setLoading] = useState(false);

  function skipLogin() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/biblioteca');
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens.idToken;
      if (!idToken) throw new Error('Não foi possível obter o token do Google.');

      const { token } = await api.post<{ token: string }>(
        '/api/auth/mobile-signin',
        { idToken },
      );
      await signIn(token);
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (
          error.code === statusCodes.SIGN_IN_CANCELLED ||
          error.code === statusCodes.IN_PROGRESS
        ) {
          return;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert('Erro', 'Google Play Services não disponível.');
          return;
        }
      }
      Alert.alert('Erro ao entrar', (error as Error).message ?? 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <Text style={styles.appName}>Musilista</Text>
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>BETA</Text>
        </View>
      </View>

      <Text style={styles.tagline}>Sua biblioteca de cifras</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.btnDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.accentInk} />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>Continuar com Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={skipLogin} disabled={loading}>
          <Text style={styles.skipText}>Agora não</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.accentInk,
    fontFamily: fonts.sansBold,
    fontSize: 24,
  },
  appName: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 28,
  },
  betaBadge: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  betaText: {
    color: colors.accentInk,
    fontFamily: fonts.sansBold,
    fontSize: 10,
  },
  tagline: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    marginBottom: 32,
  },
  actions: { width: '88%', gap: 12 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accent,
    borderRadius: 28,
    paddingVertical: 15,
  },
  btnDisabled: { opacity: 0.6 },
  googleIcon: {
    color: colors.accentInk,
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  googleBtnText: {
    color: colors.accentInk,
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: {
    color: colors.muted,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
  },
});
