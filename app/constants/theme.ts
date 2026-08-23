import Constants from "expo-constants";
import { Platform } from "react-native";

export const colors = {
  navy: "#1A2B5F",
  navyDeep: "#0B1F4D",
  yellow: "#F5C400",
  yellowBright: "#FFCC00",
  linkBlue: "#2F80ED",
  shieldBlue: "#5B9BFF",
  nameRed: "#E53935",
  bg: "#FFFFFF",
  bgMuted: "#F7F8FA",
  streakBg: "#FFF8E1",
  practiceBg: "#EAF2FF",
  practiceYellow: "#FFE566",
  border: "#E6E8EE",
  muted: "#8A93A3",
  ink: "#374151",
  listen: "#8C52FF",
  speak: "#4CAF50",
  learn: "#FFCC00",
  mission: "#EF5350",
  levelGreen: "#E8F5E9",
  levelGreenBorder: "#66BB6A",
  successBg: "#E8F5E9",
  successText: "#2E7D32",
  white: "#FFFFFF",
  pattern: "#D7DCE6",
} as const;

export const fonts = {
  light: "SatoshiLight",
  regular: "SatoshiRegular",
  medium: "SatoshiMedium",
  semi: "SatoshiMedium",
  bold: "SatoshiBold",
  extra: "SatoshiBold",
} as const;

// Expo (React Native) replaces env vars at runtime, but TypeScript needs a type for `process`.
declare const process: { env: Record<string, string | undefined> };

/** Tighter radii — closer to the reference's more serious UI. */
export const radii = {
  xs: 4,
  sm: 6,
  md: 8,
  input: 9,
  button: 9,
  card: 10,
  icon: 7,
  pill: 999,
} as const;

/** Soft, wide shadows — low contrast, large blur. */
export const shadow = {
  card: {
    shadowColor: "#1A2B5F",
    shadowOpacity: 0.03,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#1A2B5F",
    shadowOpacity: 0.04,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  bar: {
    shadowColor: "#1A2B5F",
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
} as const;

export const brand = {
  name: "BritBee",
  taglineLead: "Learn Today,",
  taglineAccent: "Speak Tomorrow!",
} as const;

function metroHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const host = String(raw)
      .replace(/^\w+:\/\//, "")
      .split("/")[0]
      .split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") return host;
  }
  return null;
}

function withDeviceHost(url: string) {
  const raw = (url || "").replace(/\/$/, "") || "http://localhost:3001";
  if (Platform.OS === "web") return raw;
  const host = metroHost();
  if (!host) return raw;
  try {
    const parsed = new URL(raw.includes("://") ? raw : `http://${raw}`);
    parsed.hostname = host;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return `http://${host}:3001`;
  }
}

export const API_URL = withDeviceHost(process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001");
