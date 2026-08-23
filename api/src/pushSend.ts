import { pushStore } from "./pushStore";

export type PushPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  channelId: string;
  priority: "high";
  data?: Record<string, unknown>;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

function chunk<T>(rows: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

async function postChunk(messages: ExpoMessage[]) {
  if (!messages.length) return;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: Array<{ status?: string; message?: string; details?: { error?: string } }> }
      | null;
    if (!res.ok) {
      console.warn("[push] Expo HTTP", res.status, JSON.stringify(json).slice(0, 300));
      return;
    }
    const tickets = json?.data || [];
    for (const ticket of tickets) {
      if (ticket.status === "error") {
        console.warn("[push] ticket error:", ticket.message || ticket.details?.error || "unknown");
      }
    }
  } catch (err) {
    console.warn("[push] send failed:", err instanceof Error ? err.message : err);
  }
}

/** Fire-and-forget phone popups via Expo Push (FCM on Android, APNs on iOS). */
export function sendPushToUsers(payloads: PushPayload[]) {
  if (!payloads.length) return;
  if (process.env.PUSH_ENABLED === "0") return;

  void (async () => {
    const byUser = new Map<string, PushPayload[]>();
    for (const p of payloads) {
      const list = byUser.get(p.userId) || [];
      list.push(p);
      byUser.set(p.userId, list);
    }

    const devices = pushStore.tokensForUsers(Array.from(byUser.keys()));
    if (!devices.length) return;

    const messages: ExpoMessage[] = [];
    for (const device of devices) {
      const list = byUser.get(device.userId) || [];
      // One popup per device — use the latest payload for that user in this batch.
      const last = list[list.length - 1];
      if (!last) continue;
      messages.push({
        to: device.token,
        title: last.title.slice(0, 80),
        body: last.body.slice(0, 180),
        sound: "default",
        channelId: "britbee-default",
        priority: "high",
        data: {
          ...(last.data || {}),
          userId: device.userId,
        },
      });
    }

    for (const part of chunk(messages, CHUNK)) {
      await postChunk(part);
    }
  })();
}
