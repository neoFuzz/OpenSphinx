import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.opensphinx.game',
  appName: 'OpenSphinx',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  },
  plugins: {
    AdMob: {
      appId: process.env.ADMOB_APP_ID || 'ca-app-pub-3940256099942544~3347511713'
    }
  }
};

export default config;
