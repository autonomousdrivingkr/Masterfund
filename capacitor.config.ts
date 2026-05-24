import type { CapacitorConfig } from '@capacitor/cli';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://your-domain.com';
const isHttp = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.masterfund.app',
  appName: 'Masterfund',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: isHttp,
    androidScheme: isHttp ? 'http' : 'https',
  },
  android: {
    allowMixedContent: isHttp,
    webContentsDebuggingEnabled: isHttp,
    captureInput: true,
  },
};

export default config;
