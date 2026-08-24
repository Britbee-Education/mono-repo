import fs from "fs";
import path from "path";

export const ACTIVITY_IDS = ["phonics", "sentence", "story", "verbs", "prepositions"] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

export type CoachStatus = "not-started" | "assigned" | "in-progress" | "needs-review" | "cleared";

export type AppSnapshot = {
  points: number;
  streak: number;
  clearedSounds: string[];
  dailyDone: boolean;
  dailyEver: boolean;
  storyEver: boolean;
  verbsCleared: string[];
  prepCorrect: number;
  lastActiveDay?: string;
  // Collections + reward progress (stored so rewards survive reloads/devices).
  sprouts?: unknown[];
  planets?: unknown[];
  yards?: unknown[];
  harvestDay?: string;
  packDay?: string;
  packsToday?: string[];
  pendingClaim?: unknown;
  claimWait?: unknown[];
  attendStreak?: number;
  attendDay?: string;
  classAttendStreak?: number;
  classAttendDay?: string;
  track?: { day: string; phonics?: unknown; sentence?: unknown; story?: unknown; verbs?: unknown; prepositions?: unknown };
  missed?: { word: string; sound?: string }[];
  todayDone?: string[];
};

export type LearnerProgress = {
  learnerId: string;
  snapshot: AppSnapshot;
  syncedAt: string;
};

export type CoachRecord = {
  learnerId: string;
  activityId: ActivityId;
  status?: CoachStatus;
  focusItem?: string;
  coachNote?: string;
  updatedAt: string;
  guideId?: string;
  guideName?: string;
};

export type ActivityEvent = {
  id: string;
  learnerId: string;
  activityId: ActivityId;
  kind: "status" | "focus" | "note";
  text: string;
  createdAt: string;
  guideName: string;
};

export type SocialEvent = {
  id: string;
  learnerId: string;
  activityId?: ActivityId;
  text: string;
  createdAt: string;
};

export type HiveChallenge = {
  id: string;
  kind: "hive" | "peer" | "guide";
  fromId: string;
  fromName: string;
  toId: string;
  activityId: ActivityId;
  day: string;
  createdAt: string;
  doneIds: string[];
};

type Disk = {
  nextEventId: number;
  nextSocialId: number;
  progress: LearnerProgress[];
  coach: CoachRecord[];
  events: ActivityEvent[];
  social: SocialEvent[];
  challenges: HiveChallenge[];
};

const DATA_PATH = path.resolve(__dirname, "../data/activity-board.json");

const g = globalThis as unknown as {
  __britbeeBoard?: Disk;
  __britbeeBoardLoaded?: boolean;
};

function empty(): Disk {
  return { nextEventId: 1, nextSocialId: 1, progress: [], coach: [], events: [], social: [], challenges: [] };
}

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
    g.__britbeeBoard = {
      nextEventId: Number(parsed.nextEventId) || 1,
      nextSocialId: Number(parsed.nextSocialId) || 1,
      progress: Array.isArray(parsed.progress) ? parsed.progress : [],
      coach: Array.isArray(parsed.coach) ? parsed.coach : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      social: Array.isArray(parsed.social) ? parsed.social : [],
      challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
    };
  } catch {
    g.__britbeeBoard = empty();
  }
  g.__britbeeBoardLoaded = true;
}

function persist() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store().__britbeeBoard, null, 2));
}

function store() {
  if (!g.__britbeeBoardLoaded) load();
  if (!g.__britbeeBoard) g.__britbeeBoard = empty();
  return g;
}

function coachKey(learnerId: string, activityId: ActivityId) {
  return `${learnerId}:${activityId}`;
}

export function isActivityId(value: string): value is ActivityId {
  return (ACTIVITY_IDS as readonly string[]).includes(value);
}

function snapshotDone(activityId: ActivityId, snap: AppSnapshot, day: string) {
  if (activityId === "sentence") return Boolean(snap.dailyDone);
  if (activityId === "phonics") return (snap.clearedSounds?.length || 0) >= 1 && snap.lastActiveDay === day;
  if (activityId === "story") return Boolean(snap.storyEver);
  if (activityId === "verbs") return (snap.verbsCleared?.length || 0) >= 3;
  if (activityId === "prepositions") return (snap.prepCorrect || 0) >= 5;
  return snap.lastActiveDay === day;
}

function socialDiff(prev: AppSnapshot | undefined, next: AppSnapshot): { activityId?: ActivityId; text: string }[] {
  const out: { activityId?: ActivityId; text: string }[] = [];
  const prevSounds = prev?.clearedSounds?.length || 0;
  const nextSounds = next.clearedSounds?.length || 0;
  if (nextSounds > prevSounds) {
    out.push({
      activityId: "phonics",
      text: nextSounds === 1 ? "cleared a first sound in Sound Lab" : "mastered another sound",
    });
  }
  if (next.dailyDone && !prev?.dailyDone) out.push({ activityId: "sentence", text: "finished today's Daily Buzz" });
  if (next.storyEver && !prev?.storyEver) out.push({ activityId: "story", text: "finished Story Trail" });
  if ((next.verbsCleared?.length || 0) >= 3 && (prev?.verbsCleared?.length || 0) < 3) {
    out.push({ activityId: "verbs", text: "acted out 3 verbs this week" });
  }
  if ((next.prepCorrect || 0) >= 5 && (prev?.prepCorrect || 0) < 5) {
    out.push({ activityId: "prepositions", text: "cleared Bee Maps" });
  }
  if ((next.streak || 0) > (prev?.streak || 0) && (next.streak || 0) >= 2) {
    out.push({ text: `is on a ${next.streak}-day streak` });
  }
  return out;
}

export const activityBoard = {
  getProgress(learnerId: string) {
    return store().__britbeeBoard!.progress.find((p) => p.learnerId === learnerId) || null;
  },
  progressMap(learnerIds: string[]) {
    const wanted = new Set(learnerIds);
    const map = new Map<string, LearnerProgress>();
    for (const row of store().__britbeeBoard!.progress) {
      if (wanted.has(row.learnerId)) map.set(row.learnerId, row);
    }
    return map;
  },
  saveProgress(learnerId: string, snapshot: AppSnapshot, day?: string) {
    const s = store();
    const prev = s.__britbeeBoard!.progress.find((p) => p.learnerId === learnerId);
    const row: LearnerProgress = { learnerId, snapshot, syncedAt: new Date().toISOString() };
    const i = s.__britbeeBoard!.progress.findIndex((p) => p.learnerId === learnerId);
    if (i >= 0) s.__britbeeBoard!.progress[i] = row;
    else s.__britbeeBoard!.progress.push(row);

    const now = row.syncedAt;
    const diffs = socialDiff(prev?.snapshot, snapshot);
    for (const d of diffs) {
      s.__britbeeBoard!.social.unshift({
        id: `soc-${s.__britbeeBoard!.nextSocialId++}`,
        learnerId,
        activityId: d.activityId,
        text: d.text,
        createdAt: now,
      });
    }
    s.__britbeeBoard!.social = s.__britbeeBoard!.social.slice(0, 240);

    if (day) {
      for (const ch of s.__britbeeBoard!.challenges) {
        if (ch.day !== day) continue;
        const forMe = ch.toId === "*" || ch.toId === learnerId || ch.fromId === learnerId;
        if (!forMe) continue;
        if (snapshotDone(ch.activityId, snapshot, day) && !ch.doneIds.includes(learnerId)) {
          ch.doneIds.push(learnerId);
        }
      }
    }

    persist();
    return { row, events: diffs };
  },
  getCoach(learnerId: string, activityId: ActivityId) {
    return (
      store().__britbeeBoard!.coach.find((c) => c.learnerId === learnerId && c.activityId === activityId) || null
    );
  },
  coachForLearner(learnerId: string) {
    return store().__britbeeBoard!.coach.filter((c) => c.learnerId === learnerId);
  },
  coachMap() {
    const map = new Map<string, CoachRecord>();
    for (const row of store().__britbeeBoard!.coach) {
      map.set(coachKey(row.learnerId, row.activityId), row);
    }
    return map;
  },
  upsertCoach(
    input: {
      learnerId: string;
      activityId: ActivityId;
      status?: CoachStatus;
      focusItem?: string;
      coachNote?: string;
      guideId?: string;
      guideName?: string;
    }
  ) {
    const s = store();
    const now = new Date().toISOString();
    const prev = s.__britbeeBoard!.coach.find(
      (c) => c.learnerId === input.learnerId && c.activityId === input.activityId
    );
    const next: CoachRecord = {
      learnerId: input.learnerId,
      activityId: input.activityId,
      status: input.status ?? prev?.status,
      focusItem: input.focusItem !== undefined ? input.focusItem : prev?.focusItem,
      coachNote: input.coachNote !== undefined ? input.coachNote : prev?.coachNote,
      updatedAt: now,
      guideId: input.guideId || prev?.guideId,
      guideName: input.guideName || prev?.guideName,
    };
    if (prev) {
      Object.assign(prev, next);
    } else {
      s.__britbeeBoard!.coach.push(next);
    }

    const events: ActivityEvent[] = [];
    const actor = input.guideName || "Guide";
    if (input.status && input.status !== prev?.status) {
      events.push({
        id: String(s.__britbeeBoard!.nextEventId++),
        learnerId: input.learnerId,
        activityId: input.activityId,
        kind: "status",
        text: `Status → ${input.status}`,
        createdAt: now,
        guideName: actor,
      });
    }
    if (input.focusItem !== undefined && input.focusItem !== (prev?.focusItem || "")) {
      events.push({
        id: String(s.__britbeeBoard!.nextEventId++),
        learnerId: input.learnerId,
        activityId: input.activityId,
        kind: "focus",
        text: input.focusItem ? `Focus → ${input.focusItem}` : "Focus cleared",
        createdAt: now,
        guideName: actor,
      });
    }
    if (input.coachNote !== undefined && input.coachNote !== (prev?.coachNote || "")) {
      events.push({
        id: String(s.__britbeeBoard!.nextEventId++),
        learnerId: input.learnerId,
        activityId: input.activityId,
        kind: "note",
        text: input.coachNote || "Coach note cleared",
        createdAt: now,
        guideName: actor,
      });
    }
    if (events.length) {
      s.__britbeeBoard!.events.unshift(...events);
      s.__britbeeBoard!.events = s.__britbeeBoard!.events.slice(0, 400);
    }
    persist();
    return { record: next, events };
  },
  eventsFor(activityId?: ActivityId, learnerId?: string) {
    return store()
      .__britbeeBoard!.events.filter((e) => {
        if (activityId && e.activityId !== activityId) return false;
        if (learnerId && e.learnerId !== learnerId) return false;
        return true;
      })
      .slice(0, 80);
  },
  socialFeed(limit = 40) {
    return store().__britbeeBoard!.social.slice(0, limit);
  },
  challengesForDay(day: string) {
    return store().__britbeeBoard!.challenges.filter((c) => c.day === day);
  },
  allChallenges() {
    return store().__britbeeBoard!.challenges;
  },
  ensureHiveRace(day: string) {
    const s = store();
    let row = s.__britbeeBoard!.challenges.find((c) => c.kind === "hive" && c.day === day);
    if (!row) {
      row = {
        id: `ch-${s.__britbeeBoard!.nextSocialId++}`,
        kind: "hive",
        fromId: "guide:maya",
        fromName: "Maya",
        toId: "*",
        activityId: "sentence",
        day,
        createdAt: new Date().toISOString(),
        doneIds: [],
      };
      s.__britbeeBoard!.challenges.unshift(row);
      persist();
    }
    return row;
  },
  addChallenge(input: Omit<HiveChallenge, "id" | "createdAt" | "doneIds"> & { doneIds?: string[] }) {
    const s = store();
    const row: HiveChallenge = {
      ...input,
      id: `ch-${s.__britbeeBoard!.nextSocialId++}`,
      createdAt: new Date().toISOString(),
      doneIds: input.doneIds || [],
    };
    s.__britbeeBoard!.challenges.unshift(row);
    persist();
    return row;
  },
  pushSocial(event: Omit<SocialEvent, "id" | "createdAt"> & { createdAt?: string }) {
    const s = store();
    const row: SocialEvent = {
      id: `soc-${s.__britbeeBoard!.nextSocialId++}`,
      learnerId: event.learnerId,
      activityId: event.activityId,
      text: event.text,
      createdAt: event.createdAt || new Date().toISOString(),
    };
    s.__britbeeBoard!.social.unshift(row);
    s.__britbeeBoard!.social = s.__britbeeBoard!.social.slice(0, 240);
    persist();
    return row;
  },
  snapshotDone,
  flush() {
    persist();
  },
};
