import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ma.iftl.erp',
  appName: 'IFTL ERP',
  webDir: 'dist',
  server: {
    // En développement: pointe vers le serveur live pour rechargement à chaud
    // Commentez/décommentez selon l'environnement
    // url: 'https://erp-pedago-iftl.web.app',
    // cleartext: false,
  },
  android: {
    backgroundColor: '#003d63',
  },
  ios: {
    backgroundColor: '#003d63',
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#003d63',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Light',
      backgroundColor: '#003d63',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
