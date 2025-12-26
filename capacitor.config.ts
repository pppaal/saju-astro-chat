import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.destinypal.app',
  appName: 'DestinyPal',
  webDir: 'out',
  server: {
    // Production: 웹서버 URL 사용 (앱은 WebView로 웹사이트 로드)
    url: 'https://destinypal.com',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0d1225',
    },
  },
};

export default config;
