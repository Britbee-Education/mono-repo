export const ACTIVITY_IDS = ["phonics", "sentence", "story", "verbs", "prepositions"] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

export type CoachStatus = "not-started" | "assigned" | "in-progress" | "needs-review" | "cleared";

export const ACTIVITY_CATALOG: {
  id: ActivityId;
  quest: number;
  name: string;
  appTitle: string;
  type: string;
  duration: string;
  icon: string;
  color: string;
  order: string;
  tip: string;
}[] = [
  {
    id: "phonics",
    quest: 1,
    name: "Sound Lab",
    appTitle: "Phonics pronunciation chart",
    type: "Pronunciation",
    duration: "Permanent · unlocks by group",
    icon: "🔤",
    color: "#8C52FF22",
    order: "Short vowels → long vowels → unvoiced → voiced. Each sound: hear cue, then 3 words (beginning, middle, end).",
    tip: "Master one sound (three words) before Daily Buzz unlocks.",
  },
  {
    id: "sentence",
    quest: 2,
    name: "Daily Buzz",
    appTitle: "Sentence practice",
    type: "Daily drill",
    duration: "New sentence every 24 hours",
    icon: "🎤",
    color: "#4CAF5022",
    order: "Today’s phonics sound → hear the sound → say the full sentence.",
    tip: "Unlocks after 1 mastered sound. Completing it opens Story Trail.",
  },
  {
    id: "story",
    quest: 3,
    name: "Story Trail",
    appTitle: "Story reading",
    type: "Listen and say",
    duration: "Permanent plot · 7 scenes",
    icon: "📖",
    color: "#F5C40022",
    order: "Seven scenes in plot order, then a correction page for missed words.",
    tip: "Unlocks after Daily Buzz has been completed once.",
  },
  {
    id: "verbs",
    quest: 4,
    name: "Act & Say",
    appTitle: "What am I doing?",
    type: "Vocabulary",
    duration: "8 actions, new set every week",
    icon: "🏃",
    color: "#EF535022",
    order: "Pick an action → act it out → say the sentence. Clear 3 this week to unlock Bee Maps.",
    tip: "Unlocks after Story Trail is finished.",
  },
  {
    id: "prepositions",
    quest: 5,
    name: "Bee Maps",
    appTitle: "Where am I going?",
    type: "Grammar",
    duration: "Continuous cloze deck",
    icon: "📍",
    color: "#5B9BFF22",
    order: "Place questions first in the source list, then movement. Child sees a shuffled deck.",
    tip: "Unlocks after 3 actions are cleared this week.",
  },
];

export const STATUS_OPTIONS: { id: CoachStatus; label: string }[] = [
  { id: "not-started", label: "Not started" },
  { id: "assigned", label: "Assigned today" },
  { id: "in-progress", label: "In progress" },
  { id: "needs-review", label: "Needs review" },
  { id: "cleared", label: "Cleared" },
];

export function activityById(id: string) {
  return ACTIVITY_CATALOG.find((a) => a.id === id);
}

export function isActivityId(id: string): id is ActivityId {
  return ACTIVITY_CATALOG.some((a) => a.id === id);
}
