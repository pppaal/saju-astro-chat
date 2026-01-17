import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.destinypal.app",
  appName: "DestinyPal",
  webDir: "out",
  server: {
    url: "https://destinypal.com",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a2e",
      showSpinner: true,
      spinnerColor: "#a855f7",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  ios: {
    scheme: "DestinyPal",
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#1a1a2e",
  },
};

export default config;
