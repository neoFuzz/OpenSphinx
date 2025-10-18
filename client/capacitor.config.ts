import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.opensphinx.game',
  appName: 'OpenSphinx',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
