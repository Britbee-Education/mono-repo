import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type ClassResumeState = {
  classId: string;
  joined: boolean;
  rewardQueued: boolean;
  savedAt: number;
};

export function classResumeKey(userId: string) {
  return `britbee_class_resume_${userId}`;
}

export async function readClassResume(userId: string): Promise<ClassResumeState | null> {
  const key = classResumeKey(userId);
  try {
    if (Platform.OS === "web") {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      if (!raw) return null;
      return JSON.parse(raw) as ClassResumeState;
    }
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    return JSON.parse(raw) as ClassResumeState;
  } catch {
    return null;
  }
}

export async function writeClassResume(userId: string, state: ClassResumeState) {
  const key = classResumeKey(userId);
  try {
    const raw = JSON.stringify(state);
    if (Platform.OS === "web") {
      localStorage?.setItem(key, raw);
      return;
    }
    await SecureStore.setItemAsync(key, raw);
  } catch {
    // ignore
  }
}

export async function clearClassResume(userId: string) {
  const key = classResumeKey(userId);
  try {
    if (Platform.OS === "web") {
      localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}
