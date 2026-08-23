import type { Learner } from "./api";

export type ClassKind = "individual" | "group";

export type KidPick = {
  pickId: string;
  childName: string;
  parentName?: string;
  level?: string;
  synced: boolean;
  key: string;
};

function kidKey(name: string) {
  return name.trim().toLowerCase().split(/\s+/)[0] || name.trim().toLowerCase();
}

/** One row per child — avoids duplicate parent + learner accounts in the picker. */
export function buildKidRoster(learners: Learner[]): KidPick[] {
  const groups = new Map<string, { learner?: Learner; parent?: Learner }>();

  for (const l of learners) {
    const childName = l.child?.childName || l.name;
    const key = kidKey(childName);
    const bucket = groups.get(key) || {};
    if (l.role === "learner") bucket.learner = l;
    else if (l.role === "parent") bucket.parent = l;
    else bucket.learner = bucket.learner || l;
    groups.set(key, bucket);
  }

  const roster: KidPick[] = [];
  for (const [key, { learner, parent }] of groups) {
    const primary = learner || parent;
    if (!primary) continue;
    const childName = parent?.child?.childName || learner?.child?.childName || primary.name;
    roster.push({
      pickId: learner?.id || parent!.id,
      childName,
      parentName: parent?.name,
      level: learner?.child?.level || parent?.child?.level,
      synced: Boolean(learner?.syncedAt || parent?.syncedAt),
      key,
    });
  }

  return roster.sort((a, b) => a.childName.localeCompare(b.childName));
}

export function defaultStartsAt(minutesAhead = 60) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutesAhead - (d.getMinutes() % 15));
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export function formatBookPreview(startsAt: string, durationMin: number, classKind: ClassKind, picked: number, totalKids: number) {
  if (!startsAt) return "Pick a time to preview this session.";
  const when = new Date(startsAt);
  const date = when.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = when.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const kind = classKind === "individual" ? "1:1 class" : "Group class";
  let audience = "whole hive";
  if (picked === 1) audience = "1 learner";
  else if (picked > 1) audience = `${picked} learners`;
  else if (classKind === "individual") audience = "pick one learner";
  return `${kind} · ${durationMin} min · ${date} at ${time} · ${audience}${totalKids && !picked ? ` (${totalKids} in hive)` : ""}`;
}

export type TimePreset = { id: string; label: string; value: string };

export function timePresets(): TimePreset[] {
  const now = new Date();
  const in15 = new Date(now);
  in15.setMinutes(in15.getMinutes() + 15 - (in15.getMinutes() % 5));
  in15.setSeconds(0, 0);

  const in60 = new Date(now);
  in60.setMinutes(in60.getMinutes() + 60 - (in60.getMinutes() % 15));
  in60.setSeconds(0, 0);

  const today5 = new Date(now);
  today5.setHours(17, 0, 0, 0);
  if (today5 <= now) today5.setDate(today5.getDate() + 1);

  const tomorrow10 = new Date(now);
  tomorrow10.setDate(tomorrow10.getDate() + 1);
  tomorrow10.setHours(10, 0, 0, 0);

  const fmt = (d: Date) => d.toISOString().slice(0, 16);
  return [
    { id: "15m", label: "In 15 min", value: fmt(in15) },
    { id: "1h", label: "In 1 hour", value: fmt(in60) },
    { id: "5pm", label: "Today 5 PM", value: fmt(today5) },
    { id: "tom", label: "Tomorrow 10 AM", value: fmt(tomorrow10) },
  ];
}

export const NOTE_SNIPPETS = [
  "Bring a smile. We'll talk in English.",
  "Find a quiet spot with good Wi‑Fi.",
  "Have your notebook ready for new words.",
  "Parents — please stay nearby for the first 5 minutes.",
];

export const TITLE_SUGGESTIONS: Record<ClassKind, string[]> = {
  group: ["Hive conversation circle", "Story time live", "Phonics practice hour", "Speaking games"],
  individual: ["1:1 speaking practice", "Pronunciation check-in", "Reading aloud session"],
};

export function audienceError(classKind: ClassKind, picked: number): string | null {
  if (classKind === "individual" && picked !== 1) {
    return picked === 0 ? "Choose one learner for a 1:1 class." : "1:1 class allows only one learner.";
  }
  if (classKind === "group" && picked === 1) {
    return "For a group class, pick several learners or leave empty for everyone.";
  }
  return null;
}

export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer-neutral/png?seed=${encodeURIComponent(seed || "Learner")}&size=64`;
}

export function levelLabel(level?: string) {
  if (level === "advanced") return "Advanced";
  if (level === "intermediate") return "Intermediate";
  if (level === "beginner") return "Beginner";
  return "";
}
