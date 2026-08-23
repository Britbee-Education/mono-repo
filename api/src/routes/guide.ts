import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { users } from "../users";
import { guideNotes } from "../guideNotes";
import { ACTIVITY_IDS, activityBoard, isActivityId, type ActivityId, type CoachStatus } from "../activityStore";
import { ACTIVITY_LABEL, classJoinUrl, classRoomNonce, classRoomUrl, classStatus, istStamp, notifyBoard, packLiveClass } from "../notifyStore";
import { classVars, expandToLearnerIds, resolveTargets } from "../notifyTick";
import { creditClassEndRewards } from "../classRewards";
import { progressLearnerId } from "../progressKey";
import { requireAuth, requireRole, toPublicUser, type AuthedRequest } from "../middleware/auth";
import { LEARN_DURATIONS, LEARN_TOPICS, learnBoard } from "../learnStore";
import { mentorChatBoard } from "../mentorChatStore";
import { socialBoard } from "../socialStore";
import { publicMentorRoom } from "../social";
import { clearMonthOverrides, getOverridesForMonth, setDayOverride, setMonthOverrides } from "../rosterStore";
import {
  cancelSubscription,
  confirmPaymentByGuide,
  createManualCheckout,
  failPaymentByGuide,
  getParentBillingDetail,
  getSummary,
  guideOverview,
  listAllPendingPayments,
  resumeSubscription,
  seedDemoBilling,
  setPlanByGuide,
  type PaymentMethod,
  type PlanId,
} from "../billingStore";
import { syncUserPlan } from "../billingSync";

export const guideRouter = Router();
const learnUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

guideRouter.use(requireAuth, requireRole("guide", "superadmin"));

const STATUSES: CoachStatus[] = ["not-started", "assigned", "in-progress", "needs-review", "cleared"];

function childName(u: ReturnType<typeof toPublicUser>) {
  return u.child?.childName || u.name;
}

function packLearner(u: ReturnType<typeof toPublicUser>, raw?: { role?: string; activeChildIndex?: number; _id?: string }) {
  const progressId = raw ? progressLearnerId({ _id: raw._id || u.id, role: raw.role || u.role, activeChildIndex: raw.activeChildIndex }) : u.id;
  const progress = activityBoard.getProgress(progressId);
  const coachRows = activityBoard.coachForLearner(u.id);
  const byActivity = Object.fromEntries(ACTIVITY_IDS.map((id) => [id, coachRows.find((c) => c.activityId === id) || null]));
  return {
    ...u,
    childLabel: childName(u),
    progress: progress?.snapshot || null,
    syncedAt: progress?.syncedAt || null,
    activities: byActivity,
  };
}

guideRouter.get("/learners", async (_req, res) => {
  const rows = await users.listByRoles(["parent", "learner"]);
  const latest = guideNotes.latestMap(rows.map((u) => String(u._id)));
  return res.json({
    learners: rows.map((u) => {
      const pub = toPublicUser(u);
      const packed = packLearner(pub, u);
      return {
        ...packed,
        lastNote: latest.get(String(u._id))?.text || null,
        lastNoteAt: latest.get(String(u._id))?.createdAt || null,
      };
    }),
  });
});

guideRouter.get("/board", async (_req, res) => {
  const rows = await users.listByRoles(["parent", "learner"]);
  return res.json({
    activities: ACTIVITY_IDS,
    learners: rows.map((u) => packLearner(toPublicUser(u), u)),
  });
});

guideRouter.get("/activities/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!isActivityId(id)) return res.status(404).json({ error: "Unknown activity" });
  const rows = await users.listByRoles(["parent", "learner"]);
  return res.json({
    id,
    learners: rows.map((u) => packLearner(toPublicUser(u), u)),
    notes: guideNotes.listForActivity(id),
    events: activityBoard.eventsFor(id),
  });
});

guideRouter.get("/learners/:id", async (req, res) => {
  const user = await users.findById(String(req.params.id));
  if (!user || (user.role !== "parent" && user.role !== "learner")) {
    return res.status(404).json({ error: "Learner not found" });
  }
  const publicUser = toPublicUser(user);
  return res.json({
    learner: packLearner(publicUser, user),
    notes: guideNotes.listFor(String(user._id)),
    events: activityBoard.eventsFor(undefined, publicUser.id),
  });
});

guideRouter.post("/learners/:id/notes", async (req: AuthedRequest, res) => {
  const user = await users.findById(String(req.params.id));
  if (!user || (user.role !== "parent" && user.role !== "learner")) {
    return res.status(404).json({ error: "Learner not found" });
  }
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "Write a short note for this session." });
  if (text.length > 600) return res.status(400).json({ error: "Keep notes under 600 characters." });
  const activityRaw = typeof req.body?.activityId === "string" ? req.body.activityId : "";
  const activityId = isActivityId(activityRaw) ? activityRaw : undefined;
  const note = guideNotes.add({
    learnerId: String(user._id),
    guideId: String(req.user!._id),
    guideName: req.user!.name,
    text,
    activityId,
  });
  if (activityId) {
    activityBoard.upsertCoach({
      learnerId: String(user._id),
      activityId,
      coachNote: text,
      guideId: String(req.user!._id),
      guideName: req.user!.name,
    });
  }
  return res.status(201).json({ note });
});

guideRouter.patch("/learners/:id/activities/:activityId", async (req: AuthedRequest, res) => {
  const user = await users.findById(String(req.params.id));
  if (!user || (user.role !== "parent" && user.role !== "learner")) {
    return res.status(404).json({ error: "Learner not found" });
  }
  const activityId = String(req.params.activityId);
  if (!isActivityId(activityId)) return res.status(404).json({ error: "Unknown activity" });
  const statusRaw = typeof req.body?.status === "string" ? req.body.status : undefined;
  if (statusRaw && !STATUSES.includes(statusRaw as CoachStatus)) {
    return res.status(400).json({ error: "Pick a valid status." });
  }
  const focusItem = typeof req.body?.focusItem === "string" ? req.body.focusItem.trim().slice(0, 80) : undefined;
  const coachNote = typeof req.body?.coachNote === "string" ? req.body.coachNote.trim().slice(0, 600) : undefined;
  const { record } = activityBoard.upsertCoach({
    learnerId: String(user._id),
    activityId: activityId as ActivityId,
    status: statusRaw as CoachStatus | undefined,
    focusItem,
    coachNote,
    guideId: String(req.user!._id),
    guideName: req.user!.name,
  });
  return res.json({ activity: record, learner: packLearner(toPublicUser(user), user) });
});

guideRouter.get("/notify/templates", (_req, res) => {
  return res.json({ templates: notifyBoard.templates() });
});

guideRouter.post("/notify/templates", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  const kind = req.body?.kind === "activity" || req.body?.kind === "class" ? req.body.kind : "general";
  const activityRaw = typeof req.body?.activityId === "string" ? req.body.activityId : "";
  if (!name || !title || !body) return res.status(400).json({ error: "Name, title and body are required." });
  const row = notifyBoard.saveTemplate({
    name: name.slice(0, 80),
    title: title.slice(0, 80),
    body: body.slice(0, 600),
    kind,
    activityId: isActivityId(activityRaw) ? activityRaw : undefined,
  });
  return res.status(201).json({ template: row });
});

guideRouter.patch("/notify/templates/:id", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  const kind = req.body?.kind === "activity" || req.body?.kind === "class" ? req.body.kind : "general";
  const activityRaw = typeof req.body?.activityId === "string" ? req.body.activityId : "";
  if (!name || !title || !body) return res.status(400).json({ error: "Name, title and body are required." });
  const row = notifyBoard.saveTemplate({
    id: String(req.params.id),
    name: name.slice(0, 80),
    title: title.slice(0, 80),
    body: body.slice(0, 600),
    kind,
    activityId: isActivityId(activityRaw) ? activityRaw : undefined,
  });
  if (!row) return res.status(404).json({ error: "Template not found" });
  return res.json({ template: row });
});

guideRouter.delete("/notify/templates/:id", (req, res) => {
  notifyBoard.deleteTemplate(String(req.params.id));
  return res.json({ ok: true });
});

guideRouter.get("/notify/schedules", (_req, res) => {
  return res.json({ schedules: notifyBoard.schedules(), templates: notifyBoard.templates() });
});

guideRouter.patch("/notify/schedules/:id", (req, res) => {
  const time = typeof req.body?.time === "string" ? req.body.time : undefined;
  const templateId = typeof req.body?.templateId === "string" ? req.body.templateId : undefined;
  const enabled = typeof req.body?.enabled === "boolean" ? req.body.enabled : undefined;
  const row = notifyBoard.patchSchedule(String(req.params.id), { time, templateId, enabled });
  if (!row) return res.status(404).json({ error: "Schedule not found" });
  return res.json({ schedule: row });
});

guideRouter.get("/notify/classes", (_req, res) => {
  return res.json({
    classes: notifyBoard.classes().map((c) => ({
      ...packLiveClass(c),
      learnerIds: c.learnerIds,
      joinedLearnerIds: c.joinedLearnerIds,
      joinUrl: classJoinUrl(c.roomUrl || packLiveClass(c).roomUrl, c.guideName),
    })),
  });
});

guideRouter.post("/notify/classes", async (req: AuthedRequest, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const body =
    (typeof req.body?.body === "string" ? req.body.body.trim() : "") ||
    `Live class with ${req.user!.name}. Open Classes and tap Join when it is live.`;
  const startsAt = typeof req.body?.startsAt === "string" ? req.body.startsAt : "";
  if (!title || !startsAt) return res.status(400).json({ error: "Title and class time are required." });
  if (Number.isNaN(new Date(startsAt).getTime())) return res.status(400).json({ error: "Pick a valid class time." });
  const durationMin = Number(req.body?.durationMin) || 30;
  const learnerIds = Array.isArray(req.body?.learnerIds) ? req.body.learnerIds.map(String) : [];
  const classKindRaw = typeof req.body?.classKind === "string" ? req.body.classKind : "";
  const classKind = classKindRaw === "individual" || classKindRaw === "group"
    ? classKindRaw
    : learnerIds.length === 1
      ? "individual"
      : "group";
  const audienceIds = await expandToLearnerIds(learnerIds);
  const row = notifyBoard.addClass({
    title: title.slice(0, 80),
    body: body.slice(0, 600),
    startsAt,
    durationMin,
    learnerIds: audienceIds,
    classKind,
    guideName: req.user!.name,
    guideId: String(req.user!._id),
  });
  // Validate after mapping parent->learner so rules are applied to real kids only.
  if (classKind === "individual" && audienceIds.length !== 1) return res.status(400).json({ error: "Pick exactly one learner for a 1:1 class." });
  if (classKind === "group" && audienceIds.length === 1) return res.status(400).json({ error: "Group class needs multiple learners or everyone." });

  const targets = await resolveTargets(audienceIds);
  const ist = istStamp();
  const start = new Date(startsAt);
  const time = istStamp(start).time;
  const date = istStamp(start).day;
  notifyBoard.deliver({
    learners: targets,
    title: row.title,
    body: row.body,
    kind: "class",
    href: `/class/${row.id}`,
    source: "class",
    varsFor: (l) => classVars(l, { time, date, guide: req.user!.name, activity: "live class" }),
  });
  notifyBoard.patchClass(row.id, { sentAt: new Date().toISOString() });
  return res.status(201).json({
    class: { ...packLiveClass({ ...row, sentAt: new Date().toISOString() }), learnerIds: row.learnerIds },
    sent: targets.length,
    today: ist.day,
  });
});

guideRouter.post("/notify/classes/:id/live", async (req: AuthedRequest, res) => {
  const row = notifyBoard.classes().find((c) => c.id === String(req.params.id));
  if (!row) return res.status(404).json({ error: "Class not found" });
  if (row.endedAt) return res.status(400).json({ error: "This class already ended." });
  const already = Boolean(row.liveAt);
  const currentUrl = row.roomUrl || "";
  const forceRotate = /meet\.jit\.si/i.test(currentUrl);
  const live = notifyBoard.patchClass(row.id, {
    liveAt: row.liveAt || new Date().toISOString(),
    endedAt: undefined,
    roomUrl: !already || forceRotate ? classRoomUrl(row.id, classRoomNonce()) : row.roomUrl,
  });
  if (!already && live) {
    const targets = await resolveTargets(live.learnerIds);
    const ist = istStamp();
    notifyBoard.deliver({
      learners: targets,
      title: "Your mentor is in class",
      body: "Hi {{child}}, {{guide}} is in live class now. Open Classes and tap Join.",
      kind: "class",
      href: `/class/${live.id}`,
      source: "class",
      varsFor: (l) => classVars(l, { guide: req.user!.name, time: ist.time, date: ist.day, activity: "live class" }),
    });
  }
  return res.json({ class: live ? { ...packLiveClass(live), learnerIds: live.learnerIds } : null });
});

guideRouter.post("/notify/classes/:id/end", async (req: AuthedRequest, res) => {
  const row = notifyBoard.patchClass(String(req.params.id), { endedAt: new Date().toISOString() });
  if (!row) return res.status(404).json({ error: "Class not found" });

  const joinedIds = row.joinedLearnerIds?.length ? row.joinedLearnerIds : [];
  if (joinedIds.length) {
    const progressIds: string[] = [];
    for (const authId of joinedIds) {
      const user = await users.findById(authId);
      progressIds.push(user ? progressLearnerId(user) : authId);
    }
    creditClassEndRewards(row.id, progressIds);
  }

  const notifyIds = joinedIds.length ? joinedIds : row.learnerIds;
  if (notifyIds.length) {
    const targets = await resolveTargets(notifyIds);
    const ist = istStamp();
    notifyBoard.deliver({
      learners: targets,
      title: joinedIds.length ? "Class finished — Buzz Points added!" : "Class finished",
      body: joinedIds.length
        ? "Hi {{child}}, great work with {{guide}}! Your class Buzz Points are in your hive."
        : "Hi {{child}}, {{guide}} ended class. Join next time to earn a Buzz Points pack.",
      kind: "class",
      href: `/class/${row.id}`,
      source: "class",
      varsFor: (l) => classVars(l, { guide: row.guideName, time: ist.time, date: ist.day, activity: "live class" }),
    });
  }

  return res.json({
    class: { ...packLiveClass(row), learnerIds: row.learnerIds, joinedLearnerIds: row.joinedLearnerIds },
    credited: joinedIds.length,
  });
});

guideRouter.delete("/notify/classes/:id", (req, res) => {
  notifyBoard.deleteClass(String(req.params.id));
  return res.json({ ok: true });
});

guideRouter.get("/learn", (_req, res) => {
  return res.json({ clips: learnBoard.list(true), topics: LEARN_TOPICS, durations: LEARN_DURATIONS });
});

guideRouter.post("/learn/:id/moderate", (req: AuthedRequest, res) => {
  try {
    const moderationStatusRaw = typeof req.body?.moderationStatus === "string" ? req.body.moderationStatus : "pending";
    const moderationStatus = ["pending", "approved", "rejected"].includes(moderationStatusRaw)
      ? (moderationStatusRaw as "pending" | "approved" | "rejected")
      : "pending";
    const row = learnBoard.moderate(String(req.params.id), {
      moderationStatus,
      moderationNote: typeof req.body?.moderationNote === "string" ? req.body.moderationNote : "",
      moderatedBy: req.user!.name,
      publish: typeof req.body?.publish === "boolean" ? req.body.publish : undefined,
    });
    if (!row) return res.status(404).json({ error: "Clip not found." });
    return res.json({ clip: row });
  } catch (e) {
    const err = e as Error & { status?: number };
    return res.status(Number(err.status) || 400).json({ error: err.message || "Could not moderate clip." });
  }
});

guideRouter.post("/learn/upload", learnUpload.single("video"), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Attach a video file." });
    const mime = (file.mimetype || "").toLowerCase();
    if (!mime.startsWith("video/")) return res.status(400).json({ error: "Upload a valid video file." });
    const ext = path.extname(file.originalname || "").toLowerCase() || ".mp4";
    const safeExt = [".mp4", ".mov", ".m4v", ".webm"].includes(ext) ? ext : ".mp4";
    const fileName = `learn-upload-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    const absDir = path.resolve(process.cwd(), "../app/assets/learn/uploads");
    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(path.join(absDir, fileName), file.buffer);
    const base = `${req.protocol}://${req.get("host")}`;
    return res.status(201).json({ videoUrl: `${base}/assets/learn/uploads/${fileName}` });
  } catch {
    return res.status(500).json({ error: "Could not upload video." });
  }
});

guideRouter.post("/learn", (req: AuthedRequest, res) => {
  try {
    const row = learnBoard.add({
      title: typeof req.body?.title === "string" ? req.body.title : "",
      line: typeof req.body?.line === "string" ? req.body.line : "",
      tip: typeof req.body?.tip === "string" ? req.body.tip : "",
      duration: Number(req.body?.duration) || 30,
      topic: typeof req.body?.topic === "string" ? req.body.topic : "Speak",
      videoUrl: typeof req.body?.videoUrl === "string" ? req.body.videoUrl : "",
      art: typeof req.body?.art === "string" ? req.body.art : "bee",
      bg: typeof req.body?.bg === "string" ? req.body.bg : "#1A2B5F",
      guideName: req.user!.name,
      guideId: String(req.user!._id),
      published: req.body?.published !== false,
    });
    return res.status(201).json({ clip: row });
  } catch (e) {
    const err = e as Error & { status?: number };
    return res.status(Number(err.status) || 400).json({ error: err.message || "Could not post clip." });
  }
});

guideRouter.patch("/learn/:id", (req, res) => {
  try {
    const row = learnBoard.patch(String(req.params.id), {
      title: typeof req.body?.title === "string" ? req.body.title : undefined,
      line: typeof req.body?.line === "string" ? req.body.line : undefined,
      tip: typeof req.body?.tip === "string" ? req.body.tip : undefined,
      duration: req.body?.duration !== undefined ? Number(req.body.duration) : undefined,
      topic: typeof req.body?.topic === "string" ? req.body.topic : undefined,
      videoUrl: typeof req.body?.videoUrl === "string" ? req.body.videoUrl : undefined,
      art: typeof req.body?.art === "string" ? req.body.art : undefined,
      bg: typeof req.body?.bg === "string" ? req.body.bg : undefined,
      published: typeof req.body?.published === "boolean" ? req.body.published : undefined,
    });
    if (!row) return res.status(404).json({ error: "Clip not found." });
    return res.json({ clip: row });
  } catch (e) {
    const err = e as Error & { status?: number };
    return res.status(Number(err.status) || 400).json({ error: err.message || "Could not update clip." });
  }
});

guideRouter.delete("/learn/:id", (req, res) => {
  if (!learnBoard.remove(String(req.params.id))) return res.status(404).json({ error: "Clip not found." });
  return res.json({ ok: true });
});

guideRouter.get("/notify/log", (_req, res) => {
  return res.json({ messages: notifyBoard.log(120) });
});

guideRouter.get("/notify/inbox", async (req: AuthedRequest, res) => {
  const guideId = String(req.user!._id);
  const learners = (await users.listByRoles(["parent", "learner"])).map(toPublicUser);
  const nameById = new Map(learners.map((u) => [u.id, childName(u)]));

  type InboxRow = {
    id: string;
    kind: "chat" | "class" | "hive";
    title: string;
    body: string;
    createdAt: string;
    unread: boolean;
    href?: string;
    learnerId?: string;
  };

  const items: InboxRow[] = [];
  const now = Date.now();

  for (const t of mentorChatBoard.threadSummaries()) {
    if (t.unreadForMentor <= 0) continue;
    const kid = nameById.get(t.learnerId) || "Learner";
    items.push({
      id: `chat-${t.learnerId}`,
      kind: "chat",
      title: `${kid} sent a message`,
      body: t.lastText || "New message",
      createdAt: t.lastAt || new Date().toISOString(),
      unread: true,
      href: `/dashboard/messages?learner=${t.learnerId}`,
      learnerId: t.learnerId,
    });
  }

  const common = socialBoard.chatChronological(8).filter((m) => m.from !== "mentor");
  const lastCommon = common[0];
  if (lastCommon) {
    const ageMs = now - Date.parse(lastCommon.createdAt);
    if (ageMs >= 0 && ageMs < 6 * 60 * 60 * 1000) {
      items.push({
        id: `hive-${lastCommon.id}`,
        kind: "hive",
        title: `${lastCommon.name || "Someone"} in common chat`,
        body: lastCommon.text,
        createdAt: lastCommon.createdAt,
        unread: ageMs < 20 * 60 * 1000,
        href: "/dashboard/messages?chat=common",
      });
    }
  }

  for (const c of notifyBoard.classes()) {
    if (c.guideId && c.guideId !== guideId) continue;
    const packed = packLiveClass(c);
    const status = classStatus(c);
    if (status === "live") {
      items.push({
        id: `class-live-${c.id}`,
        kind: "class",
        title: "Your class is live",
        body: c.title,
        createdAt: c.liveAt || c.startsAt,
        unread: true,
        href: "/dashboard/classes",
      });
      continue;
    }
    if (status === "scheduled") {
      const startMs = Date.parse(c.startsAt);
      const until = startMs - now;
      if (until > 0 && until <= 2 * 60 * 60 * 1000) {
        items.push({
          id: `class-soon-${c.id}`,
          kind: "class",
          title: "Class starting soon",
          body: `${c.title} · ${packed.guideName}`,
          createdAt: c.startsAt,
          unread: until <= 30 * 60 * 1000,
          href: "/dashboard/classes",
        });
      }
      continue;
    }
    if (status === "ended" && c.endedAt) {
      const endedMs = Date.parse(c.endedAt);
      if (now - endedMs < 3 * 60 * 60 * 1000) {
        const joined = (c.joinedLearnerIds || []).length;
        items.push({
          id: `class-ended-${c.id}`,
          kind: "class",
          title: "Class ended",
          body: joined ? `${c.title} · ${joined} kid${joined === 1 ? "" : "s"} joined` : c.title,
          createdAt: c.endedAt,
          unread: false,
          href: "/dashboard/classes",
        });
      }
    }
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = items.filter((i) => i.unread).length;
  return res.json({ items: items.slice(0, 40), unread });
});

guideRouter.get("/chat/common", (_req, res) => {
  return res.json({ messages: socialBoard.chatChronological(120) });
});

guideRouter.post("/chat/common", async (req: AuthedRequest, res) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    socialBoard.pushMentorToCommon({
      mentorId: String(req.user!._id),
      mentorName: req.user!.name,
      text,
    });
    return res.status(201).json({ messages: socialBoard.chatChronological(120) });
  } catch (e) {
    const err = e as Error & { status?: number };
    return res.status(Number(err.status) || 400).json({ error: err.message || "Could not send message." });
  }
});

guideRouter.get("/social/rooms", (_req, res) => {
  return res.json({ rooms: socialBoard.mentorRoomsAll(80).map(publicMentorRoom) });
});

guideRouter.post("/social/rooms", async (req: AuthedRequest, res) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title : "";
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
    const activityId = typeof req.body?.activityId === "string" ? req.body.activityId : "sentence";
    const activityName =
      typeof req.body?.activityName === "string"
        ? req.body.activityName
        : ACTIVITY_LABEL[activityId as ActivityId] || activityId;
    const durationMin = Number(req.body?.durationMin) || 90;
    const row = socialBoard.publishMentorRoom({
      title,
      prompt,
      activityId,
      activityName,
      mentorId: String(req.user!._id),
      mentorName: req.user!.name,
      durationMin,
      day: istStamp().day,
    });
    return res.status(201).json({ room: publicMentorRoom(row), rooms: socialBoard.mentorRoomsAll(80).map(publicMentorRoom) });
  } catch (e) {
    const err = e as Error & { status?: number };
    return res.status(Number(err.status) || 400).json({ error: err.message || "Could not publish room." });
  }
});

guideRouter.post("/social/rooms/:id/end", (req, res) => {
  try {
    const row = socialBoard.endMentorRoom(req.params.id);
    return res.json({ room: publicMentorRoom(row), rooms: socialBoard.mentorRoomsAll(80).map(publicMentorRoom) });
  } catch (e) {
    const err = e as Error & { status?: number };
    return res.status(Number(err.status) || 400).json({ error: err.message || "Could not end room." });
  }
});

guideRouter.get("/chat/threads", async (_req, res) => {
  const summaries = mentorChatBoard.threadSummaries();
  const summaryById = new Map(summaries.map((t) => [t.learnerId, t]));
  const learners = (await users.listByRoles(["parent", "learner"])).map(toPublicUser);
  const threads = learners
    .map((learner) => {
      const t = summaryById.get(learner.id);
      return {
        learnerId: learner.id,
        learnerName: learner.child?.childName || learner.name || "Learner",
        learnerAvatarName: learner.name || learner.child?.childName || "Learner",
        lastAt: t?.lastAt || "",
        lastText: t?.lastText || "",
        unreadForMentor: t?.unreadForMentor || 0,
      };
    })
    .sort((a, b) => {
      if (a.unreadForMentor !== b.unreadForMentor) return b.unreadForMentor - a.unreadForMentor;
      if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
      if (a.lastAt) return -1;
      if (b.lastAt) return 1;
      return a.learnerName.localeCompare(b.learnerName);
    });
  const commonLast = socialBoard.chatChronological(1).slice(-1)[0];
  return res.json({
    common: commonLast
      ? { lastAt: commonLast.createdAt, lastText: commonLast.text, from: commonLast.from || "learner", name: commonLast.name }
      : null,
    threads,
  });
});

guideRouter.get("/chat/:learnerId", async (req, res) => {
  const learnerId = String(req.params.learnerId);
  const learner = await users.findById(learnerId);
  if (!learner || (learner.role !== "parent" && learner.role !== "learner")) {
    return res.status(404).json({ error: "Learner not found" });
  }
  mentorChatBoard.markReadByMentor(learnerId);
  return res.json({ learnerId, messages: mentorChatBoard.forLearner(learnerId) });
});

guideRouter.post("/chat/:learnerId", async (req: AuthedRequest, res) => {
  try {
    const learnerId = String(req.params.learnerId);
    const learner = await users.findById(learnerId);
    if (!learner || (learner.role !== "parent" && learner.role !== "learner")) {
      return res.status(404).json({ error: "Learner not found" });
    }
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    mentorChatBoard.addFromMentor({
      learnerId,
      text,
      mentorId: String(req.user!._id),
      mentorName: req.user!.name,
    });
    return res.status(201).json({ learnerId, messages: mentorChatBoard.forLearner(learnerId) });
  } catch (e) {
    const err = e as Error & { status?: number };
    return res.status(Number(err.status) || 400).json({ error: err.message || "Could not send reply." });
  }
});

guideRouter.post("/notify/send", async (req: AuthedRequest, res) => {
  const templateId = typeof req.body?.templateId === "string" ? req.body.templateId : "";
  const tpl = templateId ? notifyBoard.getTemplate(templateId) : null;
  const title = (typeof req.body?.title === "string" ? req.body.title.trim() : "") || tpl?.title || "";
  const body = (typeof req.body?.body === "string" ? req.body.body.trim() : "") || tpl?.body || "";
  if (!title || !body) return res.status(400).json({ error: "Pick a template or write a title and message." });
  const activityRaw = typeof req.body?.activityId === "string" ? req.body.activityId : tpl?.activityId || "";
  const activityId = isActivityId(String(activityRaw)) ? (activityRaw as ActivityId) : undefined;
  const kindRaw = req.body?.kind || tpl?.kind || "general";
  const kind = kindRaw === "activity" || kindRaw === "class" ? kindRaw : "general";
  const learnerIds = Array.isArray(req.body?.learnerIds) ? req.body.learnerIds.map(String) : [];
  const targets = await resolveTargets(learnerIds);
  const ist = istStamp();
  const made = notifyBoard.deliver({
    learners: targets,
    title: title.slice(0, 80),
    body: body.slice(0, 600),
    kind: kind === "activity" || kind === "class" ? kind : "general",
    activityId,
    source: "manual",
    varsFor: (l) =>
      classVars(l, {
        activity: activityId ? ACTIVITY_LABEL[activityId] : "BritBee",
        date: ist.day,
        time: ist.time,
        guide: req.user!.name,
      }),
  });
  return res.json({ sent: made.length, skipped: targets.length - made.length });
});

function monthParam(raw: unknown) {
  const month = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  return month;
}

guideRouter.get("/roster", (req, res) => {
  const month = monthParam(req.query.month);
  if (!month) return res.status(400).json({ error: "Use ?month=YYYY-MM" });
  return res.json({ month, overrides: getOverridesForMonth(month) });
});

guideRouter.put("/roster", (req, res) => {
  const month = monthParam(req.body?.month);
  if (!month) return res.status(400).json({ error: "month (YYYY-MM) is required." });
  const rows = Array.isArray(req.body?.days) ? req.body.days : [];
  const cleaned = rows
    .filter((row: { date?: string }) => typeof row?.date === "string" && row.date.startsWith(`${month}-`))
    .map((row: Record<string, unknown>) => ({
      date: String(row.date),
      phonicsId: typeof row.phonicsId === "string" ? row.phonicsId : undefined,
      sentence: typeof row.sentence === "string" ? row.sentence.slice(0, 280) : undefined,
      verbIds: Array.isArray(row.verbIds) ? row.verbIds.map(String).slice(0, 8) : undefined,
      storyScene: typeof row.storyScene === "number" ? row.storyScene : undefined,
      prepIds: Array.isArray(row.prepIds) ? row.prepIds.map(String).slice(0, 6) : undefined,
      note: typeof row.note === "string" ? row.note.slice(0, 240) : undefined,
      manual: Boolean(row.manual),
    }));
  const overrides = setMonthOverrides(month, cleaned);
  return res.json({ month, overrides, saved: cleaned.length });
});

guideRouter.patch("/roster/:date", (req, res) => {
  const date = typeof req.params.date === "string" ? req.params.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Invalid date." });
  const body = req.body || {};
  const row = setDayOverride({
    date,
    phonicsId: typeof body.phonicsId === "string" ? body.phonicsId : undefined,
    sentence: typeof body.sentence === "string" ? body.sentence.slice(0, 280) : undefined,
    verbIds: Array.isArray(body.verbIds) ? body.verbIds.map(String).slice(0, 8) : undefined,
    storyScene: typeof body.storyScene === "number" ? body.storyScene : undefined,
    prepIds: Array.isArray(body.prepIds) ? body.prepIds.map(String).slice(0, 6) : undefined,
    note: typeof body.note === "string" ? body.note.slice(0, 240) : undefined,
    manual: true,
  });
  return res.json({ day: row });
});

guideRouter.delete("/roster", (req, res) => {
  const month = monthParam(req.query.month);
  if (!month) return res.status(400).json({ error: "Use ?month=YYYY-MM" });
  clearMonthOverrides(month);
  return res.json({ month, cleared: true });
});

async function requireParentUser(userId: string) {
  const user = await users.findById(userId);
  if (!user || user.role !== "parent") return null;
  return user;
}

guideRouter.get("/billing/overview", (_req, res) => {
  return res.json({ overview: guideOverview() });
});

guideRouter.get("/billing/parents", async (_req, res) => {
  const rows = await users.listByRoles(["parent"]);
  const parents = rows.map((u) => {
    const userId = String(u._id);
    seedDemoBilling(userId);
    const summary = getSummary(userId);
    const pub = toPublicUser(u);
    return {
      id: userId,
      name: pub.name,
      email: pub.email,
      phone: pub.phone,
      childName: pub.child?.childName,
      subscription: summary.subscription,
      pendingCount: summary.pendingPayments.length,
      pendingPayments: summary.pendingPayments,
    };
  });
  return res.json({ parents });
});

guideRouter.get("/billing/pending", async (_req, res) => {
  const rows = await users.listByRoles(["parent"]);
  const byId = new Map(rows.map((u) => [String(u._id), toPublicUser(u)]));
  const pending = listAllPendingPayments().map((p) => ({
    ...p,
    parent: byId.get(p.userId) || null,
  }));
  return res.json({ pending });
});

guideRouter.get("/billing/parents/:userId", async (req, res) => {
  const userId = String(req.params.userId);
  const user = await requireParentUser(userId);
  if (!user) return res.status(404).json({ error: "Parent account not found." });
  const detail = getParentBillingDetail(userId);
  return res.json({ parent: toPublicUser(user), ...detail });
});

guideRouter.post("/billing/parents/:userId/payments/:paymentId/confirm", async (req: AuthedRequest, res) => {
  const userId = String(req.params.userId);
  const paymentId = String(req.params.paymentId);
  const user = await requireParentUser(userId);
  if (!user) return res.status(404).json({ error: "Parent account not found." });
  const guideName = req.user!.name || "Mentor";
  try {
    const result = confirmPaymentByGuide(userId, paymentId, guideName);
    const synced = await syncUserPlan(userId);
    return res.json({ ...result, user: synced });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not confirm payment." });
  }
});

guideRouter.post("/billing/parents/:userId/payments/:paymentId/fail", async (req: AuthedRequest, res) => {
  const userId = String(req.params.userId);
  const paymentId = String(req.params.paymentId);
  const user = await requireParentUser(userId);
  if (!user) return res.status(404).json({ error: "Parent account not found." });
  const guideName = req.user!.name || "Mentor";
  const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
  try {
    const payment = failPaymentByGuide(userId, paymentId, guideName, reason);
    return res.json({ payment });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not fail payment." });
  }
});

guideRouter.post("/billing/parents/:userId/checkout", async (req: AuthedRequest, res) => {
  const userId = String(req.params.userId);
  const user = await requireParentUser(userId);
  if (!user) return res.status(404).json({ error: "Parent account not found." });
  const planId = req.body?.planId as PlanId;
  const method = (req.body?.method || "upi") as PaymentMethod;
  const guideName = req.user!.name || "Mentor";
  if (!["monthly", "yearly"].includes(planId)) {
    return res.status(400).json({ error: "Pick Monthly or Yearly." });
  }
  try {
    const payment = createManualCheckout(userId, planId, method, guideName);
    return res.json({ payment });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Checkout failed." });
  }
});

guideRouter.post("/billing/parents/:userId/plan", async (req: AuthedRequest, res) => {
  const userId = String(req.params.userId);
  const user = await requireParentUser(userId);
  if (!user) return res.status(404).json({ error: "Parent account not found." });
  const planId = req.body?.planId as PlanId;
  const guideName = req.user!.name || "Mentor";
  if (!["trial", "monthly", "yearly"].includes(planId)) {
    return res.status(400).json({ error: "Invalid plan." });
  }
  try {
    const subscription = setPlanByGuide(userId, planId, guideName);
    const synced = await syncUserPlan(userId);
    return res.json({ subscription, user: synced });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not set plan." });
  }
});

guideRouter.post("/billing/parents/:userId/subscription/cancel", async (req: AuthedRequest, res) => {
  const userId = String(req.params.userId);
  const user = await requireParentUser(userId);
  if (!user) return res.status(404).json({ error: "Parent account not found." });
  const atPeriodEnd = req.body?.atPeriodEnd !== false;
  try {
    const subscription = cancelSubscription(userId, atPeriodEnd);
    const synced = await syncUserPlan(userId);
    return res.json({ subscription, user: synced });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not cancel." });
  }
});

guideRouter.post("/billing/parents/:userId/subscription/resume", async (req: AuthedRequest, res) => {
  const userId = String(req.params.userId);
  const user = await requireParentUser(userId);
  if (!user) return res.status(404).json({ error: "Parent account not found." });
  try {
    const subscription = resumeSubscription(userId);
    const synced = await syncUserPlan(userId);
    return res.json({ subscription, user: synced });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not resume." });
  }
});
