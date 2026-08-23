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

export function formatCountdown(ms: number) {
  if (ms <= 0) return "soon";
  const totalSec = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs >= 1) return `${hrs}h ${mins % 60}m`;
  if (mins >= 1) return `${mins} min`;
  return `${totalSec} sec`;
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
