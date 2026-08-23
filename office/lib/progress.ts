import type { ActivityId, CoachStatus } from "./activities";

export type AppSnapshot = {
  points: number;
  streak?: number;
  clearedSounds: string[];
  dailyDone: boolean;
  dailyEver: boolean;
  storyEver: boolean;
  verbsCleared: string[];
  prepCorrect: number;
  lastActiveDay?: string;
};

export type CoachRecord = {
  learnerId: string;
  activityId: ActivityId;
  status?: CoachStatus;
  focusItem?: string;
  coachNote?: string;
  updatedAt?: string;
  guideName?: string;
} | null;

export function deriveStatus(id: ActivityId, snap: AppSnapshot | null): CoachStatus {
  if (!snap) return "not-started";
  const sounds = snap.clearedSounds || [];
  const verbs = snap.verbsCleared || [];
  const prep = snap.prepCorrect || 0;
  if (id === "phonics") {
    if (sounds.length || snap.points > 0) return "in-progress";
    return "not-started";
  }
  if (id === "sentence") return snap.dailyDone ? "cleared" : snap.dailyEver ? "in-progress" : "not-started";
  if (id === "story") return snap.storyEver ? "cleared" : "not-started";
  if (id === "verbs") {
    if (verbs.length >= 3) return "cleared";
    if (verbs.length) return "in-progress";
    return "not-started";
  }
  if (id === "prepositions") {
    if (prep >= 5) return "cleared";
    if (prep) return "in-progress";
    return "not-started";
  }
  return "not-started";
}

export function displayStatus(id: ActivityId, coach: CoachRecord, snap: AppSnapshot | null): CoachStatus {
  return coach?.status || deriveStatus(id, snap);
}

export function activityStatLine(id: ActivityId, snap: AppSnapshot | null) {
  if (!snap) return "App has not synced yet";
  if (id === "phonics") {
    const n = snap.clearedSounds?.length || 0;
    return `${n} sound${n === 1 ? "" : "s"} mastered`;
  }
  if (id === "sentence") return snap.dailyDone ? "Today’s sentence cleared" : snap.dailyEver ? "Done before · not yet today" : "Not done";
  if (id === "story") return snap.storyEver ? "Story trail finished" : "Not finished";
  if (id === "verbs") return `${snap.verbsCleared?.length || 0}/8 actions this week`;
  if (id === "prepositions") return `${snap.prepCorrect || 0} maps correct`;
  return `${snap.points} Buzz`;
}

export function formatWhen(iso?: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
