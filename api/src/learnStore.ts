import fs from "fs";
import path from "path";

export const LEARN_DURATIONS = [30, 60, 90] as const;
export type LearnDuration = (typeof LEARN_DURATIONS)[number];

export const LEARN_TOPICS = ["Sounds", "Speak", "Story", "Act", "Maps", "Words", "Manners"] as const;
export type LearnTopic = (typeof LEARN_TOPICS)[number];

export type LearnClip = {
  id: string;
  title: string;
  line: string;
  tip: string;
  duration: LearnDuration;
  topic: LearnTopic;
  videoUrl: string;
  art: string;
  bg: string;
  guideName: string;
  guideId?: string;
  published: boolean;
  moderationStatus?: "pending" | "approved" | "rejected";
  moderationNote?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type Disk = {
  nextId: number;
  clips: LearnClip[];
  seen: Record<string, string[]>;
};

const DATA_PATH = path.resolve(__dirname, "../data/learn.json");

const g = globalThis as unknown as {
  __britbeeLearn?: Disk;
  __britbeeLearnLoaded?: boolean;
};

function isDuration(n: number): n is LearnDuration {
  return LEARN_DURATIONS.includes(n as LearnDuration);
}

function isTopic(s: string): s is LearnTopic {
  return (LEARN_TOPICS as readonly string[]).includes(s);
}

function stamp(offsetMs = 0) {
  return new Date(Date.now() - offsetMs).toISOString();
}

function seedClips(): LearnClip[] {
  const rows: Array<Omit<LearnClip, "id" | "published" | "createdAt" | "updatedAt" | "guideName" | "videoUrl">> = [
    {
      title: "Say hello",
      line: "Hello, how are you?",
      tip: "Use this when you meet a friend.",
      duration: 30,
      topic: "Speak",
      art: "teacher",
      bg: "#1A2B5F",
    },
    {
      title: "Short A",
      line: "Cat. A as in cat.",
      tip: "Open your mouth. Short and bright.",
      duration: 30,
      topic: "Sounds",
      art: "cat",
      bg: "#5B2B8C",
    },
    {
      title: "Please and thank you",
      line: "Please. Thank you.",
      tip: "Kind words. Say them slowly.",
      duration: 30,
      topic: "Manners",
      art: "honey",
      bg: "#0B4D3A",
    },
    {
      title: "I can jump",
      line: "I can jump.",
      tip: "Act it. Then say it.",
      duration: 60,
      topic: "Act",
      art: "jump",
      bg: "#8C2B2B",
    },
    {
      title: "The bee is on the cup",
      line: "The bee is on the cup.",
      tip: "On means the bee sits on top.",
      duration: 60,
      topic: "Maps",
      art: "cup",
      bg: "#1A4A8C",
    },
    {
      title: "Yellow like the sun",
      line: "The sun is yellow.",
      tip: "Colour words. Point as you say them.",
      duration: 60,
      topic: "Words",
      art: "sun",
      bg: "#8C6A12",
    },
    {
      title: "Ben at the park",
      line: "Ben is at the park.",
      tip: "A tiny story. Say the whole line.",
      duration: 90,
      topic: "Story",
      art: "story-1",
      bg: "#2B5F1A",
    },
    {
      title: "Where is the bee?",
      line: "The bee is under the bag.",
      tip: "Under means down below.",
      duration: 90,
      topic: "Maps",
      art: "bag",
      bg: "#1A2B5F",
    },
    {
      title: "I like apples",
      line: "I like apples.",
      tip: "Say like with a smile.",
      duration: 30,
      topic: "Speak",
      art: "apple",
      bg: "#7A1F3D",
    },
    {
      title: "I can run",
      line: "I can run.",
      tip: "Run on the spot. Then say the line.",
      duration: 60,
      topic: "Act",
      art: "run",
      bg: "#0B3D5C",
    },
  ];
  return rows.map((row, i) => {
    const createdAt = stamp((rows.length - 1 - i) * 36_000_000);
    return {
      ...row,
      id: `learn-${i + 1}`,
      videoUrl: "",
      guideName: "Maya",
      published: true,
      moderationStatus: "approved",
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function empty(): Disk {
  const clips = seedClips();
  return { nextId: clips.length + 1, clips, seen: {} };
}

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
    const clips = Array.isArray(parsed.clips) ? parsed.clips : [];
    const nextId = Number(parsed.nextId) || 1;
    g.__britbeeLearn = {
      nextId,
      clips,
      seen: parsed.seen && typeof parsed.seen === "object" ? parsed.seen : {},
    };
    if (!clips.length && nextId <= 1) g.__britbeeLearn = empty();
  } catch {
    g.__britbeeLearn = empty();
  }
  g.__britbeeLearnLoaded = true;
}

function persist() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store().__britbeeLearn, null, 2));
}

function store() {
  if (!g.__britbeeLearnLoaded) load();
  if (!g.__britbeeLearn) g.__britbeeLearn = empty();
  return g;
}

export function publicClip(row: LearnClip) {
  return {
    id: row.id,
    title: row.title,
    line: row.line,
    tip: row.tip,
    duration: row.duration,
    topic: row.topic,
    videoUrl: row.videoUrl,
    art: row.art,
    bg: row.bg,
    guideName: row.guideName,
    createdAt: row.createdAt,
  };
}

export type PublicLearnClip = ReturnType<typeof publicClip>;

function cleanUrl(raw: unknown) {
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url) return "";
  if (url.length > 500) throw Object.assign(new Error("Video link is too long."), { status: 400 });
  if (!/^https?:\/\//i.test(url)) throw Object.assign(new Error("Use an http or https video link."), { status: 400 });
  return url;
}

function clampText(raw: unknown, max: number, fallback = "") {
  const text = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  return (text || fallback).slice(0, max);
}

export const learnBoard = {
  list(includeHidden = false) {
    const clips = store().__britbeeLearn!.clips.slice();
    const rows = includeHidden
      ? clips
      : clips.filter((c) => c.published && c.moderationStatus !== "rejected");
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  byId(id: string) {
    return store().__britbeeLearn!.clips.find((c) => c.id === id) || null;
  },
  feed(learnerId: string) {
    const seen = store().__britbeeLearn!.seen[learnerId] || [];
    return { clips: this.list(false).map(publicClip), seenIds: seen };
  },
  markSeen(learnerId: string, clipId: string) {
    const s = store().__britbeeLearn!;
    if (!this.byId(clipId)) return { seenIds: s.seen[learnerId] || [] };
    const prev = s.seen[learnerId] || [];
    if (prev.includes(clipId)) return { seenIds: prev };
    s.seen[learnerId] = [clipId, ...prev].slice(0, 200);
    persist();
    return { seenIds: s.seen[learnerId] };
  },
  add(input: {
    title: string;
    line: string;
    tip?: string;
    duration: number;
    topic: string;
    videoUrl?: string;
    art?: string;
    bg?: string;
    guideName: string;
    guideId?: string;
    published?: boolean;
  }) {
    const title = clampText(input.title, 60);
    const line = clampText(input.line, 140);
    if (!title || !line) throw Object.assign(new Error("Add a title and the English line."), { status: 400 });
    if (!isDuration(input.duration)) throw Object.assign(new Error("Pick 30, 60 or 90 seconds."), { status: 400 });
    if (!isTopic(input.topic)) throw Object.assign(new Error("Pick a Learn topic."), { status: 400 });
    const cleanVideoUrl = cleanUrl(input.videoUrl);
    if (!cleanVideoUrl) throw Object.assign(new Error("Upload or paste a video URL for this clip."), { status: 400 });
    const s = store().__britbeeLearn!;
    const now = new Date().toISOString();
    const row: LearnClip = {
      id: `learn-${s.nextId++}`,
      title,
      line,
      tip: clampText(input.tip, 160),
      duration: input.duration,
      topic: input.topic,
      videoUrl: cleanVideoUrl,
      art: clampText(input.art, 40, "bee"),
      bg: clampText(input.bg, 20, "#1A2B5F") || "#1A2B5F",
      guideName: clampText(input.guideName, 40, "Maya") || "Maya",
      guideId: input.guideId,
      published: input.published !== false,
      moderationStatus: input.published === false ? "pending" : "approved",
      createdAt: now,
      updatedAt: now,
    };
    s.clips.unshift(row);
    persist();
    return row;
  },
  moderate(
    id: string,
    patch: {
      moderationStatus: "pending" | "approved" | "rejected";
      moderationNote?: string;
      moderatedBy: string;
      publish?: boolean;
    }
  ) {
    const s = store().__britbeeLearn!;
    const row = s.clips.find((c) => c.id === id);
    if (!row) return null;
    row.moderationStatus = patch.moderationStatus;
    row.moderationNote = clampText(patch.moderationNote, 300);
    row.moderatedBy = clampText(patch.moderatedBy, 40);
    row.moderatedAt = new Date().toISOString();
    if (typeof patch.publish === "boolean") row.published = patch.publish;
    if (patch.moderationStatus === "approved") row.published = true;
    if (patch.moderationStatus === "rejected") row.published = false;
    row.updatedAt = new Date().toISOString();
    persist();
    return row;
  },
  patch(
    id: string,
    patch: Partial<{
      title: string;
      line: string;
      tip: string;
      duration: number;
      topic: string;
      videoUrl: string;
      art: string;
      bg: string;
      published: boolean;
    }>
  ) {
    const s = store().__britbeeLearn!;
    const row = s.clips.find((c) => c.id === id);
    if (!row) return null;
    if (patch.title !== undefined) {
      const title = clampText(patch.title, 60);
      if (!title) throw Object.assign(new Error("Title cannot be empty."), { status: 400 });
      row.title = title;
    }
    if (patch.line !== undefined) {
      const line = clampText(patch.line, 140);
      if (!line) throw Object.assign(new Error("English line cannot be empty."), { status: 400 });
      row.line = line;
    }
    if (patch.tip !== undefined) row.tip = clampText(patch.tip, 160);
    if (patch.duration !== undefined) {
      if (!isDuration(patch.duration)) throw Object.assign(new Error("Pick 30, 60 or 90 seconds."), { status: 400 });
      row.duration = patch.duration;
    }
    if (patch.topic !== undefined) {
      if (!isTopic(patch.topic)) throw Object.assign(new Error("Pick a Learn topic."), { status: 400 });
      row.topic = patch.topic;
    }
    if (patch.videoUrl !== undefined) row.videoUrl = cleanUrl(patch.videoUrl);
    if (patch.art !== undefined) row.art = clampText(patch.art, 40, row.art) || row.art;
    if (patch.bg !== undefined) row.bg = clampText(patch.bg, 20, row.bg) || row.bg;
    if (typeof patch.published === "boolean") row.published = patch.published;
    if (patch.published === true && row.moderationStatus !== "approved") row.moderationStatus = "approved";
    row.updatedAt = new Date().toISOString();
    persist();
    return row;
  },
  remove(id: string) {
    const s = store().__britbeeLearn!;
    const before = s.clips.length;
    s.clips = s.clips.filter((c) => c.id !== id);
    if (s.clips.length === before) return false;
    persist();
    return true;
  },
};
