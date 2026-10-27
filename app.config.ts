import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "munched",
  slug: "munched",
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "munched",
  // The UI is designed for light mode only (hardcoded light colors).
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.jakobprince.munched",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
      backgroundColor: "#E6F4FE",
    },
    package: "com.jakobprince.munched",
  },
  updates: {
    url: "https://u.expo.dev/b9956388-faaa-4704-b380-c43c309bdc7e",
  },
  // The runtime version is derived from the native code, so an OTA update is
  // only ever delivered to builds whose native code matches it.
  runtimeVersion: {
    policy: "fingerprint",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow munched to access your photos so you can add them to your munches.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow munched to use your location for distance sorting and map centering.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  // Everything in this file feeds the runtime fingerprint, so keep it free of
  // environment-dependent values: a mismatch stops OTA updates reaching builds.
  // The Supabase URL and anon key are public by design (row-level security
  // protects the data). `npm run start:local` overrides them at runtime.
  extra: {
    supabaseUrl: "https://dvguczmgurehwyarhboj.supabase.co",
    supabaseAnonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2Z3Vjem1ndXJlaHd5YXJoYm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDYwOTgsImV4cCI6MjA4OTY4MjA5OH0.5JY2m2cKdWL3CYIXSTLbU5k4QxmxHib2_YF28ibeIG0",
    eas: {
      projectId: "b9956388-faaa-4704-b380-c43c309bdc7e",
    },
  },
});
