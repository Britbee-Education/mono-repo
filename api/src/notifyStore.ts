import fs from "fs";
import path from "path";
import { ACTIVITY_IDS, type ActivityId } from "./activityStore";

export type NotifyKind = "general" | "activity" | "class";

export type NotifyTemplate = {
  id: string;
  name: string;
  kind: NotifyKind;
  activityId?: ActivityId;
  title: string;
  body: string;
  updatedAt: string;
};

export type DailySchedule = {
  id: string;
  activityId: ActivityId;
  enabled: boolean;
  time: string;
  templateId: string;
  lastSentDate?: string;
};

export type ClassStatus = "scheduled" | "live" | "ended";
export type ClassKind = "individual" | "group";

export type ClassNotice = {
  id: string;
  title: string;
  body: string;
  activityId?: ActivityId;
  startsAt: string;
  durationMin: number;
  learnerIds: string[];
  classKind: ClassKind;
  templateId?: string;
  createdAt: string;
  guideName: string;
  guideId?: string;
  sentAt?: string;
  remindedAt?: string;
  liveAt?: string;
  endedAt?: string;
  roomUrl: string;
  joinedLearnerIds?: string[];
};

export type InboxMessage = {
  id: string;
  learnerId: string;
  learnerName?: string;
  title: string;
  body: string;
  kind: NotifyKind;
  activityId?: ActivityId;
  href?: string;
  source: "manual" | "daily" | "class" | "peer";
  createdAt: string;
  readAt?: string;
};

export type NotifyPref = { learnerId: string; enabled: boolean };

type Disk = {
  nextId: number;
  templates: NotifyTemplate[];
  schedules: DailySchedule[];
  classes: ClassNotice[];
  messages: InboxMessage[];
  prefs: NotifyPref[];
};

const DATA_PATH = path.resolve(__dirname, "../data/notifications.json");

const g = globalThis as unknown as {
  __britbeeNotify?: Disk;
  __britbeeNotifyLoaded?: boolean;
};

function classBaseUrl() {
  const raw = process.env.CLASS_MEET_BASE_URL || "https://meet.jit.si";
  return raw.replace(/\/+$/, "");
}

export function classRoomNonce() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function classRoomUrl(id: string, nonce?: string) {
  const base = `BritBee${String(id).replace(/[^a-zA-Z0-9]/g, "")}`;
  const room = nonce ? `${base}-${nonce}` : base;
  return `${classBaseUrl()}/${room}`;
}

export function classJoinUrl(roomUrl: string, displayName: string) {
  const safe = (displayName || "Bee").replace(/[#"&<>]/g, "").slice(0, 32) || "Bee";
  if (!/meet\.jit\.si/i.test(roomUrl)) {
    const sep = roomUrl.includes("?") ? "&" : "?";
    return `${roomUrl}${sep}name=${encodeURIComponent(safe)}`;
  }
  return (
    `${roomUrl}` +
    `#userInfo.displayName="${safe}"` +
    `&config.disableDeepLinking=true` +
    `&config.prejoinPageEnabled=false` +
    `&config.startWithAudioMuted=false` +
    `&config.startWithVideoMuted=false` +
    `&config.requireDisplayName=false` +
    `&config.enableWelcomePage=false`
  );
}

export function classDuration(row: Pick<ClassNotice, "durationMin">) {
  return Math.min(90, Math.max(15, Number(row.durationMin) || 30));
}

export function classStatus(row: ClassNotice, now = Date.now()): ClassStatus {
  if (row.endedAt) return "ended";
  const duration = classDuration(row) * 60_000;
  if (row.liveAt) {
    const liveStart = Date.parse(row.liveAt);
    if (!Number.isNaN(liveStart) && now > liveStart + duration) return "ended";
    return "live";
  }
  const start = Date.parse(row.startsAt);
  if (Number.isNaN(start)) return "scheduled";
  if (now > start + duration) return "ended";
  if (now >= start - 10 * 60_000) return "live";
  return "scheduled";
}

export function canSeeClass(row: ClassNotice, learnerId: string) {
  return !row.learnerIds.length || row.learnerIds.includes(learnerId);
}

export function packLiveClass(row: ClassNotice, learnerId?: string) {
  const durationMin = classDuration(row);
  const start = Date.parse(row.startsAt);
  const status = classStatus(row);
  const joinedLearnerIds = row.joinedLearnerIds || [];
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    startsAt: row.startsAt,
    durationMin,
    classKind: row.classKind || (row.learnerIds.length === 1 ? "individual" : "group"),
    learnerCount: row.learnerIds.length,
    endsAt: Number.isNaN(start) ? undefined : new Date(start + durationMin * 60_000).toISOString(),
    guideName: row.guideName,
    status,
    roomUrl: row.roomUrl || classRoomUrl(row.id),
    liveAt: row.liveAt,
    endedAt: row.endedAt,
    joinedByMe: learnerId ? joinedLearnerIds.includes(learnerId) : undefined,
  };
}

export const ACTIVITY_HREF: Record<ActivityId, string> = {
  phonics: "/activity/phonics",
  sentence: "/activity/sentence",
  story: "/activity/story",
  verbs: "/activity/verbs",
  prepositions: "/activity/prepositions",
};

export const ACTIVITY_LABEL: Record<ActivityId, string> = {
  phonics: "Sound Lab",
  sentence: "Daily Buzz",
  story: "Story Trail",
  verbs: "Act & Say",
  prepositions: "Bee Maps",
};

function nowIso() {
  return new Date().toISOString();
}

function empty(): Disk {
  const at = nowIso();
  const templates: NotifyTemplate[] = [
    {
      id: "tpl-daily-buzz",
      name: "Daily Buzz reminder",
      kind: "activity",
      activityId: "sentence",
      title: "Time for Daily Buzz",
      body: "Hi {{child}}, today’s sentence is waiting in Daily Buzz. Open BritBee and say it clearly.",
      updatedAt: at,
    },
    {
      id: "tpl-sound-lab",
      name: "Sound Lab reminder",
      kind: "activity",
      activityId: "phonics",
      title: "Sound Lab is open",
      body: "Hi {{child}}, practise one sound in Sound Lab to keep your streak buzzing.",
      updatedAt: at,
    },
    {
      id: "tpl-story",
      name: "Story Trail reminder",
      kind: "activity",
      activityId: "story",
      title: "Story time",
      body: "Hi {{child}}, read the next scene on Story Trail. Slow and clear.",
      updatedAt: at,
    },
    {
      id: "tpl-verbs",
      name: "Act & Say reminder",
      kind: "activity",
      activityId: "verbs",
      title: "Act it out",
      body: "Hi {{child}}, pick an action in Act & Say, act it, then say the sentence.",
      updatedAt: at,
    },
    {
      id: "tpl-maps",
      name: "Bee Maps reminder",
      kind: "activity",
      activityId: "prepositions",
      title: "Help the bee",
      body: "Hi {{child}}, open Bee Maps and tell us where the bee is.",
      updatedAt: at,
    },
    {
      id: "tpl-class",
      name: "Live class booked",
      kind: "class",
      title: "Live class with your mentor",
      body: "Hi {{child}}, live class with {{guide}} is at {{time}} on {{date}}. Open Classes and tap Join when it is live.",
      updatedAt: at,
    },
    {
      id: "tpl-class-start",
      name: "Class is live",
      kind: "class",
      title: "Your mentor is in class",
      body: "Hi {{child}}, {{guide}} is in live class now. Open Classes and tap Join.",
      updatedAt: at,
    },
    {
      id: "tpl-keep-buzzing",
      name: "Keep buzzing",
      kind: "general",
      title: "Keep buzzing",
      body: "Hi {{child}}, a little practice today keeps the hive happy. See you in BritBee.",
      updatedAt: at,
    },
  ];
  return {
    nextId: 1,
    templates,
    schedules: ACTIVITY_IDS.map((id) => ({
      id: `sch-${id}`,
      activityId: id,
      enabled: id === "sentence",
      time: id === "sentence" ? "17:00" : "18:00",
      templateId:
        id === "phonics"
          ? "tpl-sound-lab"
          : id === "sentence"
            ? "tpl-daily-buzz"
            : id === "story"
              ? "tpl-story"
              : id === "verbs"
                ? "tpl-verbs"
                : "tpl-maps",
    })),
    classes: [],
    messages: [],
    prefs: [],
  };
}

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
    const base = empty();
    g.__britbeeNotify = {
      nextId: Number(parsed.nextId) || 1,
      templates: parsed.templates?.length ? parsed.templates : base.templates,
      schedules: parsed.schedules?.length ? parsed.schedules : base.schedules,
      classes: Array.isArray(parsed.classes) ? parsed.classes : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      prefs: Array.isArray(parsed.prefs) ? parsed.prefs : [],
    };
  } catch {
    g.__britbeeNotify = empty();
  }
  g.__britbeeNotifyLoaded = true;
}

function persist() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store().__britbeeNotify, null, 2));
}

function store() {
  if (!g.__britbeeNotifyLoaded) load();
  if (!g.__britbeeNotify) g.__britbeeNotify = empty();
  return g;
}

export function istStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const grab = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const day = `${grab("year")}-${grab("month")}-${grab("day")}`;
  const time = `${grab("hour")}:${grab("minute")}`;
  return { day, time, minutes: Number(grab("hour")) * 60 + Number(grab("minute")) };
}

export function renderTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

export const notifyBoard = {
  templates() {
    return store().__britbeeNotify!.templates;
  },
  getTemplate(id: string) {
    return store().__britbeeNotify!.templates.find((t) => t.id === id) || null;
  },
  saveTemplate(input: Partial<NotifyTemplate> & { name: string; title: string; body: string; kind: NotifyKind }) {
    const s = store();
    const at = nowIso();
    if (input.id) {
      const row = s.__britbeeNotify!.templates.find((t) => t.id === input.id);
      if (!row) return null;
      Object.assign(row, {
        name: input.name,
        title: input.title,
        body: input.body,
        kind: input.kind,
        activityId: input.activityId,
        updatedAt: at,
      });
      persist();
      return row;
    }
    const row: NotifyTemplate = {
      id: `tpl-${s.__britbeeNotify!.nextId++}`,
      name: input.name,
      kind: input.kind,
      activityId: input.activityId,
      title: input.title,
      body: input.body,
      updatedAt: at,
    };
    s.__britbeeNotify!.templates.push(row);
    persist();
    return row;
  },
  deleteTemplate(id: string) {
    const s = store();
    const before = s.__britbeeNotify!.templates.length;
    s.__britbeeNotify!.templates = s.__britbeeNotify!.templates.filter((t) => t.id !== id);
    persist();
    return s.__britbeeNotify!.templates.length < before;
  },
  schedules() {
    return store().__britbeeNotify!.schedules;
  },
  patchSchedule(id: string, patch: Partial<Pick<DailySchedule, "enabled" | "time" | "templateId" | "lastSentDate">>) {
    const row = store().__britbeeNotify!.schedules.find((s) => s.id === id);
    if (!row) return null;
    if (patch.enabled != null) row.enabled = Boolean(patch.enabled);
    if (patch.time && /^\d{2}:\d{2}$/.test(patch.time)) row.time = patch.time;
    if (patch.templateId) row.templateId = patch.templateId;
    if (patch.lastSentDate !== undefined) row.lastSentDate = patch.lastSentDate;
    persist();
    return row;
  },
  classes() {
    return store().__britbeeNotify!.classes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  classesForLearner(learnerId: string) {
    return store()
      .__britbeeNotify!.classes.filter((c) => !c.learnerIds.length || c.learnerIds.includes(learnerId))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
  addClass(input: {
    title: string;
    body: string;
    startsAt: string;
    learnerIds: string[];
    classKind?: ClassKind;
    guideName: string;
    guideId?: string;
    durationMin?: number;
    activityId?: ActivityId;
  }) {
    const s = store();
    const id = `cls-${s.__britbeeNotify!.nextId++}`;
    const row: ClassNotice = {
      id,
      title: input.title,
      body: input.body,
      startsAt: input.startsAt,
      durationMin: classDuration({ durationMin: input.durationMin || 30 }),
      learnerIds: input.learnerIds,
      classKind: input.classKind || (input.learnerIds.length === 1 ? "individual" : "group"),
      guideName: input.guideName,
      guideId: input.guideId,
      activityId: input.activityId,
      roomUrl: classRoomUrl(id, classRoomNonce()),
      createdAt: nowIso(),
    };
    s.__britbeeNotify!.classes.unshift(row);
    persist();
    return row;
  },
  patchClass(id: string, patch: Partial<ClassNotice>) {
    const row = store().__britbeeNotify!.classes.find((c) => c.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    persist();
    return row;
  },
  deleteClass(id: string) {
    const s = store();
    s.__britbeeNotify!.classes = s.__britbeeNotify!.classes.filter((c) => c.id !== id);
    persist();
  },
  pref(learnerId: string) {
    const row = store().__britbeeNotify!.prefs.find((p) => p.learnerId === learnerId);
    return row ? row.enabled : true;
  },
  setPref(learnerId: string, enabled: boolean) {
    const s = store();
    const row = s.__britbeeNotify!.prefs.find((p) => p.learnerId === learnerId);
    if (row) row.enabled = enabled;
    else s.__britbeeNotify!.prefs.push({ learnerId, enabled });
    persist();
    return enabled;
  },
  inbox(learnerId: string) {
    return store()
      .__britbeeNotify!.messages.filter((m) => m.learnerId === learnerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 80);
  },
  unreadCount(learnerId: string) {
    return store().__britbeeNotify!.messages.filter((m) => m.learnerId === learnerId && !m.readAt).length;
  },
  markRead(learnerId: string, id?: string) {
    const s = store();
    const at = nowIso();
    for (const m of s.__britbeeNotify!.messages) {
      if (m.learnerId !== learnerId) continue;
      if (id && m.id !== id) continue;
      if (!m.readAt) m.readAt = at;
    }
    persist();
  },
  log(limit = 80) {
    return store()
      .__britbeeNotify!.messages.slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },
  deliver(input: {
    learners: { id: string; name: string }[];
    title: string;
    body: string;
    kind: NotifyKind;
    activityId?: ActivityId;
    href?: string;
    source: InboxMessage["source"];
    varsFor?: (learner: { id: string; name: string }) => Record<string, string>;
  }) {
    const s = store();
    const at = nowIso();
    const made: InboxMessage[] = [];
    for (const learner of input.learners) {
      if (!notifyBoard.pref(learner.id)) continue;
      const vars = input.varsFor?.(learner) || { child: learner.name.split(" ")[0] || learner.name };
      const msg: InboxMessage = {
        id: `msg-${s.__britbeeNotify!.nextId++}`,
        learnerId: learner.id,
        learnerName: learner.name,
        title: renderTemplate(input.title, vars),
        body: renderTemplate(input.body, vars),
        kind: input.kind,
        activityId: input.activityId,
        href: input.href || (input.activityId ? ACTIVITY_HREF[input.activityId] : undefined),
        source: input.source,
        createdAt: at,
      };
      s.__britbeeNotify!.messages.unshift(msg);
      made.push(msg);
    }
    s.__britbeeNotify!.messages = s.__britbeeNotify!.messages.slice(0, 2000);
    persist();
    return made;
  },
};
