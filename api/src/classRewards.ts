import { activityBoard, type AppSnapshot } from "./activityStore";
import { istStamp } from "./notifyStore";

const CLASS_PACK_SCHEDULE = [
  { day: 1, total: 15 },
  { day: 2, total: 18 },
  { day: 3, total: 20 },
  { day: 4, total: 22 },
  { day: 5, total: 25 },
  { day: 7, total: 28 },
  { day: 10, total: 32 },
  { day: 14, total: 35 },
];

function todayIst() {
  return istStamp().day;
}

function yesterdayIst(day: string) {
  const d = new Date(`${day}T12:00:00+05:30`);
  d.setDate(d.getDate() - 1);
  return istStamp(d).day;
}

function classPackKey(classId: string) {
  return `class:${classId}`;
}

function classPackSize(classStreak: number) {
  const n = Math.max(1, classStreak);
  const exact = CLASS_PACK_SCHEDULE.find((d) => d.day === n);
  if (exact) return exact.total;
  const below = [...CLASS_PACK_SCHEDULE].reverse().find((d) => d.day <= n);
  return below?.total || 15;
}

function continuedClassAttend(snap: AppSnapshot, day: string) {
  const prev = snap.classAttendDay;
  if (prev === day) return snap.classAttendStreak || 1;
  if (prev === yesterdayIst(day)) return (snap.classAttendStreak || 0) + 1;
  return 1;
}

function emptySnapshot(): AppSnapshot {
  return {
    points: 0,
    streak: 0,
    clearedSounds: [],
    dailyDone: false,
    dailyEver: false,
    storyEver: false,
    verbsCleared: [],
    prepCorrect: 0,
  };
}

export function creditClassEndReward(learnerId: string, classId: string) {
  const day = todayIst();
  const key = classPackKey(classId);
  const prev = activityBoard.getProgress(learnerId);
  const snap = { ...emptySnapshot(), ...(prev?.snapshot || {}) };
  const packs = snap.packDay === day ? snap.packsToday || [] : [];
  if (packs.includes(key)) return { credited: false, points: 0 };

  const classAttendStreak = continuedClassAttend(snap, day);
  const points = classPackSize(classAttendStreak);
  const next: AppSnapshot = {
    ...snap,
    points: (snap.points || 0) + points,
    packDay: day,
    packsToday: [...packs, key],
    classAttendStreak,
    classAttendDay: day,
    lastActiveDay: day,
  };
  activityBoard.saveProgress(learnerId, next, day);
  return { credited: true, points };
}

export function creditClassEndRewards(classId: string, learnerIds: string[]) {
  const rows: { learnerId: string; credited: boolean; points: number }[] = [];
  for (const learnerId of learnerIds) {
    if (!learnerId) continue;
    rows.push({ learnerId, ...creditClassEndReward(learnerId, classId) });
  }
  return rows;
}
