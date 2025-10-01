import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tingle.app',
  appName: 'Tingle',
  webDir: 'dist',  // fallback
  server: {
    url: 'https://tingle-two.vercel.app/',
    cleartext: true
  }
};

export default config;
