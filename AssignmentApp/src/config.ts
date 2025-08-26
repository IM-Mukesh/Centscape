// src/config.ts
import { Platform } from 'react-native';

/**
 * API_BASE: default assumes backend running on your dev machine at port 4000.
 * - Android emulator (AVD): use 10.0.2.2
 * - iOS simulator / mac: use localhost
 * - Physical device: replace with your machine IP, e.g. http://192.168.0.25:4000
 */
export function getApiBase() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}

export const API_PREVIEW = `${getApiBase()}/api/preview`;
