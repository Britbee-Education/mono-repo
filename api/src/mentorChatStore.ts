import fs from "fs";
import path from "path";
import type { AttachmentKind, ChatKind, ChatMaterialId, ResolvedChatPayload } from "./chatEngagement";

export type MentorChatMsg = {
  id: string;
  learnerId: string;
  text: string;
  from: "learner" | "mentor";
  createdAt: string;
  mentorId?: string;
  mentorName?: string;
  readByLearner?: boolean;
  readByMentor?: boolean;
  kind?: ChatKind;
  stickerId?: string;
  stickerUrl?: string;
  packageId?: number;
  materialId?: ChatMaterialId;
  voiceSec?: number;
  voiceUrl?: string;
  voiceText?: string;
  attachmentKind?: AttachmentKind;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
};

type Disk = {
  nextId: number;
  messages: MentorChatMsg[];
};

const DATA_PATH = path.resolve(__dirname, "../data/mentor-chat.json");

const g = globalThis as unknown as {
  __britbeeMentorChat?: Disk;
  __britbeeMentorChatLoaded?: boolean;
};

function empty(): Disk {
  return { nextId: 1, messages: [] };
}

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
    g.__britbeeMentorChat = {
      nextId: Number(parsed.nextId) || 1,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    g.__britbeeMentorChat = empty();
  }
  g.__britbeeMentorChatLoaded = true;
}

function persist() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store().__britbeeMentorChat, null, 2));
}

function store() {
  if (!g.__britbeeMentorChatLoaded) load();
  if (!g.__britbeeMentorChat) g.__britbeeMentorChat = empty();
  return g;
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function chatRowFromPayload(input: {
  id: string;
  learnerId: string;
  from: "learner" | "mentor";
  payload: ResolvedChatPayload;
  mentorId?: string;
  mentorName?: string;
  readByLearner?: boolean;
  readByMentor?: boolean;
}): MentorChatMsg {
  return {
    id: input.id,
    learnerId: input.learnerId,
    text: cleanText(input.payload.text),
    from: input.from,
    createdAt: new Date().toISOString(),
    mentorId: input.mentorId,
    mentorName: input.mentorName,
    readByLearner: input.readByLearner,
    readByMentor: input.readByMentor,
    kind: input.payload.kind,
    stickerId: input.payload.stickerId,
    stickerUrl: input.payload.stickerUrl,
    packageId: input.payload.packageId,
    materialId: input.payload.materialId,
    voiceSec: input.payload.voiceSec,
    voiceUrl: input.payload.voiceUrl,
    voiceText: input.payload.voiceText,
    attachmentKind: input.payload.attachmentKind,
    attachmentUrl: input.payload.attachmentUrl,
    attachmentName: input.payload.attachmentName,
    attachmentMime: input.payload.attachmentMime,
  };
}

export const mentorChatBoard = {
  forLearner(learnerId: string) {
    return store()
      .__britbeeMentorChat!.messages.filter((m) => m.learnerId === learnerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-120);
  },
  addFromLearner(input: { learnerId: string; text: string; payload?: ResolvedChatPayload }) {
    const payload = input.payload || { kind: "text" as const, text: input.text };
    const text = cleanText(payload.text);
    if (!text) throw Object.assign(new Error("Write your message."), { status: 400 });
    const s = store();
    const row = chatRowFromPayload({
      id: `mchat-${s.__britbeeMentorChat!.nextId++}`,
      learnerId: input.learnerId,
      from: "learner",
      payload: { ...payload, text },
      readByMentor: false,
      readByLearner: true,
    });
    s.__britbeeMentorChat!.messages.push(row);
    s.__britbeeMentorChat!.messages = s.__britbeeMentorChat!.messages.slice(-4000);
    persist();
    return row;
  },
  addFromMentor(input: { learnerId: string; text: string; mentorId: string; mentorName: string; payload?: ResolvedChatPayload }) {
    const payload = input.payload || { kind: "text" as const, text: input.text };
    const text = cleanText(payload.text);
    if (!text) throw Object.assign(new Error("Write a reply."), { status: 400 });
    const s = store();
    const row = chatRowFromPayload({
      id: `mchat-${s.__britbeeMentorChat!.nextId++}`,
      learnerId: input.learnerId,
      from: "mentor",
      payload: { ...payload, text },
      mentorId: input.mentorId,
      mentorName: input.mentorName,
      readByLearner: false,
      readByMentor: true,
    });
    s.__britbeeMentorChat!.messages.push(row);
    s.__britbeeMentorChat!.messages = s.__britbeeMentorChat!.messages.slice(-4000);
    persist();
    return row;
  },
  markReadByLearner(learnerId: string) {
    const rows = store().__britbeeMentorChat!.messages;
    let changed = false;
    for (const row of rows) {
      if (row.learnerId === learnerId && row.from === "mentor" && !row.readByLearner) {
        row.readByLearner = true;
        changed = true;
      }
    }
    if (changed) persist();
  },
  markReadByMentor(learnerId: string) {
    const rows = store().__britbeeMentorChat!.messages;
    let changed = false;
    for (const row of rows) {
      if (row.learnerId === learnerId && row.from === "learner" && !row.readByMentor) {
        row.readByMentor = true;
        changed = true;
      }
    }
    if (changed) persist();
  },
  threadSummaries() {
    const map = new Map<string, { learnerId: string; lastAt: string; lastText: string; unreadForMentor: number }>();
    for (const msg of store().__britbeeMentorChat!.messages) {
      const prev = map.get(msg.learnerId);
      const unreadBoost = msg.from === "learner" && !msg.readByMentor ? 1 : 0;
      if (!prev) {
        map.set(msg.learnerId, {
          learnerId: msg.learnerId,
          lastAt: msg.createdAt,
          lastText: msg.text,
          unreadForMentor: unreadBoost,
        });
        continue;
      }
      prev.unreadForMentor += unreadBoost;
      if (msg.createdAt >= prev.lastAt) {
        prev.lastAt = msg.createdAt;
        prev.lastText = msg.text;
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  },
};

