/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Musilista',
  slug: 'musilista',
  version: '1.0.0',
  scheme: 'musilista',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.musilista.app',
    infoPlist: {
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            'com.googleusercontent.apps.285488021331-cu0mfhce635ums9a3koiq7e4e2dmk5tq',
          ],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'com.musilista.app',
    permissions: [],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme:
          'com.googleusercontent.apps.285488021331-cu0mfhce635ums9a3koiq7e4e2dmk5tq',
      },
    ],
    [
      'expo-build-properties',
      {
        android: { enableHermes: true },
      },
    ],
  ],
  extra: {
    router: { origin: false },
    eas: { projectId: '8663ed86-b94e-4310-ad95-5d887864e8e5' },
  },
};
