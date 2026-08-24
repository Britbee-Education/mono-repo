/** Calendar day in India Standard Time — matches the API hive day. */
export function todayIst(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const grab = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${grab("year")}-${grab("month")}-${grab("day")}`;
}

export function yesterdayIst(date = new Date()) {
  const [y, m, d] = todayIst(date).split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function istMsIntoDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const grab = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const h = grab("hour");
  const m = grab("minute");
  const s = grab("second");
  return ((h * 60 + m) * 60 + s) * 1000;
}

/** Milliseconds until the next IST midnight (when daily packs and activities reset). */
export function msUntilNextIstMidnight(date = new Date()) {
  return Math.max(0, DAY_MS - istMsIntoDay(date));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Always HH:MM:SS so countdown reads as a live timer. */
export function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function countdownParts(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

export type UnlockCountdownKind = "default" | "activities" | "sprout" | "play" | "pack" | "day";

const UNLOCK_PREFIX: Record<UnlockCountdownKind, string> = {
  default: "Unlocks in",
  activities: "New activities in",
  sprout: "Next sprout in",
  play: "Play again in",
  pack: "Next pack in",
  day: "New day in",
};

export function unlockCountdownLabel(ms: number, kind: UnlockCountdownKind = "default") {
  return `${UNLOCK_PREFIX[kind]} ${formatCountdown(ms)}`;
}
