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
import Svg, { Path } from 'react-native-svg';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { useSession } from '@/context/SessionContext';
import { api } from '@/lib/api';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId:
    '285488021331-cu0mfhce635ums9a3koiq7e4e2dmk5tq.apps.googleusercontent.com',
});

// G multicolorido do login web
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <Path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <Path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <Path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </Svg>
  );
}

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
      <View style={styles.card}>
        <View style={styles.brand}>
          <LogoMark size={32} />
          <Wordmark />
          <Badge label="Beta" variant="outline" />
        </View>

        <Text style={styles.tagline}>
          Cifras, repertórios e agenda para a sua banda
        </Text>

        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.btnDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <>
              <GoogleG />
              <Text style={styles.googleBtnText}>Entrar com Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={skipLogin} disabled={loading}>
          <Text style={styles.skipText}>Agora não</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          Ao entrar, você concorda com os Termos de Uso
        </Text>
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    alignItems: 'center',
    gap: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tagline: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: 8,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnDisabled: { opacity: 0.6 },
  googleBtnText: {
    color: colors.ink,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.base,
  },
  skipBtn: { paddingVertical: 4 },
  skipText: {
    color: colors.muted,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
  },
  terms: {
    color: colors.faint,
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
