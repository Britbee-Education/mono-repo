import { PHONICS, dailyPhonics } from "@/lib/content/phonics";
import { STORY } from "@/lib/content/story";
import { weeklyVerbs } from "@/lib/content/verbs";
import { PREPOSITIONS } from "@/lib/content/prepositions";
import type { ActivityId } from "@/lib/activities";
import { ACTIVITY_CATALOG } from "@/lib/activities";

export function focusOptions(id: ActivityId) {
  if (id === "phonics") {
    return PHONICS.map((s) => ({
      value: s.id,
      label: `${s.glyph} ${s.title} — ${s.examples.map((e) => e.word).join(", ")}`,
    }));
  }
  if (id === "sentence") {
    const s = dailyPhonics();
    return [{ value: s.id, label: `Today · ${s.glyph} “${s.sentence}”` }];
  }
  if (id === "story") {
    return STORY.sentences.map((s, i) => ({ value: String(i + 1), label: `Scene ${i + 1} — ${s.text}` }));
  }
  if (id === "verbs") {
    return weeklyVerbs().map((v) => ({ value: v.id, label: `${v.emoji} ${v.word} — ${v.sentence}` }));
  }
  return PREPOSITIONS.map((q) => ({
    value: q.id,
    label: `${q.answer} — ${q.cloze.replace("___", q.answer)}`,
  }));
}

export function focusLabel(id: ActivityId, value?: string) {
  if (!value) return "";
  return focusOptions(id).find((o) => o.value === value)?.label || value;
}

export function activityName(id: ActivityId) {
  return ACTIVITY_CATALOG.find((a) => a.id === id)?.name || id;
}
