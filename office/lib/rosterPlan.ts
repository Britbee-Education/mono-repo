import { PHONICS, getPhonicsById } from "./content/phonics";
import { PREPOSITIONS } from "./content/prepositions";
import { STORY } from "./content/story";
import { VERB_POOL } from "./content/verbs";

export type DayPlan = {
  date: string;
  phonicsId: string;
  sentence: string;
  verbIds: string[];
  storyScene: number;
  prepIds: string[];
  note?: string;
  manual?: boolean;
};

export type DayOverride = Partial<Omit<DayPlan, "date">> & { date: string };

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function datesOfMonth(year: number, month: number) {
  const n = daysInMonth(year, month);
  const prefix = monthKey(year, month);
  return Array.from({ length: n }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`);
}

function dayIndex(date: string) {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
}

export function defaultVerbsForDate(date: string) {
  const week = Math.floor(dayIndex(date) / 7);
  const start = (week * 8) % VERB_POOL.length;
  const ids: string[] = [];
  for (let i = 0; i < 8; i++) ids.push(VERB_POOL[(start + i) % VERB_POOL.length].id);
  return ids;
}

export function defaultDayPlan(date: string): DayPlan {
  const day = dayIndex(date);
  const sound = PHONICS[((day % PHONICS.length) + PHONICS.length) % PHONICS.length];
  const storyScene = day % STORY.sentences.length;
  const prepIds = Array.from({ length: 3 }, (_, i) => PREPOSITIONS[(day + i) % PREPOSITIONS.length].id);
  return {
    date,
    phonicsId: sound.id,
    sentence: sound.sentence,
    verbIds: defaultVerbsForDate(date),
    storyScene,
    prepIds,
    manual: false,
  };
}

export function mergeDayPlan(base: DayPlan, override?: DayOverride | null): DayPlan {
  if (!override) return base;
  const merged: DayPlan = {
    ...base,
    ...override,
    date: base.date,
    verbIds: override.verbIds?.length ? override.verbIds : base.verbIds,
    prepIds: override.prepIds?.length ? override.prepIds : base.prepIds,
    manual: override.manual ?? base.manual,
  };
  if (override.phonicsId && override.phonicsId !== base.phonicsId && !override.sentence) {
    const sound = getPhonicsById(override.phonicsId);
    if (sound) merged.sentence = sound.sentence;
  }
  return merged;
}

export function buildMonth(year: number, month: number, overrides: Record<string, DayOverride> = {}) {
  const days = datesOfMonth(year, month).map((date) => mergeDayPlan(defaultDayPlan(date), overrides[date]));
  return { monthKey: monthKey(year, month), year, monthIndex: month, days };
}

export function shuffleArray<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function shuffleMonthPhonics(days: DayPlan[]) {
  const sounds = shuffleArray(days.map((d) => d.phonicsId));
  return days.map((d, i) => {
    const phonicsId = sounds[i];
    const sound = getPhonicsById(phonicsId);
    return {
      ...d,
      phonicsId,
      sentence: sound?.sentence || d.sentence,
      manual: true,
    };
  });
}

export function shuffleMonthVerbs(days: DayPlan[]) {
  const pools = shuffleArray(days.map((d) => [...d.verbIds].join("|")));
  return days.map((d, i) => ({
    ...d,
    verbIds: pools[i].split("|"),
    manual: true,
  }));
}

export function swapDays(days: DayPlan[], dateA: string, dateB: string) {
  const i = days.findIndex((d) => d.date === dateA);
  const j = days.findIndex((d) => d.date === dateB);
  if (i < 0 || j < 0 || i === j) return days;
  const next = [...days];
  const a = { ...next[i], date: dateB, manual: true };
  const b = { ...next[j], date: dateA, manual: true };
  next[i] = b;
  next[j] = a;
  return next.sort((x, y) => x.date.localeCompare(y.date));
}

export function rosterCatalog() {
  return {
    phonics: PHONICS.map((s) => ({ id: s.id, glyph: s.glyph, title: s.title, sentence: s.sentence, group: s.group })),
    verbs: VERB_POOL.map((v) => ({ id: v.id, word: v.word, emoji: v.emoji, sentence: v.sentence })),
    prepositions: PREPOSITIONS.map((p) => ({ id: p.id, cloze: p.cloze, prompt: p.prompt, answer: p.answer })),
    story: {
      id: STORY.id,
      title: STORY.title,
      scenes: STORY.sentences.map((s, i) => ({ index: i, text: s.text })),
    },
  };
}

export function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}
