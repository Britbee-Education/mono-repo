import fs from "fs";
import path from "path";
import type { AttachmentKind, ChatKind, ChatMaterialId, ChatVibeId, ResolvedChatPayload, ResolvedVibePayload } from "./chatEngagement";

export type SocialKind = "circle" | "battle" | "race";
export type SocialStatus = "open" | "live" | "done";

export type ChatMsg = {
  id: string;
  learnerId: string;
  name: string;
  hue: number;
  text: string;
  createdAt: string;
  from?: "learner" | "mentor";
  mentorId?: string;
  mentorName?: string;
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

export type SocialVibe = {
  id: string;
  vibe: ChatVibeId;
  learnerId: string;
  name: string;
  hue: number;
  at: string;
  stickerId?: string;
  stickerUrl?: string;
  packageId?: number;
};

export type RoomPlayer = {
  id: string;
  name: string;
  hue: number;
  answer?: string;
  doneAt?: string;
  awarded?: number;
};

export type SocialRoom = {
  id: string;
  kind: SocialKind;
  title: string;
  prompt: string;
  hostId: string;
  hostName: string;
  day: string;
  status: SocialStatus;
  players: RoomPlayer[];
  winnerId?: string;
  winnerName?: string;
  targetId?: string;
  createdAt: string;
  mentorRoomId?: string;
};

export type MentorRoomStatus = "active" | "ended" | "expired";

export type MentorPublishedRoom = {
  id: string;
  title: string;
  activityId: string;
  activityName: string;
  prompt: string;
  mentorId: string;
  mentorName: string;
  publishedAt: string;
  expiresAt: string;
  endedAt?: string;
  status: MentorRoomStatus;
  playRoomId: string;
};

type Presence = { learnerId: string; name: string; hue: number; look?: import("@britbee/shared").BeeLook; at: number };

type Disk = {
  nextId: number;
  chat: ChatMsg[];
  rooms: SocialRoom[];
  mentorRooms: MentorPublishedRoom[];
};

const DATA_PATH = path.resolve(__dirname, "../data/social.json");
const PRESENCE_MS = 45_000;

const g = globalThis as unknown as {
  __britbeeSocial?: Disk;
  __britbeeSocialLoaded?: boolean;
  __britbeePresence?: Map<string, Presence>;
  __britbeeVibes?: SocialVibe[];
};

const VIBE_TTL_MS = 10_000;

function empty(): Disk {
  return { nextId: 1, chat: [], rooms: [], mentorRooms: [] };
}

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
    g.__britbeeSocial = {
      nextId: Number(parsed.nextId) || 1,
      chat: Array.isArray(parsed.chat) ? parsed.chat : [],
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      mentorRooms: Array.isArray(parsed.mentorRooms) ? parsed.mentorRooms : [],
    };
  } catch {
    g.__britbeeSocial = empty();
  }
  g.__britbeeSocialLoaded = true;
}

function persist() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store().__britbeeSocial, null, 2));
}

function store() {
  if (!g.__britbeeSocialLoaded) load();
  if (!g.__britbeeSocial) g.__britbeeSocial = empty();
  if (!g.__britbeePresence) g.__britbeePresence = new Map();
  return g;
}

export const CIRCLE_PROMPTS = [
  "What did you eat today?",
  "Name a colour you like.",
  "Who is in your family?",
  "What animal can jump?",
  "Say one kind word.",
  "Where do you like to play?",
  "What makes you smile?",
];

export const BATTLE_LINES = [
  "I like red apples.",
  "The cat is on the mat.",
  "She can jump high.",
  "We play in the park.",
  "My name is Bee.",
  "The sun is yellow.",
  "I can say hello.",
  "This is my book.",
];

export const RACE_WORDS = ["apple", "happy", "jump", "green", "friend", "school", "honey", "smile"];

const BAD = /\b(stupid|idiot|dumb|hate|kill|shut\s*up|ugly|dumbass|fool)\b/i;

export function checkEnglish(text: string): string | null {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 2) return "Say a little more in English.";
  if (t.length > 90) return "Keep it short.";
  if (!/[A-Za-z]/.test(t)) return "Write in English.";
  const extra = t.replace(/[A-Za-z0-9\s.,!?'’-]/g, "");
  if (extra.length > 2) return "English letters only.";
  if (BAD.test(t)) return "Kind words only.";
  return null;
}

export function normLine(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function circlePrompt(day: string) {
  let n = 0;
  for (let i = 0; i < day.length; i++) n = (n * 31 + day.charCodeAt(i)) >>> 0;
  return CIRCLE_PROMPTS[n % CIRCLE_PROMPTS.length];
}

function pick<T>(list: T[], seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  return list[n % list.length];
}

export const socialBoard = {
  chat(limit = 40) {
    return store().__britbeeSocial!.chat.slice(0, limit);
  },
  chatChronological(limit = 120) {
    return store()
      .__britbeeSocial!.chat.slice(0, limit)
      .slice()
      .reverse();
  },
  pushMentorToCommon(input: { mentorId: string; mentorName: string; text: string; payload?: ResolvedChatPayload }) {
    const payload = input.payload || { kind: "text" as const, text: input.text };
    const text = payload.text.replace(/\s+/g, " ").trim().slice(0, 500);
    if (!text) throw Object.assign(new Error("Write your message."), { status: 400 });
    const s = store();
    const row: ChatMsg = {
      id: `chat-${s.__britbeeSocial!.nextId++}`,
      learnerId: `guide:${input.mentorId}`,
      name: input.mentorName || "Mentor",
      hue: 7,
      text,
      createdAt: new Date().toISOString(),
      from: "mentor",
      mentorId: input.mentorId,
      mentorName: input.mentorName,
      kind: payload.kind,
      stickerId: payload.stickerId,
      stickerUrl: payload.stickerUrl,
      packageId: payload.packageId,
      materialId: payload.materialId,
      voiceSec: payload.voiceSec,
      voiceUrl: payload.voiceUrl,
      voiceText: payload.voiceText,
    };
    s.__britbeeSocial!.chat.unshift(row);
    s.__britbeeSocial!.chat = s.__britbeeSocial!.chat.slice(0, 200);
    persist();
    return row;
  },
  roomsForDay(day: string) {
    return store().__britbeeSocial!.rooms.filter((r) => r.day === day);
  },
  roomById(id: string) {
    return store().__britbeeSocial!.rooms.find((r) => r.id === id) || null;
  },
  online() {
    const now = Date.now();
    const out: Presence[] = [];
    for (const row of store().__britbeePresence!.values()) {
      if (now - row.at <= PRESENCE_MS) out.push(row);
    }
    return out.sort((a, b) => b.at - a.at);
  },
  heartbeat(learnerId: string, name: string, hue: number, look?: import("@britbee/shared").BeeLook) {
    store().__britbeePresence!.set(learnerId, { learnerId, name, hue, look, at: Date.now() });
  },
  pushChat(input: { learnerId: string; name: string; hue: number; text: string }) {
    return socialBoard.pushChatMessage({
      learnerId: input.learnerId,
      name: input.name,
      hue: input.hue,
      payload: { kind: "text", text: input.text },
    });
  },
  pushChatMessage(input: { learnerId: string; name: string; hue: number; payload: ResolvedChatPayload }) {
    const payload = input.payload;
    if (payload.kind === "text") {
      const err = checkEnglish(payload.text);
      if (err) {
        const e = new Error(err) as Error & { status: number };
        e.status = 400;
        throw e;
      }
    }
    const s = store();
    const row: ChatMsg = {
      id: `chat-${s.__britbeeSocial!.nextId++}`,
      learnerId: input.learnerId,
      name: input.name,
      hue: input.hue,
      text: payload.text.replace(/\s+/g, " ").trim(),
      createdAt: new Date().toISOString(),
      kind: payload.kind,
      stickerId: payload.stickerId,
      stickerUrl: payload.stickerUrl,
      packageId: payload.packageId,
      materialId: payload.materialId,
      voiceSec: payload.voiceSec,
      voiceUrl: payload.voiceUrl,
      voiceText: payload.voiceText,
      attachmentKind: payload.attachmentKind,
      attachmentUrl: payload.attachmentUrl,
      attachmentName: payload.attachmentName,
      attachmentMime: payload.attachmentMime,
    };
    s.__britbeeSocial!.chat.unshift(row);
    s.__britbeeSocial!.chat = s.__britbeeSocial!.chat.slice(0, 200);
    persist();
    return row;
  },
  pushVibe(input: {
    vibe: ChatVibeId;
    learnerId: string;
    name: string;
    hue: number;
    stickerId?: string;
    stickerUrl?: string;
    packageId?: number;
  }) {
    if (!g.__britbeeVibes) g.__britbeeVibes = [];
    const row: SocialVibe = {
      id: `vibe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      vibe: input.vibe,
      learnerId: input.learnerId,
      name: input.name,
      hue: input.hue,
      at: new Date().toISOString(),
      stickerId: input.stickerId,
      stickerUrl: input.stickerUrl,
      packageId: input.packageId,
    };
    g.__britbeeVibes.unshift(row);
    g.__britbeeVibes = g.__britbeeVibes.slice(0, 80);
    return row;
  },
  recentVibes(limit = 24) {
    const now = Date.now();
    if (!g.__britbeeVibes) g.__britbeeVibes = [];
    g.__britbeeVibes = g.__britbeeVibes.filter((v) => now - Date.parse(v.at) <= VIBE_TTL_MS);
    return g.__britbeeVibes.slice(0, limit);
  },
  ensureCircle(day: string, hostName = "Maya") {
    const s = store();
    const id = `circle-${day}`;
    let row = s.__britbeeSocial!.rooms.find((r) => r.id === id);
    if (!row) {
      row = {
        id,
        kind: "circle",
        title: "Circle talk",
        prompt: circlePrompt(day),
        hostId: "guide:maya",
        hostName,
        day,
        status: "live",
        players: [],
        createdAt: new Date().toISOString(),
      };
      s.__britbeeSocial!.rooms.unshift(row);
      persist();
    }
    return row;
  },
  addRoom(input: {
    kind: "battle" | "race";
    hostId: string;
    hostName: string;
    hue: number;
    day: string;
    targetId?: string;
    targetName?: string;
  }) {
    const s = store();
    const id = `room-${s.__britbeeSocial!.nextId++}`;
    const prompt =
      input.kind === "battle" ? pick(BATTLE_LINES, id) : pick(RACE_WORDS, id);
    const row: SocialRoom = {
      id,
      kind: input.kind,
      title: input.kind === "battle" ? "Buzz battle" : "Word race",
      prompt,
      hostId: input.hostId,
      hostName: input.hostName,
      day: input.day,
      status: "open",
      targetId: input.targetId,
      players: [{ id: input.hostId, name: input.hostName, hue: input.hue }],
      createdAt: new Date().toISOString(),
    };
    s.__britbeeSocial!.rooms.unshift(row);
    persist();
    return row;
  },
  joinRoom(id: string, player: RoomPlayer) {
    const row = this.roomById(id);
    if (!row) {
      const e = new Error("That room closed.") as Error & { status: number };
      e.status = 404;
      throw e;
    }
    if (row.status === "done") {
      const e = new Error("This one is over.") as Error & { status: number };
      e.status = 400;
      throw e;
    }
    if (row.kind === "battle" && row.players.length >= 2 && !row.players.some((p) => p.id === player.id)) {
      const e = new Error("Battle is full.") as Error & { status: number };
      e.status = 400;
      throw e;
    }
    if (row.kind === "race" && row.players.length >= 6 && !row.players.some((p) => p.id === player.id)) {
      const e = new Error("Race is full.") as Error & { status: number };
      e.status = 400;
      throw e;
    }
    const already = row.players.some((p) => p.id === player.id);
    if (!already) {
      row.players.push({ id: player.id, name: player.name, hue: player.hue });
    }
    let changed = !already;
    if (row.kind === "battle" && row.players.length >= 2 && row.status === "open") {
      row.status = "live";
      changed = true;
    }
    if (row.kind === "race" && row.players.length >= 2 && row.status === "open") {
      row.status = "live";
      changed = true;
    }
    if (changed) persist();
    return row;
  },
  say(id: string, learnerId: string, text: string) {
    const row = this.roomById(id);
    if (!row) {
      const e = new Error("That room closed.") as Error & { status: number };
      e.status = 404;
      throw e;
    }
    const player = row.players.find((p) => p.id === learnerId);
    if (!player) {
      const e = new Error("Join first.") as Error & { status: number };
      e.status = 400;
      throw e;
    }
    if (player.answer) return { room: row, awarded: 0, already: true as const };

    if (row.kind === "circle") {
      const err = checkEnglish(text);
      if (err) {
        const e = new Error(err) as Error & { status: number };
        e.status = 400;
        throw e;
      }
      player.answer = text.replace(/\s+/g, " ").trim();
      player.doneAt = new Date().toISOString();
      player.awarded = 5;
      persist();
      return { room: row, awarded: 5, already: false as const };
    }

    if (normLine(text) !== normLine(row.prompt)) {
      const e = new Error("Say it the same. Try again.") as Error & { status: number };
      e.status = 400;
      throw e;
    }
    player.answer = row.prompt;
    player.doneAt = new Date().toISOString();

    if (row.kind === "battle") {
      if (!row.winnerId) {
        row.winnerId = learnerId;
        row.winnerName = player.name;
        player.awarded = 10;
        if (row.players.filter((p) => p.answer).length >= 2) row.status = "done";
        persist();
        return { room: row, awarded: 10, already: false as const };
      }
      if (row.players.filter((p) => p.answer).length >= 2) row.status = "done";
      persist();
      return { room: row, awarded: 0, already: false as const };
    }

    const place = row.players.filter((p) => p.answer).length;
    player.awarded = place <= 3 ? 6 : 0;
    if (place >= Math.min(4, row.players.length) || place >= 4) row.status = "done";
    else row.status = "live";
    persist();
    return { room: row, awarded: player.awarded, already: false as const };
  },
  ghostSay(room: SocialRoom, ghost: RoomPlayer, text: string) {
    if (room.players.some((p) => p.id === ghost.id && p.answer)) return room;
    if (!room.players.some((p) => p.id === ghost.id)) room.players.push({ ...ghost });
    const player = room.players.find((p) => p.id === ghost.id)!;
    player.answer = text;
    player.doneAt = new Date().toISOString();
    if (room.kind === "battle" && !room.winnerId) {
      room.winnerId = ghost.id;
      room.winnerName = ghost.name;
    }
    if (room.kind === "battle" && room.players.filter((p) => p.answer).length >= 2) room.status = "done";
    persist();
    return room;
  },
  ghostChat(input: { learnerId: string; name: string; hue: number; text: string }) {
    const s = store();
    const last = s.__britbeeSocial!.chat[0];
    if (last && Date.now() - Date.parse(last.createdAt) < 80_000) return null;
    const row: ChatMsg = {
      id: `chat-${s.__britbeeSocial!.nextId++}`,
      learnerId: input.learnerId,
      name: input.name,
      hue: input.hue,
      text: input.text,
      createdAt: new Date().toISOString(),
    };
    s.__britbeeSocial!.chat.unshift(row);
    s.__britbeeSocial!.chat = s.__britbeeSocial!.chat.slice(0, 200);
    persist();
    return row;
  },
  publishMentorRoom(input: {
    title: string;
    activityId: string;
    activityName: string;
    prompt: string;
    mentorId: string;
    mentorName: string;
    durationMin?: number;
    day: string;
  }) {
    const title = input.title.replace(/\s+/g, " ").trim().slice(0, 80);
    const prompt = input.prompt.replace(/\s+/g, " ").trim().slice(0, 280);
    const activityName = input.activityName.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!title || !prompt) throw Object.assign(new Error("Title and activity notes are required."), { status: 400 });
    const s = store();
    const now = new Date();
    const durationMin = Math.min(24 * 60, Math.max(15, Number(input.durationMin) || 90));
    const id = `mroom-${s.__britbeeSocial!.nextId++}`;
    const playRoomId = `circle-mentor-${id}`;
    const expiresAt = new Date(now.getTime() + durationMin * 60_000).toISOString();
    const playRoom: SocialRoom = {
      id: playRoomId,
      kind: "circle",
      title,
      prompt,
      hostId: `guide:${input.mentorId}`,
      hostName: input.mentorName || "Mentor",
      day: input.day,
      status: "live",
      players: [],
      createdAt: now.toISOString(),
      mentorRoomId: id,
    };
    const row: MentorPublishedRoom = {
      id,
      title,
      activityId: input.activityId,
      activityName,
      prompt,
      mentorId: input.mentorId,
      mentorName: input.mentorName || "Mentor",
      publishedAt: now.toISOString(),
      expiresAt,
      status: "active",
      playRoomId,
    };
    s.__britbeeSocial!.mentorRooms.unshift(row);
    s.__britbeeSocial!.rooms.unshift(playRoom);
    s.__britbeeSocial!.mentorRooms = s.__britbeeSocial!.mentorRooms.slice(0, 120);
    persist();
    return row;
  },
  refreshMentorRooms() {
    const s = store();
    const now = Date.now();
    let changed = false;
    for (const row of s.__britbeeSocial!.mentorRooms) {
      if (row.status !== "active") continue;
      if (Date.parse(row.expiresAt) <= now) {
        row.status = "expired";
        changed = true;
        const play = s.__britbeeSocial!.rooms.find((r) => r.id === row.playRoomId);
        if (play && play.status !== "done") {
          play.status = "done";
          changed = true;
        }
      }
    }
    if (changed) persist();
  },
  mentorRoomsAll(limit = 80) {
    this.refreshMentorRooms();
    return store()
      .__britbeeSocial!.mentorRooms.slice(0, limit)
      .slice()
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  },
  endMentorRoom(id: string) {
    const s = store();
    const row = s.__britbeeSocial!.mentorRooms.find((r) => r.id === id);
    if (!row) {
      const e = new Error("Room not found.") as Error & { status: number };
      e.status = 404;
      throw e;
    }
    if (row.status === "active") {
      row.status = "ended";
      row.endedAt = new Date().toISOString();
    }
    const play = s.__britbeeSocial!.rooms.find((r) => r.id === row.playRoomId);
    if (play && play.status !== "done") play.status = "done";
    persist();
    return row;
  },
  flush() {
    persist();
  },
};
