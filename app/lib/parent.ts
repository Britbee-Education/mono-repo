import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type PlanId = "trial" | "monthly" | "yearly";

export type ParentRecord = {
  pin?: string;
  planId: PlanId;
  planSince?: string;
  paused: boolean;
};

export const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  blurb: string;
}[] = [
  { id: "trial", name: "Hive Trial", price: "Free", period: "7 days", blurb: "Try all 5 daily activities." },
  { id: "monthly", name: "Hive Monthly", price: "₹499", period: "/ month", blurb: "Unlimited practice, live classes, progress reports." },
  { id: "yearly", name: "Hive Yearly", price: "₹4,999", period: "/ year", blurb: "Two months free. Best for families." },
];

export function planById(id: PlanId) {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

async function read(key: string) {
  if (Platform.OS === "web") return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

function storeKey(userId: string) {
  return `britbee_parent_${userId}`;
}

export async function loadParent(userId: string): Promise<ParentRecord> {
  const raw = await read(storeKey(userId));
  if (!raw) return { planId: "trial", paused: false };
  try {
    const parsed = JSON.parse(raw) as ParentRecord;
    return {
      pin: typeof parsed.pin === "string" ? parsed.pin : undefined,
      planId: parsed.planId === "monthly" || parsed.planId === "yearly" ? parsed.planId : "trial",
      planSince: parsed.planSince,
      paused: Boolean(parsed.paused),
    };
  } catch {
    return { planId: "trial", paused: false };
  }
}

export async function saveParent(userId: string, record: ParentRecord) {
  await write(storeKey(userId), JSON.stringify(record));
}
