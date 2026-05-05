import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function hasWebStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function getStoredString(key: string) {
  if (Platform.OS === 'web' && hasWebStorage()) {
    return window.localStorage.getItem(key);
  }

  return AsyncStorage.getItem(key);
}

export async function setStoredString(key: string, value: string) {
  if (Platform.OS === 'web' && hasWebStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

export async function getStoredJson<T>(key: string): Promise<T | null> {
  const rawValue = await getStoredString(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

export async function setStoredJson(key: string, value: unknown) {
  await setStoredString(key, JSON.stringify(value));
}
