import { colors } from "@/constants/theme";
import { PHONICS, PHONICS_GROUPS, type PhonicsGroup } from "@/data/phonics";

export type QuestId = "phonics" | "sentence" | "story" | "verbs" | "prepositions";

export type ProgressSnapshot = {
  points: number;
  clearedSounds: string[];
  dailyDone: boolean;
  dailyEver: boolean;
  storyEver: boolean;
  verbsCleared: string[];
  prepCorrect: number;
  todayDone: QuestId[];
};

/** Buzz Points awarded once per activity, once per day. */
export const ACTIVITY_BUZZ: Record<QuestId, number> = {
  phonics: 10,
  sentence: 10,
  story: 12,
  verbs: 10,
  prepositions: 10,
};

/** Daily attendance packs — once per IST day (hello) or once per live class. */
export const HELLO_PACK = 8;
export const CLASS_PACK = 15;
export const HELLO_PACK_KEY = "hello";

export function classPackKey(classId: string) {
  return `class:${classId}`;
}

/**
 * Progressive daily pack schedule.
 * Points compound with consecutive attendance.
 * Weekend bonus (Sat/Sun) adds +5 if streak is ≥ 5.
 * If streak breaks, resets to Day 1.
 */
export type PackDay = {
  day: number;        // streak day number (1-based)
  label: string;      // display label "Day 1", "Day 7" etc.
  points: number;     // base points for that day
  bonus: number;      // extra (weekend / milestone) points
  total: number;      // points + bonus
  milestone?: string; // description of bonus if any
};

export type SproutSpec = {
  id: string;
  label: string;
  rarity: "common" | "rare" | "epic";
  basePoints: number;
};

export type SproutReward = SproutSpec & {
  streakDay: number;
  multiplier: number;
  points: number;
};

export type PlanetSpec = {
  id: string;
  label: string;
  rarity: "common" | "rare" | "epic";
  basePoints: number;
};

export type PlanetReward = PlanetSpec & {
  streakDay: number;
  multiplier: number;
  points: number;
};

export const DAILY_SPROUTS: SproutSpec[] = [
  { id: "sun-bud", label: "Sun Bud", rarity: "common", basePoints: 4 },
  { id: "mint-pop", label: "Mint Pop", rarity: "common", basePoints: 5 },
  { id: "tulip-hop", label: "Tulip Hop", rarity: "common", basePoints: 6 },
  { id: "cactus-spark", label: "Cactus Spark", rarity: "rare", basePoints: 9 },
  { id: "honey-leaf", label: "Honey Leaf", rarity: "common", basePoints: 7 },
  { id: "moon-moss", label: "Moon Moss", rarity: "rare", basePoints: 10 },
  { id: "petal-boom", label: "Petal Boom", rarity: "common", basePoints: 8 },
  { id: "comet-bloom", label: "Comet Bloom", rarity: "epic", basePoints: 14 },
];

export const CLASS_PLANETS: PlanetSpec[] = [
  { id: "nova-dot", label: "Nova Dot", rarity: "common", basePoints: 7 },
  { id: "volt-ring", label: "Volt Ring", rarity: "common", basePoints: 8 },
  { id: "ion-orb", label: "Ion Orb", rarity: "rare", basePoints: 11 },
  { id: "plasma-pearl", label: "Plasma Pearl", rarity: "common", basePoints: 9 },
  { id: "neon-saturn", label: "Neon Saturn", rarity: "rare", basePoints: 12 },
  { id: "storm-jupiter", label: "Storm Jupiter", rarity: "epic", basePoints: 16 },
];

export const DAILY_PACK_SCHEDULE: PackDay[] = [
  { day: 1,  label: "Day 1",  points: 8,  bonus: 0, total: 8 },
  { day: 2,  label: "Day 2",  points: 9,  bonus: 0, total: 9 },
  { day: 3,  label: "Day 3",  points: 10, bonus: 0, total: 10, milestone: "3-day streak" },
  { day: 4,  label: "Day 4",  points: 11, bonus: 0, total: 11 },
  { day: 5,  label: "Day 5",  points: 12, bonus: 0, total: 12 },
  { day: 6,  label: "Day 6 (Sat)", points: 12, bonus: 5, total: 17, milestone: "Weekend bonus 🎉" },
  { day: 7,  label: "Day 7 (Sun)", points: 12, bonus: 5, total: 17, milestone: "Weekend bonus 🎉" },
  { day: 8,  label: "Week 2",  points: 14, bonus: 0, total: 14, milestone: "1 full week!" },
  { day: 9,  label: "Day 9",  points: 14, bonus: 0, total: 14 },
  { day: 10, label: "Day 10", points: 15, bonus: 0, total: 15 },
  { day: 11, label: "Day 11", points: 15, bonus: 0, total: 15 },
  { day: 12, label: "Day 12", points: 15, bonus: 0, total: 15 },
  { day: 13, label: "Day 13 (Sat)", points: 15, bonus: 6, total: 21, milestone: "Weekend bonus 🎉" },
  { day: 14, label: "Day 14 (Sun)", points: 15, bonus: 6, total: 21, milestone: "Weekend bonus 🎉" },
  { day: 15, label: "2 Weeks!", points: 18, bonus: 0, total: 18, milestone: "2-week streak 🔥" },
  { day: 16, label: "Day 16", points: 18, bonus: 0, total: 18 },
  { day: 17, label: "Day 17", points: 18, bonus: 0, total: 18 },
  { day: 18, label: "Day 18", points: 18, bonus: 0, total: 18 },
  { day: 19, label: "Day 19", points: 18, bonus: 0, total: 18 },
  { day: 20, label: "Day 20 (Sat)", points: 18, bonus: 7, total: 25, milestone: "Weekend bonus 🎉" },
  { day: 21, label: "Day 21 (Sun)", points: 18, bonus: 7, total: 25, milestone: "Weekend bonus 🎉" },
  { day: 30, label: "30 Days!", points: 22, bonus: 0, total: 22, milestone: "30-day legend 👑" },
];

/** Returns the PackDay entry for a given 1-based attendance streak. */
export function packDayEntry(attendStreak: number): PackDay {
  const n = Math.max(1, attendStreak);
  // find exact match first
  const exact = DAILY_PACK_SCHEDULE.find((d) => d.day === n);
  if (exact) return exact;
  // find the closest entry <= n
  const below = [...DAILY_PACK_SCHEDULE].reverse().find((d) => d.day <= n);
  return below || DAILY_PACK_SCHEDULE[0];
}

export function helloPackSize(attendStreak: number) {
  return packDayEntry(attendStreak).total;
}

export function sproutRewardForStreak(attendStreak: number): SproutReward {
  const streakDay = Math.max(1, attendStreak);
  const spec = DAILY_SPROUTS[(streakDay - 1) % DAILY_SPROUTS.length];
  const multiplier =
    streakDay >= 21 ? 2.2 : streakDay >= 14 ? 1.9 : streakDay >= 7 ? 1.6 : streakDay >= 3 ? 1.3 : 1;
  const points = Math.round(spec.basePoints * multiplier);
  return {
    ...spec,
    streakDay,
    multiplier,
    points,
  };
}

export function planetRewardForClassStreak(classStreak: number): PlanetReward {
  const streakDay = Math.max(1, classStreak);
  const spec = CLASS_PLANETS[(streakDay - 1) % CLASS_PLANETS.length];
  const multiplier =
    streakDay >= 14 ? 2.3 : streakDay >= 10 ? 2.0 : streakDay >= 7 ? 1.7 : streakDay >= 3 ? 1.35 : 1;
  const points = Math.round(spec.basePoints * multiplier);
  return {
    ...spec,
    streakDay,
    multiplier,
    points,
  };
}

/**
 * Class pack also compounds: each consecutive day a class is attended
 * earns more. Resets if you miss a day.
 */
export const CLASS_PACK_SCHEDULE: PackDay[] = [
  { day: 1,  label: "First class",  points: 15, bonus: 0, total: 15 },
  { day: 2,  label: "2nd class",    points: 16, bonus: 0, total: 16 },
  { day: 3,  label: "3rd class",    points: 17, bonus: 2, total: 19, milestone: "Hat-trick! 🎩" },
  { day: 5,  label: "5 classes",    points: 20, bonus: 5, total: 25, milestone: "5-class streak 🔥" },
  { day: 7,  label: "7 classes",    points: 22, bonus: 8, total: 30, milestone: "Full week of classes 👑" },
  { day: 10, label: "10 classes",   points: 25, bonus: 10, total: 35, milestone: "10-class champion 🏆" },
];

export function classPackDayEntry(classStreak: number): PackDay {
  const n = Math.max(1, classStreak);
  const exact = CLASS_PACK_SCHEDULE.find((d) => d.day === n);
  if (exact) return exact;
  const below = [...CLASS_PACK_SCHEDULE].reverse().find((d) => d.day <= n);
  return below || CLASS_PACK_SCHEDULE[0];
}

export function classPackSize(classStreak: number) {
  return classPackDayEntry(classStreak).total;
}

export const DAILY_QUESTS = 5;

/** Steps in today’s round. Sounds = 3 words in the open sound. */
export const ACTIVITY_STEPS: Record<QuestId, number> = {
  phonics: 3,
  sentence: 1,
  story: 7,
  verbs: 3,
  prepositions: 5,
};

export type TrackWord = { word: string; sound?: string };

export type DayTrack = {
  day: string;
  phonics?: { soundId: string; index: number; cleared: boolean };
  sentence?: { started: boolean; cleared: boolean };
  story?: { index: number; said: boolean; bag: TrackWord[]; polish?: boolean; polishIndex?: number };
  verbs?: { ids: string[]; index: number; cleared: boolean };
  prepositions?: { index: number; picked: string | null; ready: boolean };
};

export const QUESTS: {
  id: QuestId;
  href: string;
  title: string;
  subtitle: string;
  type: string;
  emoji: string;
  icon: "sparkles-outline" | "sunny-outline" | "book-outline" | "walk-outline" | "navigate-outline";
  color: string;
  lockHint: string;
  kid: string;
}[] = [
  {
    id: "phonics",
    href: "/activity/phonics",
    title: "Sound Lab",
    subtitle: "Hear a sound. Say three words.",
    type: "Phonics",
    emoji: "🔤",
    icon: "sparkles-outline",
    color: colors.listen,
    lockHint: "Do Sounds first!",
    kid: "Sounds",
  },
  {
    id: "sentence",
    href: "/activity/sentence",
    title: "Daily Buzz",
    subtitle: "Say today’s sentence out loud.",
    type: "Daily quest",
    emoji: "🎤",
    icon: "sunny-outline",
    color: colors.speak,
    lockHint: "Do Sounds first!",
    kid: "Speak",
  },
  {
    id: "story",
    href: "/activity/story",
    title: "Story Trail",
    subtitle: "Read Ben’s park adventure.",
    type: "Listen and say",
    emoji: "📖",
    icon: "book-outline",
    color: colors.yellow,
    lockHint: "Do Speak first!",
    kid: "Story",
  },
  {
    id: "verbs",
    href: "/activity/verbs",
    title: "Act & Say",
    subtitle: "Eight actions to act out this week.",
    type: "Vocabulary",
    emoji: "🤸",
    icon: "walk-outline",
    color: colors.mission,
    lockHint: "Do Story first!",
    kid: "Act",
  },
  {
    id: "prepositions",
    href: "/activity/prepositions",
    title: "Bee Maps",
    subtitle: "Help the bee find where it is.",
    type: "Grammar",
    emoji: "🗺️",
    icon: "navigate-outline",
    color: colors.shieldBlue,
    lockHint: "Do Act first!",
    kid: "Maps",
  },
];

const BEE_TITLES = [
  "Tiny Bee",
  "Busy Bee",
  "Buzz Scout",
  "Honey Cadet",
  "Hive Hero",
  "Nectar Star",
  "Queen’s Helper",
  "Golden Wings",
  "Hive Champion",
  "BritBee Ace",
];

export function beeRank(points: number) {
  const level = Math.max(1, Math.min(10, 1 + Math.floor(Math.max(0, points) / 12)));
  const intoLevel = Math.max(0, points) - (level - 1) * 12;
  return {
    level,
    title: BEE_TITLES[level - 1],
    intoLevel: level >= 10 ? 12 : intoLevel,
    span: 12,
    nextTitle: BEE_TITLES[Math.min(9, level)] || BEE_TITLES[9],
    maxed: level >= 10,
  };
}

export function soundsInGroup(group: PhonicsGroup, clearedIds: string[]) {
  return PHONICS.filter((s) => s.group === group && clearedIds.includes(s.id)).length;
}

export function groupUnlocked(group: PhonicsGroup, clearedIds: string[]) {
  if (group === "short-vowel") return true;
  if (group === "long-vowel") return soundsInGroup("short-vowel", clearedIds) >= 2;
  if (group === "unvoiced") return soundsInGroup("long-vowel", clearedIds) >= 2;
  if (group === "voiced") return soundsInGroup("unvoiced", clearedIds) >= 2;
  return true;
}

export function groupLockHint(group: PhonicsGroup) {
  const label = PHONICS_GROUPS.find((g) => g.id === group)?.label.toLowerCase() || "sounds";
  if (group === "long-vowel") return "Clear 2 short vowels to unlock long vowels.";
  if (group === "unvoiced") return "Clear 2 long vowels to unlock unvoiced sounds.";
  if (group === "voiced") return "Clear 2 unvoiced sounds to unlock voiced sounds.";
  return `Keep buzzing to unlock ${label}.`;
}

export function questUnlocked(id: QuestId, p: ProgressSnapshot) {
  if (id === "phonics") return true;
  if (id === "sentence") return p.clearedSounds.length >= 1;
  if (id === "story") return p.dailyEver;
  if (id === "verbs") return p.storyEver;
  if (id === "prepositions") return p.verbsCleared.length >= 3;
  return true;
}

export function previousQuest(id: QuestId) {
  const i = QUESTS.findIndex((q) => q.id === id);
  return i > 0 ? QUESTS[i - 1] : null;
}

export function needFirst(id: QuestId) {
  const prev = previousQuest(id);
  return prev ? `Do ${prev.kid} first!` : "";
}

export function questDone(id: QuestId, p: ProgressSnapshot) {
  if (id === "phonics") return p.clearedSounds.length >= 1;
  if (id === "sentence") return p.dailyEver;
  if (id === "story") return p.storyEver;
  if (id === "verbs") return p.verbsCleared.length >= 3;
  if (id === "prepositions") return p.prepCorrect >= 5;
  return false;
}

export function questDoneToday(id: QuestId, p: ProgressSnapshot) {
  return (p.todayDone || []).includes(id);
}

export function todayCount(p: ProgressSnapshot) {
  return (p.todayDone || []).length;
}

export function nextQuest(p: ProgressSnapshot) {
  const open = QUESTS.find((q) => questUnlocked(q.id, p) && !questDoneToday(q.id, p));
  return open || QUESTS[QUESTS.length - 1];
}

export function activityCurrent(id: QuestId, track?: DayTrack | null) {
  if (!track) return 0;
  if (id === "phonics" && track.phonics) return track.phonics.index + (track.phonics.cleared ? 1 : 0);
  if (id === "sentence" && track.sentence) return track.sentence.cleared ? 1 : 0;
  if (id === "story" && track.story) {
    if (track.story.polish) return ACTIVITY_STEPS.story;
    return track.story.index + (track.story.said ? 1 : 0);
  }
  if (id === "verbs" && track.verbs) return track.verbs.index + (track.verbs.cleared ? 1 : 0);
  if (id === "prepositions" && track.prepositions) {
    return track.prepositions.index + (track.prepositions.ready ? 1 : 0);
  }
  return 0;
}

export function activityPercent(id: QuestId, p: ProgressSnapshot, track?: DayTrack | null) {
  if (questDoneToday(id, p)) return 100;
  if (id === "story" && track?.story?.polish) return 92;
  const total = ACTIVITY_STEPS[id];
  const current = Math.min(total, activityCurrent(id, track));
  const pct = Math.min(100, Math.round((current / total) * 100));
  if (pct > 0) return pct;
  if (id === "phonics" && track?.phonics) return 8;
  if (id === "sentence" && track?.sentence?.started) return 8;
  if (id === "story" && track?.story) return 8;
  if (id === "verbs" && track?.verbs) return 8;
  if (id === "prepositions" && track?.prepositions) return 8;
  return 0;
}

export function resumeHref(id: QuestId, track?: DayTrack | null) {
  const quest = QUESTS.find((q) => q.id === id);
  if (id === "phonics" && track?.phonics?.soundId) return `/activity/phonics/${track.phonics.soundId}`;
  if (id === "story" && track?.story?.polish) return "/activity/story-correct";
  return quest?.href || "/(main)";
}

/** After a finished activity, send the kid to the next open activity or home. */
export function continueHref(p: ProgressSnapshot, track?: DayTrack | null) {
  if (todayCount(p) >= DAILY_QUESTS) return "/(main)";
  const next = nextQuest(p);
  if (questDoneToday(next.id, p)) return "/(main)";
  return resumeHref(next.id, track);
}

export const CHEERS = ["Buzz!", "Honey hit!", "Bee-autiful!", "Nectar!", "Super wings!"];

export function cheerFor(index: number) {
  return CHEERS[index % CHEERS.length];
}
