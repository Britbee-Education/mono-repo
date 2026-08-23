import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/api";

const CHANNEL_ID = "britbee-default";

let lastToken: string | null = null;
let handlerReady = false;

function ensureHandler() {
  if (handlerReady) return;
  handlerReady = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function projectId(): string | undefined {
  const raw =
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    "";
  const id = String(raw).trim();
  return id || undefined;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "BritBee",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#F5A623",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  });
}

export function getLastPushToken() {
  return lastToken;
}

/** Register for OS popups (Expo Push → FCM Android / APNs iOS). No-op on web. */
export async function registerForPush(): Promise<string | null> {
  ensureHandler();
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) {
    console.warn("[push] Physical device required for phone popups.");
    return null;
  }

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== "granted") {
    console.warn("[push] Notification permission not granted.");
    return null;
  }

  const id = projectId();
  const tokenRes = id
    ? await Notifications.getExpoPushTokenAsync({ projectId: id })
    : await Notifications.getExpoPushTokenAsync();
  const token = tokenRes.data;
  if (!token) return null;

  lastToken = token;
  const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unknown";
  await api.registerPushToken(token, platform);
  return token;
}

/** Remove this device token from the API (logout / disable). */
export async function unregisterPush(): Promise<void> {
  const token = lastToken;
  lastToken = null;
  if (!token || Platform.OS === "web") return;
  await api.unregisterPushToken(token).catch(() => undefined);
}

export { Notifications, CHANNEL_ID };
