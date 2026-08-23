import { ACTIVITY_CATALOG, type ActivityId } from "./activities";
import { dailyPhonics, todayKey } from "./content/phonics";
import { PREPOSITIONS } from "./content/prepositions";
import { STORY } from "./content/story";
import { weeklyVerbs } from "./content/verbs";

export const ACTIVITIES = ACTIVITY_CATALOG.map((a) => ({
  href: a.id,
  title: a.name,
  type: a.type,
  duration: a.duration,
  icon: a.icon,
  color: a.color,
  tip: a.tip,
}));

export function sessionPlan() {
  const sound = dailyPhonics();
  return {
    date: todayKey(),
    sound,
    verbs: weeklyVerbs(),
    story: STORY,
    prepositionCount: PREPOSITIONS.length,
  };
}

export function planFor(id: ActivityId) {
  return ACTIVITY_CATALOG.find((a) => a.id === id);
}
