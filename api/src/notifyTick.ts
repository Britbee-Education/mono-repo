import { users } from "./users";
import { toPublicUser } from "./middleware/auth";
import { ACTIVITY_LABEL, istStamp, notifyBoard } from "./notifyStore";

export type Target = { id: string; name: string };

function childLabel(name?: string) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const first = base.split(" ")[0] || base;
  return first;
}

export async function allLearners(): Promise<Target[]> {
  const rows = await users.listByRoles(["parent", "learner"]);
  return rows.map(toPublicUser).map((u) => ({
    id: u.id,
    name: u.child?.childName || u.name,
  }));
}

export async function resolveTargets(ids?: string[]): Promise<Target[]> {
  const all = await allLearners();
  if (!ids?.length) return all;
  const wanted = new Set(ids);
  return all.filter((l) => wanted.has(l.id));
}

export async function expandAudienceIds(ids?: string[]): Promise<string[]> {
  if (!ids?.length) return [];
  const rows = (await users.listByRoles(["parent", "learner"])).map(toPublicUser);
  const byId = new Map(rows.map((u) => [u.id, u]));
  const selectedLabels = new Set(
    ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((u) => childLabel(u!.child?.childName || u!.name))
      .filter(Boolean)
  );
  const out = new Set<string>(ids);
  for (const row of rows) {
    const label = childLabel(row.child?.childName || row.name);
    if (selectedLabels.has(label)) out.add(row.id);
  }
  return Array.from(out);
}

// Convert an arbitrary "selected account ids" list (can include both parents + learners)
// into the actual learner account ids that should receive the class.
//
// This avoids overly-broad audience matching by only returning `role: learner` ids.
export async function expandToLearnerIds(ids?: string[]): Promise<string[]> {
  if (!ids?.length) return [];
  const rows = (await users.listByRoles(["parent", "learner"])).map(toPublicUser);
  const byId = new Map(rows.map((u) => [u.id, u]));
  const selectedLabels = new Set<string>();
  const out = new Set<string>();

  for (const id of ids) {
    const u = byId.get(id);
    if (!u) continue;
    if (u.role === "learner") {
      out.add(u.id);
      continue;
    }
    // Parent: map via child's label (first token) to learner ids.
    const label = childLabel(u.child?.childName || u.name);
    if (label) selectedLabels.add(label);
  }

  if (!selectedLabels.size) return Array.from(out);

  for (const u of rows) {
    if (u.role !== "learner") continue;
    const label = childLabel(u.child?.childName || u.name);
    if (selectedLabels.has(label)) out.add(u.id);
  }

  return Array.from(out);
}

export function classVars(learner: Target, extra: { activity?: string; time?: string; date?: string; guide?: string }) {
  const ist = istStamp();
  return {
    child: learner.name.split(" ")[0] || learner.name,
    parent: learner.name,
    activity: extra.activity || "today’s quest",
    time: extra.time || ist.time,
    date: extra.date || ist.day,
    guide: extra.guide || "your guide",
  };
}

export async function fireDailySchedules() {
  const ist = istStamp();
  const nowMins = ist.minutes;
  const learners = await allLearners();
  for (const sch of notifyBoard.schedules()) {
    if (!sch.enabled) continue;
    if (sch.lastSentDate === ist.day) continue;
    const [hh, mm] = sch.time.split(":").map(Number);
    const due = hh * 60 + mm;
    if (nowMins < due) continue;
    const tpl = notifyBoard.getTemplate(sch.templateId);
    const title = tpl?.title || `Time for ${ACTIVITY_LABEL[sch.activityId]}`;
    const body = tpl?.body || `Hi {{child}}, open ${ACTIVITY_LABEL[sch.activityId]} in BritBee.`;
    notifyBoard.deliver({
      learners,
      title,
      body,
      kind: "activity",
      activityId: sch.activityId,
      source: "daily",
      varsFor: (l) => classVars(l, { activity: ACTIVITY_LABEL[sch.activityId], date: ist.day, time: sch.time }),
    });
    notifyBoard.patchSchedule(sch.id, { lastSentDate: ist.day });
  }
}

export async function fireClassReminders() {
  const now = Date.now();
  const ist = istStamp();
  const learners = await allLearners();
  for (const cls of notifyBoard.classes()) {
    const start = new Date(cls.startsAt).getTime();
    if (Number.isNaN(start)) continue;
    if (!cls.remindedAt && start <= now) {
      const tpl = notifyBoard.getTemplate("tpl-class-start");
      const targets = cls.learnerIds.length ? learners.filter((l) => cls.learnerIds.includes(l.id)) : learners;
      notifyBoard.deliver({
        learners: targets,
        title: tpl?.title || "Your mentor is in class",
        body: tpl?.body || "Hi {{child}}, {{guide}} is in live class now. Open Classes and tap Join.",
        kind: "class",
        href: `/class/${cls.id}`,
        source: "class",
        varsFor: (l) => classVars(l, { activity: "live class", date: ist.day, time: ist.time, guide: cls.guideName }),
      });
      notifyBoard.patchClass(cls.id, { remindedAt: new Date().toISOString() });
    }
  }
}

export function startNotifyTick() {
  const run = () => {
    fireDailySchedules().catch((err) => console.error("[notify] daily tick", err));
    fireClassReminders().catch((err) => console.error("[notify] class tick", err));
  };
  run();
  return setInterval(run, 30_000);
}
