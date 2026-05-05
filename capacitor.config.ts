import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.soccernote.app',
  appName: '축구 노트',
  webDir: 'out',
  server: {
    url: 'https://soccer-note-hazel.vercel.app',
    androidScheme: 'https',
  },
  ios: {
    // Disable swipe back gesture in iOS WebView
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#059669',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#059669',
    },
  },
};

export default config;
