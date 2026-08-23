import { Router } from "express";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import { canSeeClass, classStatus, packLiveClass, notifyBoard } from "../notifyStore";
import { creditClassEndReward } from "../classRewards";
import { progressLearnerId } from "../progressKey";
import { users } from "../users";

export const notifyRouter = Router();

notifyRouter.use(requireAuth, requireRole("parent", "learner"));

async function hydrateGuideNames<T extends { guideId?: string; guideName: string }>(rows: T[]) {
  const ids = Array.from(new Set(rows.map((r) => String(r.guideId || "")).filter(Boolean)));
  if (!ids.length) return rows;
  const nameById = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const u = await users.findById(id);
      if (u?.name) nameById.set(id, u.name);
    })
  );
  return rows.map((r) => {
    if (!r.guideId) return r;
    const name = nameById.get(String(r.guideId));
    return name ? { ...r, guideName: name } : r;
  });
}

notifyRouter.get("/", (req: AuthedRequest, res) => {
  const id = String(req.user!._id);
  return res.json({
    enabled: notifyBoard.pref(id),
    unread: notifyBoard.unreadCount(id),
    notifications: notifyBoard.inbox(id),
  });
});

notifyRouter.get("/classes", async (req: AuthedRequest, res) => {
  const learnerAuthId = String(req.user!._id);
  const rows = await hydrateGuideNames(notifyBoard.classesForLearner(learnerAuthId));
  const classes = rows.map((row) => packLiveClass(row, learnerAuthId));
  return res.json({ classes });
});

notifyRouter.get("/classes/:id", async (req: AuthedRequest, res) => {
  const learnerAuthId = String(req.user!._id);
  const row = notifyBoard.classes().find((c) => c.id === String(req.params.id));
  if (!row || !canSeeClass(row, learnerAuthId)) return res.status(404).json({ error: "Class not found" });
  const [fresh] = await hydrateGuideNames([row]);
  return res.json({ class: packLiveClass(fresh, learnerAuthId) });
});

notifyRouter.post("/classes/:id/join", (req: AuthedRequest, res) => {
  const learnerAuthId = String(req.user!._id);
  const row = notifyBoard.classes().find((c) => c.id === String(req.params.id));
  if (!row || !canSeeClass(row, learnerAuthId)) return res.status(404).json({ error: "Class not found" });
  if (row.endedAt) return res.status(400).json({ error: "This class already ended." });
  const joined = new Set(row.joinedLearnerIds || []);
  joined.add(learnerAuthId);
  const patched = notifyBoard.patchClass(row.id, { joinedLearnerIds: Array.from(joined) });
  if (!patched) return res.status(404).json({ error: "Class not found" });
  return res.json({ ok: true, class: packLiveClass(patched, learnerAuthId) });
});

notifyRouter.post("/classes/:id/claim", (req: AuthedRequest, res) => {
  const learnerAuthId = String(req.user!._id);
  const progressId = progressLearnerId(req.user!);
  const row = notifyBoard.classes().find((c) => c.id === String(req.params.id));
  if (!row || !canSeeClass(row, learnerAuthId)) return res.status(404).json({ error: "Class not found" });
  if (classStatus(row) !== "ended") return res.status(400).json({ error: "Class is not finished yet." });
  const joined = (row.joinedLearnerIds || []).includes(learnerAuthId);
  if (!joined) return res.status(403).json({ error: "Join the class before collecting a bonus." });
  const result = creditClassEndReward(progressId, row.id);
  return res.json({ ...result, class: packLiveClass(row, learnerAuthId) });
});

notifyRouter.post("/read", (req: AuthedRequest, res) => {
  const id = String(req.user!._id);
  const one = typeof req.body?.id === "string" ? req.body.id : undefined;
  notifyBoard.markRead(id, one);
  return res.json({ ok: true, unread: notifyBoard.unreadCount(id) });
});

notifyRouter.patch("/pref", (req: AuthedRequest, res) => {
  const enabled = Boolean(req.body?.enabled);
  notifyBoard.setPref(String(req.user!._id), enabled);
  return res.json({ enabled });
});
