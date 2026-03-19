import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gesturepath.app',
  appName: 'Gesture Path',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
