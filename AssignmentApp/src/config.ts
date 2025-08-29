import { Platform } from 'react-native';

export function getApiBase() {
  if (Platform.OS === 'android') return 'https://centscape-if17.vercel.app/';
  return 'http://localhost:4000';
}

export const API_PREVIEW = `${getApiBase()}/api/preview`;
