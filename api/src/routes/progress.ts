import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import { activityBoard, type AppSnapshot } from "../activityStore";
import { packHive, sendDare } from "../hive";
import { packSocial, publicRoom } from "../social";
import { socialBoard, checkEnglish } from "../socialStore";
import { learnBoard } from "../learnStore";
import { istStamp } from "../notifyStore";
import { mentorChatBoard } from "../mentorChatStore";
import { resolveChatPayload, resolveVibePayload, type AttachmentKind } from "../chatEngagement";
import { progressLearnerId } from "../progressKey";
import { users } from "../users";
import { logPracticeActivity } from "../billingStore";
import { clampBeeLook } from "@britbee/shared";

export const progressRouter = Router();

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

function classifyAttachment(mime: string): AttachmentKind | null {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "photo";
  if (m.startsWith("video/")) return "video";
  if (
    m === "application/pdf" ||
    m === "application/msword" ||
    m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    m === "application/vnd.ms-excel" ||
    m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    m === "application/vnd.ms-powerpoint" ||
    m === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    m === "text/plain"
  ) {
    return "document";
  }
  return null;
}

function allowedChatMime(mime: string) {
  return classifyAttachment(mime) !== null;
}

function chatUploadDir() {
  return path.resolve(process.cwd(), "../app/assets/chat/uploads");
}

progressRouter.use(requireAuth, requireRole("parent", "learner"));

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean).slice(0, 80);
}

progressRouter.post("/", (req: AuthedRequest, res) => {
  const body = req.body || {};
  const snapshot: AppSnapshot = {
    points: Math.max(0, Number(body.points) || 0),
    streak: Math.max(0, Number(body.streak) || 0),
    clearedSounds: asStringArray(body.clearedSounds),
    dailyDone: Boolean(body.dailyDone),
    dailyEver: Boolean(body.dailyEver),
    storyEver: Boolean(body.storyEver),
    verbsCleared: asStringArray(body.verbsCleared),
    prepCorrect: Math.max(0, Number(body.prepCorrect) || 0),
    lastActiveDay: typeof body.lastActiveDay === "string" ? body.lastActiveDay.slice(0, 10) : undefined,
    sprouts: Array.isArray(body.sprouts) ? body.sprouts.slice(0, 120) : undefined,
    planets: Array.isArray(body.planets) ? body.planets.slice(0, 120) : undefined,
    packDay: typeof body.packDay === "string" ? body.packDay : undefined,
    packsToday: Array.isArray(body.packsToday) ? asStringArray(body.packsToday) : undefined,
    pendingClaim: body.pendingClaim ?? undefined,
    claimWait: Array.isArray(body.claimWait) ? body.claimWait.slice(0, 50) : undefined,
    attendStreak: typeof body.attendStreak === "number" ? body.attendStreak : undefined,
    attendDay: typeof body.attendDay === "string" ? body.attendDay.slice(0, 10) : undefined,
    classAttendStreak: typeof body.classAttendStreak === "number" ? body.classAttendStreak : undefined,
    classAttendDay: typeof body.classAttendDay === "string" ? body.classAttendDay.slice(0, 10) : undefined,
    track: body.track && typeof body.track === "object" ? body.track : undefined,
    missed: Array.isArray(body.missed) ? body.missed.slice(0, 40) : undefined,
    todayDone: Array.isArray(body.todayDone) ? asStringArray(body.todayDone) : undefined,
  };
  const day = istStamp().day;
  const learnerId = progressLearnerId(req.user!);
  const prev = activityBoard.getProgress(learnerId);
  const { row } = activityBoard.saveProgress(learnerId, snapshot, day);
  if (req.user!.role === "parent" || req.user!.role === "learner") {
    const userId = String(req.user!._id);
    const childName =
      req.user!.child?.childName ||
      (Array.isArray((req.user as any).children)
        ? (req.user as any).children[Number((req.user as any).activeChildIndex) || 0]?.childName
        : undefined);
    const childIndex = Number((req.user as any).activeChildIndex) || 0;
    const todayDone = Array.isArray(snapshot.todayDone) ? snapshot.todayDone.length : 0;
    const prevToday = prev?.snapshot?.todayDone?.length || 0;
    if (todayDone >= 5 && prevToday < 5) {
      logPracticeActivity(userId, {
        childName,
        childIndex,
        title: "Daily path completed",
        detail: "5 of 5 activities",
        meta: { points: snapshot.points, streak: snapshot.streak },
      });
    } else if (snapshot.streak > (prev?.snapshot?.streak || 0) && snapshot.streak > 0) {
      logPracticeActivity(userId, {
        childName,
        childIndex,
        title: `${snapshot.streak}-day streak`,
        detail: childName ? `${childName} kept the streak alive` : undefined,
        meta: { streak: snapshot.streak },
      });
    }
  }
  return res.json({ ok: true, syncedAt: row.syncedAt });
});

progressRouter.get("/", async (req: AuthedRequest, res) => {
  const learnerId = progressLearnerId(req.user!);
  const found = activityBoard.getProgress(learnerId);
  const empty: AppSnapshot = {
    points: 0,
    streak: 0,
    clearedSounds: [],
    dailyDone: false,
    dailyEver: false,
    storyEver: false,
    verbsCleared: [],
    prepCorrect: 0,
    lastActiveDay: undefined,
    sprouts: [],
    planets: [],
    packDay: undefined,
    packsToday: [],
    pendingClaim: undefined,
    claimWait: [],
    attendStreak: 0,
    attendDay: undefined,
    classAttendStreak: 0,
    classAttendDay: undefined,
    track: undefined,
    missed: [],
    todayDone: [],
  };
  return res.json({ snapshot: found?.snapshot || empty, syncedAt: found?.snapshot ? found.syncedAt : undefined });
});

progressRouter.get("/hive", async (req: AuthedRequest, res) => {
  const hive = await packHive(String(req.user!._id));
  return res.json(hive);
});

progressRouter.post("/challenge", async (req: AuthedRequest, res) => {
  try {
    const toId = typeof req.body?.learnerId === "string" ? req.body.learnerId : "";
    const activityId = typeof req.body?.activityId === "string" ? req.body.activityId : "sentence";
    if (!toId) return res.status(400).json({ error: "Pick a hive mate to dare." });
    const child = req.user!.child?.childName || req.user!.name;
    const row = await sendDare(String(req.user!._id), child, toId, activityId);
    const hive = await packHive(String(req.user!._id));
    return res.status(201).json({ ok: true, challenge: row, hive });
  } catch (e: any) {
    const status = Number(e.status) || 400;
    return res.status(status).json({ error: e.message || "Could not send dare" });
  }
});

function kidName(req: AuthedRequest) {
  return req.user!.child?.childName || req.user!.name || "Bee";
}

function kidLook(req: AuthedRequest) {
  return clampBeeLook(req.user!.child?.avatar);
}

function kidHue(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n % 8;
}

function fail(res: import("express").Response, e: unknown) {
  const err = e as Error & { status?: number };
  return res.status(Number(err.status) || 400).json({ error: err.message || "Try again." });
}

async function hydrateMentorNames<T extends { from: "learner" | "mentor"; mentorId?: string; mentorName?: string }>(rows: T[]) {
  const ids = Array.from(new Set(rows.filter((m) => m.from === "mentor" && m.mentorId).map((m) => String(m.mentorId))));
  if (!ids.length) return rows;
  const nameById = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const u = await users.findById(id);
      if (u?.name) nameById.set(id, u.name);
    })
  );
  return rows.map((m) => {
    if (m.from !== "mentor" || !m.mentorId) return m;
    const liveName = nameById.get(String(m.mentorId));
    return liveName ? { ...m, mentorName: liveName } : m;
  });
}

progressRouter.get("/social", (req: AuthedRequest, res) => {
  const id = String(req.user!._id);
  return res.json(packSocial(id, kidName(req), kidHue(id), kidLook(req)));
});

progressRouter.post("/social/chat", async (req: AuthedRequest, res) => {
  try {
    const id = String(req.user!._id);
    const payload = resolveChatPayload(req.body, { englishCheck: checkEnglish });
    socialBoard.pushChatMessage({
      learnerId: id,
      name: kidName(req).split(/\s+/)[0] || "Bee",
      hue: kidHue(id),
      payload,
    });
    return res.status(201).json(packSocial(id, kidName(req), kidHue(id), kidLook(req)));
  } catch (e) {
    return fail(res, e);
  }
});

progressRouter.post("/social/vibe", async (req: AuthedRequest, res) => {
  try {
    const id = String(req.user!._id);
    const payload = resolveVibePayload(req.body);
    socialBoard.pushVibe({
      vibe: payload.vibe,
      learnerId: id,
      name: kidName(req).split(/\s+/)[0] || "Bee",
      hue: kidHue(id),
    });
    return res.status(201).json(packSocial(id, kidName(req), kidHue(id), kidLook(req)));
  } catch (e) {
    return fail(res, e);
  }
});

progressRouter.post("/social/rooms", (req: AuthedRequest, res) => {
  try {
    const id = String(req.user!._id);
    const kind = req.body?.kind === "race" ? "race" : "battle";
    const targetId = typeof req.body?.learnerId === "string" ? req.body.learnerId : undefined;
    const row = socialBoard.addRoom({
      kind,
      hostId: id,
      hostName: kidName(req).split(/\s+/)[0] || "Bee",
      hue: kidHue(id),
      day: istStamp().day,
      targetId,
    });
    return res.status(201).json({ room: publicRoom(row), social: packSocial(id, kidName(req), kidHue(id), kidLook(req)) });
  } catch (e) {
    return fail(res, e);
  }
});

progressRouter.post("/social/rooms/:id/join", (req: AuthedRequest, res) => {
  try {
    const id = String(req.user!._id);
    const row = socialBoard.joinRoom(req.params.id, {
      id,
      name: kidName(req).split(/\s+/)[0] || "Bee",
      hue: kidHue(id),
    });
    return res.json({ room: publicRoom(row), social: packSocial(id, kidName(req), kidHue(id), kidLook(req)) });
  } catch (e) {
    return fail(res, e);
  }
});

progressRouter.post("/social/rooms/:id/say", (req: AuthedRequest, res) => {
  try {
    const id = String(req.user!._id);
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const result = socialBoard.say(req.params.id, id, text);
    return res.json({
      room: publicRoom(result.room),
      awarded: result.awarded,
      already: result.already,
      social: packSocial(id, kidName(req), kidHue(id), kidLook(req)),
    });
  } catch (e) {
    return fail(res, e);
  }
});

progressRouter.get("/social/rooms/:id", (req: AuthedRequest, res) => {
  const day = istStamp().day;
  if (req.params.id === `circle-${day}`) socialBoard.ensureCircle(day);
  const found = socialBoard.roomById(req.params.id);
  if (!found) return res.status(404).json({ error: "Room not found." });
  const id = String(req.user!._id);
  return res.json({ room: publicRoom(found), social: packSocial(id, kidName(req), kidHue(id), kidLook(req)) });
});

progressRouter.get("/learn", (req: AuthedRequest, res) => {
  const id = String(req.user!._id);
  return res.json(learnBoard.feed(id));
});

progressRouter.post("/learn/:id/seen", (req: AuthedRequest, res) => {
  const id = String(req.user!._id);
  return res.json(learnBoard.markSeen(id, String(req.params.id)));
});

progressRouter.get("/mentor-chat", async (req: AuthedRequest, res) => {
  const learnerId = String(req.user!._id);
  mentorChatBoard.markReadByLearner(learnerId);
  const messages = await hydrateMentorNames(mentorChatBoard.forLearner(learnerId));
  return res.json({ messages });
});

progressRouter.post("/chat/voice-upload", chatUpload.single("file"), (req: AuthedRequest, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No voice recording." });
    const mime = (file.mimetype || "").toLowerCase();
    if (!mime.startsWith("audio/")) return res.status(400).json({ error: "Send a valid audio recording." });
    if (file.size > 10 * 1024 * 1024) return res.status(400).json({ error: "Voice note is too long (max 10 MB)." });
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".m4a", ".mp4", ".webm", ".wav", ".ogg", ".aac", ".mp3"].includes(ext) ? ext : ".m4a";
    const fileName = `voice-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    const absDir = chatUploadDir();
    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(path.join(absDir, fileName), file.buffer);
    const base = `${req.protocol}://${req.get("host")}`;
    return res.status(201).json({
      voiceUrl: `${base}/assets/chat/uploads/${fileName}`,
      voiceMime: mime,
    });
  } catch {
    return res.status(500).json({ error: "Could not upload voice note." });
  }
});

progressRouter.post("/chat/upload", chatUpload.single("file"), (req: AuthedRequest, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Choose a file to send." });
    const mime = (file.mimetype || "").toLowerCase();
    if (!allowedChatMime(mime)) return res.status(400).json({ error: "Send a photo, video, or document file." });
    const kind = classifyAttachment(mime)!;
    const maxBytes = kind === "video" ? 80 * 1024 * 1024 : kind === "photo" ? 15 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      return res.status(400).json({ error: kind === "video" ? "Video is too large (max 80 MB)." : kind === "photo" ? "Photo is too large (max 15 MB)." : "Document is too large (max 25 MB)." });
    }
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 8 ? ext : kind === "photo" ? ".jpg" : kind === "video" ? ".mp4" : ".bin";
    const fileName = `chat-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    const absDir = chatUploadDir();
    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(path.join(absDir, fileName), file.buffer);
    const base = `${req.protocol}://${req.get("host")}`;
    const name = (file.originalname || fileName).replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
    return res.status(201).json({
      attachmentUrl: `${base}/assets/chat/uploads/${fileName}`,
      attachmentMime: mime,
      attachmentName: name,
      attachmentKind: kind,
    });
  } catch {
    return res.status(500).json({ error: "Could not upload file." });
  }
});

progressRouter.post("/mentor-chat", async (req: AuthedRequest, res) => {
  try {
    const learnerId = String(req.user!._id);
    const payload = resolveChatPayload(req.body);
    mentorChatBoard.addFromLearner({ learnerId, text: payload.text, payload });
    const messages = await hydrateMentorNames(mentorChatBoard.forLearner(learnerId));
    return res.status(201).json({ messages });
  } catch (e) {
    return fail(res, e);
  }
});
