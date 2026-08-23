import { todayIst } from "@/lib/day";
import { weekKey } from "@/data/phonics";
import type { QuestId } from "@/lib/quests";

export type RemoteSnapshot = {
  points?: number;
  streak?: number;
  clearedSounds?: string[];
  dailyDone?: boolean;
  dailyEver?: boolean;
  storyEver?: boolean;
  verbsCleared?: string[];
  prepCorrect?: number;
  lastActiveDay?: string;
  sprouts?: unknown[];
  planets?: unknown[];
  packDay?: string;
  packsToday?: string[];
  pendingClaim?: unknown;
  claimWait?: unknown[];
  attendStreak?: number;
  attendDay?: string;
  classAttendStreak?: number;
  classAttendDay?: string;
  track?: { day: string; [key: string]: unknown };
  missed?: { word: string; sound?: string }[];
  todayDone?: QuestId[];
};

function unionStrings(a: string[] = [], b: string[] = []) {
  return Array.from(new Set([...a, ...b]));
}

function uniqCollectibles<T extends { id?: string; seed?: string }>(a: T[] = [], b: T[] = []) {
  const map = new Map<string, T>();
  for (const row of [...a, ...b]) {
    const key = String(row.id || row.seed || JSON.stringify(row));
    map.set(key, row);
  }
  return Array.from(map.values());
}

export function progressStorageKey(userId: string, childIndex: number) {
  return `britbee_progress_${userId}_${childIndex}`;
}

export function mergeProgressState(local: Record<string, unknown>, remote: RemoteSnapshot | null | undefined, remoteSyncedAt?: string) {
  if (!remote) return local;
  const day = todayIst();
  const localDay = typeof local.lastActiveDay === "string" ? local.lastActiveDay : "";
  const remoteDay = typeof remote.lastActiveDay === "string" ? remote.lastActiveDay : "";
  const localTrack = local.track as RemoteSnapshot["track"] | undefined;
  const remoteTrack = remote.track;
  const localPacks = Array.isArray(local.packsToday) ? (local.packsToday as string[]) : [];
  const remotePacks = Array.isArray(remote.packsToday) ? remote.packsToday : [];

  return {
    ...local,
    points: Math.max(Number(local.points) || 0, Number(remote.points) || 0),
    streak: Math.max(Number(local.streak) || 0, Number(remote.streak) || 0),
    clearedSounds: unionStrings(
      Array.isArray(local.clearedSounds) ? (local.clearedSounds as string[]) : [],
      remote.clearedSounds || []
    ),
    verbsWeek: weekKey(),
    verbsCleared: unionStrings(
      Array.isArray(local.verbsCleared) ? (local.verbsCleared as string[]) : [],
      remote.verbsCleared || []
    ),
    prepCorrect: Math.max(Number(local.prepCorrect) || 0, Number(remote.prepCorrect) || 0),
    dailyKey: local.dailyKey === day || remote.dailyDone ? day : local.dailyKey,
    dailyEver: Boolean(local.dailyEver || remote.dailyEver),
    storyEver: Boolean(local.storyEver || remote.storyEver),
    storyCleared: Boolean(local.storyCleared || remote.storyEver),
    lastActiveDay: localDay >= remoteDay ? localDay || remoteDay : remoteDay,
    sprouts: uniqCollectibles(
      Array.isArray(local.sprouts) ? (local.sprouts as { id?: string; seed?: string }[]) : [],
      (remote.sprouts as { id?: string; seed?: string }[]) || []
    ),
    planets: uniqCollectibles(
      Array.isArray(local.planets) ? (local.planets as { id?: string; seed?: string }[]) : [],
      (remote.planets as { id?: string; seed?: string }[]) || []
    ),
    packDay: local.packDay === day || remote.packDay === day ? day : remote.packDay || local.packDay,
    packsToday:
      local.packDay === day && remote.packDay === day
        ? unionStrings(localPacks, remotePacks)
        : local.packDay === day
          ? localPacks
          : remote.packDay === day
            ? remotePacks
            : localPacks.length
              ? localPacks
              : remotePacks,
    pendingClaim: local.pendingClaim || remote.pendingClaim,
    claimWait: (Array.isArray(local.claimWait) && local.claimWait.length ? local.claimWait : remote.claimWait) || [],
    attendStreak: Math.max(Number(local.attendStreak) || 0, Number(remote.attendStreak) || 0),
    attendDay: (local.attendDay as string | undefined) || remote.attendDay,
    classAttendStreak: Math.max(Number(local.classAttendStreak) || 0, Number(remote.classAttendStreak) || 0),
    classAttendDay: (local.classAttendDay as string | undefined) || remote.classAttendDay,
    track: localTrack?.day === day ? localTrack : remoteTrack?.day === day ? remoteTrack : localTrack || remoteTrack,
    missed:
      Array.isArray(local.missed) && local.missed.length
        ? local.missed
        : Array.isArray(remote.missed)
          ? remote.missed
          : [],
    dayKey: day,
    todayDone:
      local.dayKey === day && Array.isArray(local.todayDone) && local.todayDone.length
        ? local.todayDone
        : remote.todayDone || [],
    _syncedAt: remoteSyncedAt || local._syncedAt,
  };
}
