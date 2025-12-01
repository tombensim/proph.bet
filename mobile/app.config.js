// Load environment variables from mobile/.env explicitly
// This ensures env vars work correctly in npm workspace setup
require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  expo: {
    name: 'Proph.bet',
    slug: 'proph-bet',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'prophbet',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0f172a',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.prophbet.app',
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ['prophbet'],
          },
        ],
        NSPhotoLibraryUsageDescription:
          'Allow Proph.bet to access your photos to add cover images to your markets.',
        NSCameraUsageDescription:
          'Allow Proph.bet to use your camera to take photos for market covers.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0f172a',
      },
      package: 'com.prophbet.app',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'prophbet' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      '@react-native-google-signin/google-signin',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow Proph.bet to access your photos to add cover images to your markets.',
          cameraPermission:
            'Allow Proph.bet to use your camera to take photos for market covers.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      // Expose env vars to the app via Constants.expoConfig.extra
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      googleClientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      googleClientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
      router: {
        origin: false,
      },
      eas: {
        projectId: '385bdc49-b734-45d6-9b3f-717de76599fe',
      },
    },
    owner: 'tombensim',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/385bdc49-b734-45d6-9b3f-717de76599fe',
    },
  },
};

