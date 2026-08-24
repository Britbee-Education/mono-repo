import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { weekKey } from "@/data/phonics";
import { todayIst, yesterdayIst } from "@/lib/day";
import { mergeProgressState, progressStorageKey } from "@/lib/progressMerge";
import { useAuth } from "@/context/AuthContext";
import {
  ACTIVITY_BUZZ,
  beeRank,
  DAILY_QUESTS,
  HARVEST_PACK_KEY,
  HELLO_PACK_KEY,
  QUESTS,
  classPackKey,
  ensureYards,
  planetRewardForClassStreak,
  questUnlocked,
  sproutRewardForStreak,
  yardGardenYield,
  type PlanetReward,
  type SproutReward,
  type DayTrack,
  type ProgressSnapshot,
  type QuestId,
  type YardSlot,
} from "@/lib/quests";
import { api } from "@/lib/api";
import { playSfx, type SfxName } from "@/lib/sfx";

type ProgressState = {
  points: number;
  dailyKey?: string;
  dailyEver?: boolean;
  storyEver?: boolean;
  storyCleared?: boolean;
  streak?: number;
  streakDay?: string;
  lastActiveDay?: string;
  dayKey?: string;
  todayDone?: QuestId[];
  pendingClaim?: RewardClaim;
  clearedSounds?: string[];
  verbsWeek?: string;
  verbsCleared?: string[];
  prepCorrect?: number;
  prepToday?: number;
  track?: DayTrack;
  missed?: MissedWord[];
  packDay?: string;
  packsToday?: string[];
  attendStreak?: number;
  attendDay?: string;
  classAttendStreak?: number;
  classAttendDay?: string;
  sprouts?: CollectedSprout[];
  planets?: CollectedPlanet[];
  yards?: YardSlot[];
  harvestDay?: string;
  claimWait?: RewardClaim[];
  _syncedAt?: string;
};

export type MissedWord = { word: string; sound?: string };

export type CheerBurst = { id: number; points: number; message: string; sfx?: SfxName };

export type RewardClaim = {
  id: number;
  day: string;
  activityId?: QuestId;
  kind?: "quest" | "pack";
  packKey?: string;
  kid: string;
  emoji: string;
  points: number;
  streakGain: number;
  nextStreak: number;
  doneCount: number;
  dayComplete: boolean;
  unlockedKid?: string;
  unlockedEmoji?: string;
  nextTitle?: string;
  sproutReward?: SproutReward;
  planetReward?: PlanetReward;
  /** Snapshot of garden seed + worm boost applied to this pack. */
  gardenYield?: import("@/lib/quests").GardenYield;
};

export type CollectedSprout = SproutReward & {
  claimedAt: string;
  uid: string;
};

export type CollectedPlanet = PlanetReward & {
  claimedAt: string;
  uid: string;
};

type Ctx = {
  ready: boolean;
  points: number;
  streak: number;
  dailyDone: boolean;
  dailyEver: boolean;
  storyEver: boolean;
  clearedSounds: string[];
  verbsCleared: string[];
  prepCorrect: number;
  todayDone: QuestId[];
  pendingClaim: RewardClaim | null;
  track: DayTrack;
  rank: ReturnType<typeof beeRank>;
  snapshot: ProgressSnapshot;
  cheer: CheerBurst | null;
  combo: number;
  dismissCheer: () => void;
  claimReward: () => void;
  burst: (message: string, points?: number, sfx?: SfxName) => void;
  hitGame: (ok: boolean) => number;
  addPoints: (n: number, cheer?: string, sfx?: SfxName) => void;
  saveTrack: (patch: Partial<Omit<DayTrack, "day">>) => void;
  markDailyDone: (claim?: boolean) => void;
  markSoundClear: (id: string, claim?: boolean) => boolean;
  markVerbClear: (id: string, claim?: boolean) => boolean;
  markStoryDone: (claim?: boolean) => void;
  markPrepCorrect: (claim?: boolean) => number;
  finishQuest: (id: QuestId) => void;
  grantHelloPack: () => boolean;
  grantClassPack: (classId: string) => boolean;
  packsToday: string[];
  attendStreak: number;
  classAttendStreak: number;
  sprouts: CollectedSprout[];
  planets: CollectedPlanet[];
  helloReady: boolean;
  readyClassIds: string[];
  harvestReady: boolean;
  claimBadgeCount: number;
  yards: YardSlot[];
  walletSprouts: CollectedSprout[];
  walletWorms: CollectedPlanet[];
  plantSprout: (uid: string, yardIndex: number) => boolean;
  unplantYard: (yardIndex: number) => void;
  boostYard: (wormUid: string, yardIndex: number) => boolean;
  unboostYard: (wormUid: string, yardIndex?: number) => void;
  harvestYards: () => boolean;
  missed: MissedWord[];
  setMissed: (words: MissedWord[]) => void;
  clearMissedWord: (word: string) => void;
};

const ProgressContext = createContext<Ctx | null>(null);

async function readStore(key: string) {
  if (Platform.OS === "web") return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  return SecureStore.getItemAsync(key);
}
async function writeStore(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

const EMPTY_IDS: string[] = [];
const EMPTY_QUESTS: QuestId[] = [];
const EMPTY_MISSED: MissedWord[] = [];

function verbsForWeek(s: ProgressState) {
  const week = weekKey();
  return s.verbsWeek === week ? s.verbsCleared || EMPTY_IDS : EMPTY_IDS;
}

function trackFrom(s: ProgressState): DayTrack {
  const day = todayIst();
  if (s.dayKey === day && s.track?.day === day) return s.track;
  return { day };
}

function dropTrack(s: ProgressState, id: QuestId): DayTrack {
  const track = { ...trackFrom(s) };
  if (id === "phonics") delete track.phonics;
  if (id === "sentence") delete track.sentence;
  if (id === "story") delete track.story;
  if (id === "verbs") delete track.verbs;
  if (id === "prepositions") delete track.prepositions;
  return track;
}

function snapshotFrom(s: ProgressState): ProgressSnapshot {
  const day = todayIst();
  return {
    points: s.points,
    clearedSounds: s.clearedSounds || EMPTY_IDS,
    dailyDone: s.dailyKey === day,
    dailyEver: Boolean(s.dailyEver || s.dailyKey),
    storyEver: Boolean(s.storyEver || s.storyCleared),
    verbsCleared: verbsForWeek(s),
    prepCorrect: s.prepCorrect || 0,
    todayDone: s.dayKey === day ? s.todayDone || EMPTY_QUESTS : EMPTY_QUESTS,
  };
}

function continuedStreak(s: ProgressState, day: string) {
  const prev = s.streakDay || s.lastActiveDay;
  if (prev === day) return s.streak || 0;
  if (prev === yesterdayIst()) return (s.streak || 0) + 1;
  return 1;
}

function continuedAttend(s: ProgressState, day: string) {
  const prev = s.attendDay;
  if (prev === day) return s.attendStreak || 1;
  if (prev === yesterdayIst()) return (s.attendStreak || 0) + 1;
  return 1;
}

function continuedClassAttend(s: ProgressState, day: string) {
  const prev = s.classAttendDay;
  if (prev === day) return s.classAttendStreak || 1;
  if (prev === yesterdayIst()) return (s.classAttendStreak || 0) + 1;
  return 1;
}

function packsFrom(s: ProgressState): string[] {
  return s.packDay === todayIst() ? s.packsToday || EMPTY_IDS : EMPTY_IDS;
}

function collectibleUid(id: string, claimedAt: string) {
  return `${id}-${claimedAt}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateSprouts(list?: CollectedSprout[] | (Omit<CollectedSprout, "uid"> & { uid?: string })[]): CollectedSprout[] {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (item.uid) return item as CollectedSprout;
    return { ...item, uid: collectibleUid(item.id, item.claimedAt) } as CollectedSprout;
  });
}

function migratePlanets(list?: CollectedPlanet[] | (Omit<CollectedPlanet, "uid"> & { uid?: string })[]): CollectedPlanet[] {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (item.uid) return item as CollectedPlanet;
    return { ...item, uid: collectibleUid(item.id, item.claimedAt) } as CollectedPlanet;
  });
}

function normalizeState(s: ProgressState): ProgressState {
  return {
    ...s,
    sprouts: migrateSprouts(s.sprouts),
    planets: migratePlanets(s.planets),
    yards: ensureYards(s.yards),
  };
}

function plantedSproutUids(yards: YardSlot[]) {
  return new Set(yards.map((y) => y.sproutUid).filter(Boolean) as string[]);
}

function plantedWormUids(yards: YardSlot[]) {
  const set = new Set<string>();
  for (const y of yards) {
    for (const uid of y.wormUids || []) if (uid) set.add(uid);
  }
  return set;
}

function harvestClaimedToday(s: ProgressState) {
  const day = todayIst();
  if (s.harvestDay === day) return true;
  return packsFrom(s).includes(HARVEST_PACK_KEY);
}

function applyPending(s: ProgressState): ProgressState {
  const c = s.pendingClaim;
  if (!c) return s;
  let streak = s.streak || 0;
  let streakDay = s.streakDay;
  if (c.streakGain > 0 && streakDay !== c.day) {
    streak = continuedStreak(s, c.day);
    streakDay = c.day;
  }
  const wait = s.claimWait || [];
  const [nextClaim, ...rest] = wait;
  return {
    ...s,
    points: s.points + (c.points || 0),
    streak,
    streakDay,
    lastActiveDay: c.day,
    sprouts: c.sproutReward
      ? [
          ...(s.sprouts || []),
          {
            ...c.sproutReward,
            claimedAt: c.day,
            uid: collectibleUid(c.sproutReward.id, c.day),
          },
        ]
      : s.sprouts,
    planets: c.planetReward
      ? [
          ...(s.planets || []),
          {
            ...c.planetReward,
            claimedAt: c.day,
            uid: collectibleUid(c.planetReward.id, c.day),
          },
        ]
      : s.planets,
    pendingClaim: nextClaim,
    claimWait: rest,
  };
}

function drainClaims(s: ProgressState): ProgressState {
  let next = s;
  let guard = 0;
  while (next.pendingClaim && guard < 12) {
    next = applyPending(next);
    guard += 1;
  }
  return next;
}

function ensureDay(s: ProgressState): ProgressState {
  const day = todayIst();
  if (s.dayKey === day) {
    if (s.track && s.track.day !== day) return { ...s, track: { day } };
    return s;
  }
  const next = drainClaims(s);
  return {
    ...next,
    dayKey: day,
    todayDone: [],
    prepToday: 0,
    track: { day },
    missed: [],
    packsToday: [],
    packDay: undefined,
    claimWait: [],
  };
}

function pushClaim(s: ProgressState, claim: RewardClaim): ProgressState {
  if (s.pendingClaim) {
    return { ...s, claimWait: [...(s.claimWait || []), claim] };
  }
  return { ...s, pendingClaim: claim };
}

function enqueuePack(
  s: ProgressState,
  key: string,
  kid: string,
  emoji: string,
  points: number,
  extra?: Partial<ProgressState>,
  claimExtra?: Partial<RewardClaim>
): ProgressState {
  const day = todayIst();
  const packs = packsFrom(s);
  if (packs.includes(key)) return s;
  const nextPoints = s.points + points;
  const leveled = beeRank(nextPoints).level > beeRank(s.points).level;
  const claim: RewardClaim = {
    id: Date.now(),
    day,
    kind: "pack",
    packKey: key,
    kid,
    emoji,
    points,
    streakGain: 0,
    nextStreak: s.streak || 0,
    doneCount: (s.todayDone || []).length,
    dayComplete: false,
    nextTitle: leveled ? beeRank(nextPoints).title : undefined,
    ...claimExtra,
  };
  return pushClaim(
    {
      ...s,
      ...extra,
      packDay: day,
      packsToday: [...packs, key],
      lastActiveDay: day,
    },
    claim
  );
}

function queueHelloPack(s: ProgressState): ProgressState {
  const day = todayIst();
  if (packsFrom(s).includes(HELLO_PACK_KEY)) return s;
  const attendStreak = continuedAttend(s, day);
  const sproutReward = sproutRewardForStreak(attendStreak);
  return enqueuePack(
    s,
    HELLO_PACK_KEY,
    "Daily Sprouts",
    "🌱",
    sproutReward.points,
    {
      attendStreak,
      attendDay: day,
    },
    { sproutReward }
  );
}

function queueClassPack(s: ProgressState, classId: string): ProgressState {
  const key = classPackKey(classId);
  const day = todayIst();
  const newClassStreak = continuedClassAttend(s, day);
  const planetReward = planetRewardForClassStreak(newClassStreak);
  return enqueuePack(
    s,
    key,
    "Class Worm",
    "🪱",
    planetReward.points,
    {
      classAttendStreak: newClassStreak,
      classAttendDay: day,
    },
    { planetReward }
  );
}

function queueHarvestPack(s: ProgressState): ProgressState {
  if (harvestClaimedToday(s)) return s;
  const yards = ensureYards(s.yards);
  const grown = yardGardenYield({
    yards,
    sprouts: s.sprouts || [],
    planets: s.planets || [],
  });
  if (grown.plantedCount < 1) return s;
  const day = todayIst();
  return enqueuePack(
    s,
    HARVEST_PACK_KEY,
    "Yard Harvest",
    "🌻",
    grown.finalPoints,
    { harvestDay: day },
    { gardenYield: grown }
  );
}

function queueClaim(s: ProgressState, id: QuestId, prior?: ProgressState): ProgressState {
  const day = todayIst();
  const quest = QUESTS.find((q) => q.id === id);
  const done = s.todayDone || [];
  const before = snapshotFrom(prior || s);
  const already = done.includes(id);
  const todayDone = already ? done : [...done, id];
  const after = snapshotFrom({ ...s, todayDone });
  const newly = QUESTS.find((q) => questUnlocked(q.id, after) && !questUnlocked(q.id, before));
  if (already && !newly) return s;

  const points = already ? 0 : ACTIVITY_BUZZ[id];
  const dayComplete = todayDone.length >= DAILY_QUESTS;
  const streakGain = !already && dayComplete && s.streakDay !== day ? 1 : 0;
  const nextStreak = streakGain ? continuedStreak(s, day) : s.streak || 0;
  const nextPoints = s.points + points;
  const leveled = beeRank(nextPoints).level > beeRank(s.points).level;

  const claim: RewardClaim = {
    id: Date.now(),
    day,
    kind: "quest",
    activityId: id,
    kid: quest?.kid || "Activity",
    emoji: quest?.emoji || "⭐",
    points,
    streakGain,
    nextStreak,
    doneCount: todayDone.length,
    dayComplete,
    unlockedKid: newly?.kid,
    unlockedEmoji: newly?.emoji,
    nextTitle: leveled ? beeRank(nextPoints).title : undefined,
  };

  return pushClaim(
    {
      ...s,
      todayDone,
      lastActiveDay: day,
      track: dropTrack(s, id),
      missed: id === "story" ? [] : s.missed,
    },
    claim
  );
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || "";
  const childIndex = user?.role === "parent" ? Number(user.activeChildIndex) || 0 : 0;
  const storageKey = userId ? progressStorageKey(userId, childIndex) : "";

  const [ready, setReady] = useState(false);
  const [state, setState] = useState<ProgressState>({ points: 0, yards: ensureYards() });
  const [cheer, setCheer] = useState<CheerBurst | null>(null);
  const [combo, setCombo] = useState(0);
  const [readyClassIds, setReadyClassIds] = useState<string[]>([]);
  const comboRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const pushToServer = useCallback(async () => {
    if (!userId) return;
    const s = stateRef.current;
    const snap = snapshotFrom(s);
    const res = await api.syncProgress({
      ...snap,
      streak: s.streak || 0,
      lastActiveDay: s.lastActiveDay,
      sprouts: s.sprouts || [],
      planets: s.planets || [],
      yards: ensureYards(s.yards),
      packDay: s.packDay,
      packsToday: s.packsToday,
      pendingClaim: s.pendingClaim || undefined,
      claimWait: s.claimWait || [],
      attendStreak: s.attendStreak,
      attendDay: s.attendDay,
      classAttendStreak: s.classAttendStreak,
      classAttendDay: s.classAttendDay,
      harvestDay: s.harvestDay,
      track: s.track,
      missed: s.missed || [],
      todayDone: s.dayKey === todayIst() ? s.todayDone || [] : [],
    });
    if (res?.syncedAt) {
      setState((prev) => ({ ...prev, _syncedAt: res.syncedAt }));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !storageKey) {
      setReady(true);
      return;
    }
    let mounted = true;
    setReady(false);

    (async () => {
      let local: Record<string, unknown> = { points: 0 };
      const raw = await readStore(storageKey);
      if (raw) {
        try {
          local = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          local = { points: 0 };
        }
      } else if (childIndex === 0) {
        const legacy = await readStore("britbee_progress");
        if (legacy) {
          try {
            local = JSON.parse(legacy) as Record<string, unknown>;
          } catch {
            local = { points: 0 };
          }
        }
      }

      let remoteSnap: Record<string, unknown> | null = null;
      let remoteSyncedAt: string | undefined;
      try {
        const remote = await api.progressLoad();
        remoteSnap = (remote?.snapshot as Record<string, unknown>) || null;
        remoteSyncedAt = remote?.syncedAt;
      } catch {
        remoteSnap = null;
      }

      if (!mounted) return;
      const merged = normalizeState(
        mergeProgressState(local, remoteSnap as any, remoteSyncedAt) as ProgressState
      );
      setState(merged);
      setReady(true);
    })().catch(() => {
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
    };
  }, [userId, childIndex, storageKey]);

  useEffect(() => {
    if (!ready || !storageKey) return;
    writeStore(storageKey, JSON.stringify(state)).catch(() => undefined);
  }, [state, ready, storageKey]);

  const dismissCheer = useCallback(() => setCheer(null), []);
  const burst = useCallback((message: string, points = 0, sfx?: SfxName) => {
    setCheer({ id: Date.now(), points, message, sfx: sfx || (points >= 5 ? "fanfare" : "coin") });
  }, []);

  const claimReward = useCallback(() => {
    setState((s) => applyPending(s));
  }, []);

  const addPoints = useCallback((n: number, message?: string, sfx?: SfxName) => {
    setState((s) => {
      const nextPoints = s.points + n;
      const leveled = beeRank(nextPoints).level > beeRank(s.points).level;
      const title = beeRank(nextPoints).title;
      setTimeout(() => {
        if (leveled) setCheer({ id: Date.now(), points: n, message: `${title}!`, sfx: "fanfare" });
        else if (message) setCheer({ id: Date.now(), points: n, message, sfx: sfx || (n >= 5 ? "fanfare" : "coin") });
      }, 0);
      return { ...s, points: nextPoints };
    });
  }, []);

  const hitGame = useCallback((ok: boolean) => {
    if (!ok) {
      comboRef.current = 0;
      setCombo(0);
      playSfx("miss");
      return 0;
    }
    const next = comboRef.current + 1;
    comboRef.current = next;
    setCombo(next);
    playSfx(next >= 3 && next % 3 === 0 ? "combo" : next >= 2 ? "star" : "ok");
    return next;
  }, []);

  const saveTrack = useCallback((patch: Partial<Omit<DayTrack, "day">>) => {
    setState((s) => {
      const day = ensureDay(s);
      const prev = trackFrom(day);
      return { ...day, track: { ...prev, ...patch, day: todayIst() } };
    });
  }, []);

  const markDailyDone = useCallback((claim = false) => {
    setState((s) => {
      const day = ensureDay(s);
      const next = { ...day, dailyKey: todayIst(), dailyEver: true };
      return claim ? queueClaim(next, "sentence", day) : next;
    });
  }, []);

  const markSoundClear = useCallback((id: string, claim = false) => {
    let isNew = false;
    setState((s) => {
      const day = ensureDay(s);
      const ids = day.clearedSounds || [];
      isNew = !ids.includes(id);
      const next = { ...day, clearedSounds: isNew ? [...ids, id] : ids };
      return claim ? queueClaim(next, "phonics", day) : next;
    });
    return isNew;
  }, []);

  const markVerbClear = useCallback((id: string, claim = false) => {
    let isNew = false;
    setState((s) => {
      const day = ensureDay(s);
      const week = weekKey();
      const list = day.verbsWeek === week ? day.verbsCleared || [] : [];
      isNew = !list.includes(id);
      const next = { ...day, verbsWeek: week, verbsCleared: isNew ? [...list, id] : list };
      return claim ? queueClaim(next, "verbs", day) : next;
    });
    return isNew;
  }, []);

  const markStoryDone = useCallback((claim = false) => {
    setState((s) => {
      const day = ensureDay(s);
      const next = { ...day, storyEver: true, storyCleared: true };
      return claim ? queueClaim(next, "story", day) : next;
    });
  }, []);

  const markPrepCorrect = useCallback((claim = false) => {
    let count = 0;
    setState((s) => {
      const day = ensureDay(s);
      const prepToday = (day.prepToday || 0) + 1;
      count = (day.prepCorrect || 0) + 1;
      const next = { ...day, prepCorrect: count, prepToday };
      return claim ? queueClaim(next, "prepositions", day) : next;
    });
    return count;
  }, []);

  const finishQuest = useCallback((id: QuestId) => {
    setState((s) => queueClaim(ensureDay(s), id));
  }, []);

  const grantHelloPack = useCallback(() => {
    let granted = false;
    setState((s) => {
      const day = ensureDay(s);
      if (packsFrom(day).includes(HELLO_PACK_KEY)) return day;
      granted = true;
      return queueHelloPack(day);
    });
    return granted;
  }, []);

  const grantClassPack = useCallback((classId: string) => {
    let granted = false;
    setState((s) => {
      const day = ensureDay(s);
      const key = classPackKey(classId);
      if (packsFrom(day).includes(key)) return day;
      granted = true;
      return queueClassPack(day, classId);
    });
    if (granted) {
      setReadyClassIds((prev) => prev.filter((id) => id !== classId));
    }
    return granted;
  }, []);

  const plantSprout = useCallback((uid: string, yardIndex: number) => {
    let ok = false;
    setState((s) => {
      const yards = ensureYards(s.yards).map((y) => ({
        ...y,
        wormUids: [...(y.wormUids || [])],
      }));
      const sprout = (s.sprouts || []).find((row) => row.uid === uid);
      if (!sprout) return s;
      if (plantedSproutUids(yards).has(uid)) return s;
      const slot = yards.find((y) => y.index === yardIndex);
      if (!slot || slot.sproutUid) return s;
      slot.sproutUid = uid;
      ok = true;
      return { ...s, yards };
    });
    return ok;
  }, []);

  const unplantYard = useCallback((yardIndex: number) => {
    setState((s) => {
      const yards = ensureYards(s.yards).map((y) =>
        y.index === yardIndex ? { index: y.index, wormUids: [] } : { ...y, wormUids: [...(y.wormUids || [])] }
      );
      return { ...s, yards };
    });
  }, []);

  const boostYard = useCallback((wormUid: string, yardIndex: number) => {
    let ok = false;
    setState((s) => {
      const yards = ensureYards(s.yards).map((y) => ({
        ...y,
        wormUids: [...(y.wormUids || [])],
      }));
      const worm = (s.planets || []).find((row) => row.uid === wormUid);
      if (!worm) return s;
      if (plantedWormUids(yards).has(wormUid)) return s;
      const slot = yards.find((y) => y.index === yardIndex);
      if (!slot?.sproutUid) return s;
      slot.wormUids = [...(slot.wormUids || []), wormUid];
      ok = true;
      return { ...s, yards };
    });
    return ok;
  }, []);

  const unboostYard = useCallback((wormUid: string, yardIndex?: number) => {
    setState((s) => {
      const yards = ensureYards(s.yards).map((y) => {
        if (yardIndex !== undefined && y.index !== yardIndex) {
          return { ...y, wormUids: [...(y.wormUids || [])] };
        }
        return {
          ...y,
          wormUids: (y.wormUids || []).filter((uid) => uid !== wormUid),
        };
      });
      return { ...s, yards };
    });
  }, []);

  const harvestYards = useCallback(() => {
    let granted = false;
    setState((s) => {
      const day = ensureDay(s);
      if (harvestClaimedToday(day)) return day;
      const grown = yardGardenYield({
        yards: day.yards,
        sprouts: day.sprouts || [],
        planets: day.planets || [],
      });
      if (grown.plantedCount < 1) return day;
      granted = true;
      return queueHarvestPack(day);
    });
    return granted;
  }, []);

  const setMissed = useCallback((words: MissedWord[]) => {
    setState((s) => ({ ...s, missed: words }));
  }, []);

  const clearMissedWord = useCallback((word: string) => {
    setState((s) => ({
      ...s,
      missed: (s.missed || []).filter((w) => w.word.toLowerCase() !== word.toLowerCase()),
    }));
  }, []);

  const clearedSounds = state.clearedSounds || EMPTY_IDS;
  const verbsCleared = verbsForWeek(state);
  const snapshot = useMemo(() => snapshotFrom(state), [state]);
  const todayDone = snapshot.todayDone;
  const track = useMemo(() => trackFrom(state), [state]);
  const missed = state.missed || EMPTY_MISSED;
  const yards = useMemo(() => ensureYards(state.yards), [state.yards]);
  const sprouts = state.sprouts || [];
  const planets = state.planets || [];
  const plantedSprouts = useMemo(() => plantedSproutUids(yards), [yards]);
  const plantedWorms = useMemo(() => plantedWormUids(yards), [yards]);
  const walletSprouts = useMemo(
    () => sprouts.filter((s) => s.uid && !plantedSprouts.has(s.uid)),
    [sprouts, plantedSprouts]
  );
  const walletWorms = useMemo(
    () => planets.filter((p) => p.uid && !plantedWorms.has(p.uid)),
    [planets, plantedWorms]
  );
  const packsToday = packsFrom(state);
  const helloReady = !packsToday.includes(HELLO_PACK_KEY);
  const harvestReady =
    yards.some((y) => Boolean(y.sproutUid)) && !harvestClaimedToday(state);
  const claimBadgeCount =
    (helloReady ? 1 : 0) +
    readyClassIds.length +
    (harvestReady ? 1 : 0) +
    (state.pendingClaim ? 1 : 0) +
    (state.claimWait?.length || 0);

  useEffect(() => {
    if (!ready || !userId) return;
    const timer = setTimeout(() => {
      void pushToServer();
    }, 500);
    return () => clearTimeout(timer);
  }, [
    ready,
    userId,
    snapshot,
    state.streak,
    state.lastActiveDay,
    state.sprouts,
    state.planets,
    state.yards,
    state.harvestDay,
    state.packDay,
    state.packsToday,
    state.pendingClaim,
    state.claimWait,
    state.attendStreak,
    state.attendDay,
    state.classAttendStreak,
    state.classAttendDay,
    state.track,
    state.missed,
    state.todayDone,
    state.dayKey,
    pushToServer,
  ]);

  useEffect(() => {
    if (!ready || !userId) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") void pushToServer();
      if (next === "active") {
        void api.progressLoad().then((remote) => {
          const snap = remote?.snapshot;
          if (!snap) return;
          setState((prev) =>
            normalizeState(
              mergeProgressState(prev as Record<string, unknown>, snap, remote?.syncedAt) as ProgressState
            )
          );
        });
      }
    });
    return () => sub.remove();
  }, [ready, userId, pushToServer]);

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;

    const syncEndedClasses = async () => {
      try {
        const data = await api.classes();
        if (cancelled) return;
        const endedJoined = (data.classes || []).filter(
          (cls) => cls.status === "ended" && cls.joinedByMe
        );
        const packs = packsFrom(stateRef.current);
        const readyIds: string[] = [];
        for (const cls of endedJoined) {
          const key = classPackKey(cls.id);
          if (packs.includes(key)) continue;
          await api.classClaim(cls.id).catch(() => undefined);
          if (cancelled) return;
          readyIds.push(cls.id);
        }
        if (!cancelled) setReadyClassIds(readyIds);
      } catch {
        // ignore poll errors
      }
    };

    void syncEndedClasses();
    const t = setInterval(() => void syncEndedClasses(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [ready, userId]);

  useEffect(() => {
    const packs = packsFrom(state);
    setReadyClassIds((prev) => prev.filter((id) => !packs.includes(classPackKey(id))));
  }, [state.packsToday, state.packDay]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      points: state.points,
      streak: state.streak || 0,
      dailyDone: snapshot.dailyDone,
      dailyEver: snapshot.dailyEver,
      storyEver: snapshot.storyEver,
      clearedSounds,
      verbsCleared,
      prepCorrect: snapshot.prepCorrect,
      todayDone,
      pendingClaim: state.pendingClaim || null,
      track,
      rank: beeRank(state.points),
      snapshot,
      cheer,
      combo,
      dismissCheer,
      claimReward,
      burst,
      hitGame,
      addPoints,
      saveTrack,
      markDailyDone,
      markSoundClear,
      markVerbClear,
      markStoryDone,
      markPrepCorrect,
      finishQuest,
      grantHelloPack,
      grantClassPack,
      packsToday,
      attendStreak: state.attendDay === todayIst() ? state.attendStreak || 0 : 0,
      classAttendStreak:
        state.classAttendDay === todayIst()
          ? state.classAttendStreak || 0
          : state.classAttendStreak || 0,
      sprouts,
      planets,
      helloReady,
      readyClassIds,
      harvestReady,
      claimBadgeCount,
      yards,
      walletSprouts,
      walletWorms,
      plantSprout,
      unplantYard,
      boostYard,
      unboostYard,
      harvestYards,
      missed,
      setMissed,
      clearMissedWord,
    }),
    [
      ready,
      state.points,
      state.streak,
      state.pendingClaim,
      state.claimWait,
      snapshot,
      cheer,
      combo,
      dismissCheer,
      claimReward,
      burst,
      hitGame,
      addPoints,
      saveTrack,
      markDailyDone,
      markSoundClear,
      markVerbClear,
      markStoryDone,
      markPrepCorrect,
      finishQuest,
      grantHelloPack,
      grantClassPack,
      missed,
      setMissed,
      clearMissedWord,
      clearedSounds,
      verbsCleared,
      todayDone,
      track,
      packsToday,
      state.attendStreak,
      state.attendDay,
      state.classAttendStreak,
      state.classAttendDay,
      sprouts,
      planets,
      helloReady,
      readyClassIds,
      harvestReady,
      claimBadgeCount,
      yards,
      walletSprouts,
      walletWorms,
      plantSprout,
      unplantYard,
      boostYard,
      unboostYard,
      harvestYards,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress requires ProgressProvider");
  return ctx;
}
