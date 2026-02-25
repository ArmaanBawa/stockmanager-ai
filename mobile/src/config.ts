import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Detect the host machine's LAN IP from Expo's dev server debuggerHost
// This works for both simulator and physical device
const getDevServerIP = (): string => {
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return '';
};

const getLanUrl = (): string => {
  const ip = getDevServerIP();
  if (ip) return `http://${ip}:3000`;

  // Fallback per platform
  return Platform.select({
    android: 'http://10.0.2.2:3000',     // Android emulator
    ios: 'http://localhost:3000',          // iOS simulator
    default: 'http://localhost:3000',
  })!;
};

export const API_BASE_URL: string =
  Constants.expoConfig?.extra?.apiBaseUrl || getLanUrl();
