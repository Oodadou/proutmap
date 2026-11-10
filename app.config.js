// Configuration de l'appli. Les clés se mettent dans le fichier .env (voir .env.example).
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || 'com.littlehorse.proutmap';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || 'com.littlehorse.proutmap';
const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

module.exports = {
  expo: {
    name: DEMO ? 'Prout Map démo' : 'Prout Map',
    slug: 'proutmap',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'proutmap',
    userInterfaceStyle: 'light',
    ios: {
      bundleIdentifier: IOS_BUNDLE_ID,
      supportsTablet: false,
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: ANDROID_PACKAGE,
      adaptiveIcon: {
        backgroundColor: '#FFF8EC',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FFF8EC',
          image: './assets/images/splash-icon.png',
          imageWidth: 180,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            "Prout Map utilise ta position pour placer tes prouts sur la carte.",
        },
      ],
      ['expo-notifications', { color: '#7BC043' }],
      'expo-apple-authentication',
      ['expo-audio', { microphonePermission: false, recordAudioAndroid: false }],
      [
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.A-REMPLACER' },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        // Rempli automatiquement par `npx eas-cli@latest init`
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  },
};
