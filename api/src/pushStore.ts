import fs from "fs";
import path from "path";

export type PushDevice = {
  userId: string;
  token: string;
  platform: "ios" | "android" | "web" | "unknown";
  updatedAt: string;
};

type Disk = {
  devices: PushDevice[];
};

const DATA_PATH = path.resolve(__dirname, "../data/push-devices.json");

const g = globalThis as unknown as {
  __britbeePush?: Disk;
  __britbeePushLoaded?: boolean;
};

function empty(): Disk {
  return { devices: [] };
}

function load(): Disk {
  if (g.__britbeePushLoaded && g.__britbeePush) return g.__britbeePush;
  try {
    if (fs.existsSync(DATA_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
      g.__britbeePush = Array.isArray(parsed?.devices) ? parsed : empty();
    } else {
      g.__britbeePush = empty();
    }
  } catch {
    g.__britbeePush = empty();
  }
  g.__britbeePushLoaded = true;
  return g.__britbeePush!;
}

function save() {
  const disk = load();
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(disk, null, 2));
}

function isExpoToken(token: string) {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
}

export const pushStore = {
  upsert(userId: string, token: string, platform: PushDevice["platform"] = "unknown") {
    const trimmed = String(token || "").trim();
    if (!trimmed || !isExpoToken(trimmed)) {
      throw new Error("Invalid Expo push token.");
    }
    const disk = load();
    // One physical device token maps to one user — move it if re-registered.
    disk.devices = disk.devices.filter((d) => d.token !== trimmed);
    disk.devices.push({
      userId,
      token: trimmed,
      platform,
      updatedAt: new Date().toISOString(),
    });
    // Cap per user to avoid unbounded growth from reinstalls.
    const mine = disk.devices.filter((d) => d.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (mine.length > 5) {
      const drop = new Set(mine.slice(5).map((d) => d.token));
      disk.devices = disk.devices.filter((d) => !(d.userId === userId && drop.has(d.token)));
    }
    save();
    return disk.devices.find((d) => d.token === trimmed)!;
  },

  remove(userId: string, token?: string) {
    const disk = load();
    const before = disk.devices.length;
    disk.devices = disk.devices.filter((d) => {
      if (d.userId !== userId) return true;
      if (token) return d.token !== token;
      return false;
    });
    save();
    return before - disk.devices.length;
  },

  tokensForUsers(userIds: string[]) {
    const wanted = new Set(userIds);
    return load().devices.filter((d) => wanted.has(d.userId));
  },

  count() {
    return load().devices.length;
  },
};
