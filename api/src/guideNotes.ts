import fs from "fs";
import path from "path";

export type GuideNote = {
  id: string;
  learnerId: string;
  guideId: string;
  guideName: string;
  text: string;
  createdAt: string;
  activityId?: string;
};

const DATA_PATH = path.resolve(__dirname, "../data/guide-notes.json");

const g = globalThis as unknown as {
  __britbeeNotes?: GuideNote[];
  __britbeeNoteId?: number;
  __britbeeNotesLoaded?: boolean;
};

function load() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as { nextId?: number; notes?: GuideNote[] };
    g.__britbeeNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
    g.__britbeeNoteId = Number(parsed.nextId) || 1;
  } catch {
    g.__britbeeNotes = [];
    g.__britbeeNoteId = 1;
  }
  g.__britbeeNotesLoaded = true;
}

function persist() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify({ nextId: g.__britbeeNoteId || 1, notes: g.__britbeeNotes || [] }, null, 2)
  );
}

function store() {
  if (!g.__britbeeNotesLoaded) load();
  if (!g.__britbeeNotes) g.__britbeeNotes = [];
  if (!g.__britbeeNoteId) g.__britbeeNoteId = 1;
  return g;
}

export const guideNotes = {
  listFor(learnerId: string) {
    return store()
      .__britbeeNotes!.filter((n) => n.learnerId === learnerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  latestMap(learnerIds: string[]) {
    const wanted = new Set(learnerIds);
    const latest = new Map<string, GuideNote>();
    for (const note of store().__britbeeNotes!) {
      if (!wanted.has(note.learnerId)) continue;
      const prev = latest.get(note.learnerId);
      if (!prev || note.createdAt > prev.createdAt) latest.set(note.learnerId, note);
    }
    return latest;
  },
  listForActivity(activityId: string) {
    return store()
      .__britbeeNotes!.filter((n) => n.activityId === activityId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 40);
  },
  add(input: Omit<GuideNote, "id" | "createdAt">) {
    const s = store();
    const note: GuideNote = {
      ...input,
      id: String(s.__britbeeNoteId!++),
      createdAt: new Date().toISOString(),
    };
    s.__britbeeNotes!.unshift(note);
    persist();
    return note;
  },
};
