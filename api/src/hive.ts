import { users } from "./users";
import { toPublicUser } from "./middleware/auth";
import {
  ACTIVITY_IDS,
  activityBoard,
  type ActivityId,
  type AppSnapshot,
  type HiveChallenge,
} from "./activityStore";
import { clampBeeLook, type BeeLook } from "@britbee/shared";
import { ACTIVITY_HREF, ACTIVITY_LABEL, istStamp, notifyBoard } from "./notifyStore";
import { progressLearnerId } from "./progressKey";

export type HiveBee = {
  id: string;
  name: string;
  ghost: boolean;
  points: number;
  streak: number;
  dailyDone: boolean;
  buzzing: boolean;
  place: number;
  level: number;
  title: string;
  hue: number;
  look?: BeeLook;
};

const TITLES = [
  "Tiny Bee",
  "Busy Bee",
  "Buzz Scout",
  "Honey Cadet",
  "Hive Hero",
  "Nectar Star",
  "Queen’s Helper",
  "Golden Wings",
  "Hive Champion",
  "BritBee Ace",
];

const GHOSTS: { id: string; name: string; hue: number; look: BeeLook }[] = [
  { id: "ghost:meera", name: "Meera", hue: 0, look: { body: "pink", stripe: "plum", eyes: "hearts", glasses: "heart", hat: "flower", blush: "pink", wings: "sparkle", back: "rose" } },
  { id: "ghost:kabir", name: "Kabir", hue: 1, look: { body: "gold", stripe: "navy", eyes: "sparkle", glasses: "none", hat: "cap", blush: "none", wings: "clear", back: "blue" } },
  { id: "ghost:zara", name: "Zara", hue: 2, look: { body: "lilac", stripe: "plum", eyes: "star", glasses: "star", hat: "crown", blush: "pink", wings: "rainbow", back: "violet" } },
  { id: "ghost:vihaan", name: "Vihaan", hue: 3, look: { body: "mint", stripe: "teal", eyes: "round", glasses: "round", hat: "phones", blush: "peach", wings: "gold", back: "teal" } },
];

const GHOST_LINES = [
  { activityId: "sentence" as const, text: "finished today's Daily Buzz" },
  { activityId: "phonics" as const, text: "mastered another sound" },
  { text: "is on a 3-day streak" },
  { activityId: "story" as const, text: "finished Story Trail" },
  { activityId: "verbs" as const, text: "acted out a new verb" },
];

function beeRank(points: number) {
  const level = Math.max(1, Math.min(10, 1 + Math.floor(Math.max(0, points) / 12)));
  return { level, title: TITLES[level - 1] };
}

function firstName(raw: string) {
  return (raw || "Bee").trim().split(/\s+/)[0] || "Bee";
}

function hash(s: string) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

function emptySnap(): AppSnapshot {
  return {
    points: 0,
    streak: 0,
    clearedSounds: [],
    dailyDone: false,
    dailyEver: false,
    storyEver: false,
    verbsCleared: [],
    prepCorrect: 0,
  };
}

function ghostSnap(id: string, day: string): AppSnapshot {
  const n = hash(`${id}:${day}`);
  const dailyDone = n % 5 !== 1;
  return {
    points: 14 + (n % 36),
    streak: 1 + (n % 6),
    clearedSounds: dailyDone ? ["short-a"] : [],
    dailyDone,
    dailyEver: true,
    storyEver: n % 2 === 0,
    verbsCleared: n % 3 === 0 ? ["run", "jump", "clap"] : ["run"],
    prepCorrect: n % 4,
    lastActiveDay: dailyDone || n % 4 === 0 ? day : undefined,
  };
}

function maybeFinishGhostDares(day: string) {
  const now = Date.now();
  for (const ch of activityBoard.challengesForDay(day)) {
    if (ch.kind !== "peer") continue;
    const ghostId = ch.toId.startsWith("ghost:") ? ch.toId : ch.fromId.startsWith("ghost:") ? ch.fromId : "";
    if (!ghostId || ch.doneIds.includes(ghostId)) continue;
    const ageMin = (now - new Date(ch.createdAt).getTime()) / 60000;
    if (ageMin < 8 + (hash(ch.id) % 12)) continue;
    ch.doneIds.push(ghostId);
    activityBoard.pushSocial({
      learnerId: ghostId,
      activityId: ch.activityId,
      text: `accepted a dare · ${ACTIVITY_LABEL[ch.activityId]}`,
    });
    activityBoard.flush();
  }
}

function didActivity(id: ActivityId, snap: AppSnapshot, day: string) {
  if (id === "sentence") return Boolean(snap.dailyDone);
  if (id === "phonics") return (snap.clearedSounds?.length || 0) >= 1 && (snap.lastActiveDay === day || Boolean(snap.dailyDone));
  if (id === "story") return Boolean(snap.storyEver);
  if (id === "verbs") return (snap.verbsCleared?.length || 0) >= 3;
  if (id === "prepositions") return (snap.prepCorrect || 0) >= 5;
  return snap.lastActiveDay === day;
}

function packRooms(
  bees: { id: string; name: string; hue: number; ghost: boolean; snap: AppSnapshot; look?: BeeLook }[],
  day: string,
  meId: string
) {
  const total = Math.max(1, bees.length);
  const rooms = {} as Record<
    ActivityId,
    {
      done: number;
      total: number;
      live: { id: string; name: string; hue: number; look?: BeeLook }[];
      winners: { id: string; name: string; hue: number; look?: BeeLook }[];
    }
  >;
  for (const id of ACTIVITY_IDS) {
    const winners = bees
      .filter((b) => b.id !== meId && didActivity(id, b.snap, day))
      .map((b) => ({ id: b.id, name: b.name, hue: b.hue, look: b.look }));
    const live = bees
      .filter((b) => {
        if (b.id === meId || didActivity(id, b.snap, day)) return false;
        const active = b.snap.lastActiveDay === day || Boolean(b.snap.dailyDone);
        if (active) return true;
        return b.ghost && hash(`${b.id}:${id}:${day}`) % 4 === 0;
      })
      .map((b) => ({ id: b.id, name: b.name, hue: b.hue, look: b.look }));
    rooms[id] = {
      done: bees.filter((b) => didActivity(id, b.snap, day)).length,
      total,
      live: live.slice(0, 4),
      winners: winners.slice(0, 4),
    };
  }
  return rooms;
}

export async function packHive(meId: string) {
  const ist = istStamp();
  const day = ist.day;
  activityBoard.ensureHiveRace(day);
  maybeFinishGhostDares(day);

  const people = await users.listByRoles(["parent", "learner"]);
  const realAll: { id: string; name: string; hue: number; ghost: boolean; snap: AppSnapshot; look?: BeeLook }[] = people.map((u, i) => {
    const row = activityBoard.getProgress(progressLearnerId(u));
    const pub = toPublicUser(u);
    return {
      id: pub.id,
      name: firstName(pub.child?.childName || pub.name),
      hue: i % 8,
      ghost: false,
      snap: row?.snapshot || emptySnap(),
      look: clampBeeLook(pub.child?.avatar),
    };
  });
  const real: typeof realAll = [];
  const seen = new Set<string>();
  const meRow = realAll.find((r) => r.id === meId);
  if (meRow) {
    real.push(meRow);
    seen.add(meRow.name.toLowerCase());
  }
  for (const r of realAll) {
    if (seen.has(r.name.toLowerCase())) continue;
    seen.add(r.name.toLowerCase());
    real.push(r);
  }

  const usedNames = new Set(real.map((r) => r.name.toLowerCase()));
  const ghosts = GHOSTS.filter((g) => !usedNames.has(g.name.toLowerCase())).map((g) => ({
    id: g.id,
    name: g.name,
    hue: g.hue,
    ghost: true,
    snap: ghostSnap(g.id, day),
    look: g.look,
  }));

  const beesRaw = real.length >= 4 ? real : [...real, ...ghosts].slice(0, 6);
  beesRaw.sort((a, b) => b.snap.points - a.snap.points || b.snap.streak - a.snap.streak);

  const board: HiveBee[] = beesRaw.map((b, i) => {
    const rank = beeRank(b.snap.points);
    return {
      id: b.id,
      name: b.name,
      ghost: b.ghost,
      points: b.snap.points,
      streak: b.snap.streak || 0,
      dailyDone: Boolean(b.snap.dailyDone),
      buzzing: b.snap.lastActiveDay === day || Boolean(b.snap.dailyDone),
      place: i + 1,
      level: rank.level,
      title: rank.title,
      hue: b.hue,
      look: b.look,
    };
  });

  const names = new Map(beesRaw.map((b) => [b.id, b.name]));
  names.set("guide:maya", "Maya");

  const me = board.find((b) => b.id === meId) || {
    id: meId,
    name: "You",
    ghost: false,
    points: 0,
    streak: 0,
    dailyDone: false,
    buzzing: false,
    place: board.length + 1,
    ...beeRank(0),
    hue: 4,
    look: undefined,
  };

  const race = activityBoard.ensureHiveRace(day);
  const raceDone = board.filter((b) => b.dailyDone).length;
  const ahead = board.find((b) => b.place === me.place - 1) || null;
  const behind = board.find((b) => b.place === me.place + 1) || null;
  const rival = ahead
    ? { id: ahead.id, name: ahead.name, hue: ahead.hue, delta: ahead.points - me.points, place: ahead.place, direction: "ahead" as const }
    : behind
      ? { id: behind.id, name: behind.name, hue: behind.hue, delta: me.points - behind.points, place: behind.place, direction: "behind" as const }
      : null;

  const assigned = activityBoard
    .coachForLearner(meId)
    .filter((c) => c.status === "assigned")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const peer = activityBoard
    .challengesForDay(day)
    .filter((c) => c.kind === "peer" && (c.toId === meId || c.fromId === meId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const outgoingToday = activityBoard.challengesForDay(day).some((c) => c.kind === "peer" && c.fromId === meId);

  const feed = buildFeed(day, names, beesRaw);

  return {
    day,
    me,
    board,
    race: {
      activityId: race.activityId as ActivityId,
      title: ACTIVITY_LABEL[race.activityId],
      href: ACTIVITY_HREF[race.activityId],
      done: raceDone,
      total: board.length,
      youDone: me.dailyDone,
      guideName: race.fromName,
    },
    mentor: assigned
      ? {
          activityId: assigned.activityId,
          title: ACTIVITY_LABEL[assigned.activityId],
          href: ACTIVITY_HREF[assigned.activityId],
          guideName: assigned.guideName || "Maya",
          focusItem: assigned.focusItem || "",
        }
      : null,
    dare: peer ? packDare(peer, meId, names) : null,
    rival,
    feed,
    dareTargets: board.filter((b) => b.id !== meId).map((b) => ({ id: b.id, name: b.name, hue: b.hue, ghost: b.ghost, look: b.look })),
    canDare: !outgoingToday,
    buzzingNow: board.filter((b) => b.buzzing).length,
    rooms: packRooms(beesRaw, day, meId),
  };
}

function packDare(ch: HiveChallenge, meId: string, names: Map<string, string>) {
  const otherId = ch.fromId === meId ? ch.toId : ch.fromId;
  const iDone = ch.doneIds.includes(meId);
  const theyDone = ch.doneIds.includes(otherId);
  return {
    id: ch.id,
    activityId: ch.activityId,
    title: ACTIVITY_LABEL[ch.activityId],
    href: ACTIVITY_HREF[ch.activityId],
    otherName: names.get(otherId) || "a hive mate",
    fromMe: ch.fromId === meId,
    iDone,
    theyDone,
    both: iDone && theyDone,
  };
}

function buildFeed(
  day: string,
  names: Map<string, string>,
  bees: { id: string; name: string; ghost: boolean; snap: AppSnapshot }[]
) {
  const real = activityBoard.socialFeed(40).map((e) => ({
    id: e.id,
    learnerId: e.learnerId,
    name: names.get(e.learnerId) || "A bee",
    text: e.text,
    activityId: e.activityId,
    href: e.activityId ? ACTIVITY_HREF[e.activityId] : undefined,
    createdAt: e.createdAt,
  }));

  if (real.length >= 8) return real.slice(0, 24);

  const ghosts = bees.filter((b) => b.ghost);
  const dayStart = Date.parse(`${day}T12:00:00+05:30`) || 0;
  const extra = ghosts.flatMap((g, i) => {
    const line = GHOST_LINES[(hash(g.id + day) + i) % GHOST_LINES.length];
    const minsAgo = 12 + ((hash(g.id) + i * 17) % 180);
    return {
      id: `pulse-${g.id}-${day}-${i}`,
      learnerId: g.id,
      name: g.name,
      text: line.text,
      activityId: line.activityId,
      href: line.activityId ? ACTIVITY_HREF[line.activityId] : undefined,
      createdAt: new Date(dayStart - minsAgo * 60000).toISOString(),
    };
  });
  return [...real, ...extra].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 24);
}

export async function sendDare(fromId: string, fromName: string, toId: string, activityRaw?: string) {
  const ist = istStamp();
  const day = ist.day;
  activityBoard.ensureHiveRace(day);
  const already = activityBoard.challengesForDay(day).some((c) => c.kind === "peer" && c.fromId === fromId);
  if (already) {
    const err = new Error("You already dared a hive mate today.");
    (err as Error & { status: number }).status = 429;
    throw err;
  }
  if (toId === fromId) {
    const err = new Error("Pick another bee.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const activityId: ActivityId = activityRaw && activityRaw !== "sentence" && ACTIVITY_IDS.includes(activityRaw as ActivityId)
    ? (activityRaw as ActivityId)
    : "sentence";

  const pack = await packHive(fromId);
  const target = pack.dareTargets.find((t) => t.id === toId);
  if (!target) {
    const err = new Error("That bee is not in your hive.");
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const fromUser = await users.findById(fromId);
  const progressId = fromUser ? progressLearnerId(fromUser) : fromId;
  const fromSnap = activityBoard.getProgress(progressId)?.snapshot;
  const doneIds = fromSnap && activityBoard.snapshotDone(activityId, fromSnap, day) ? [fromId] : [];

  const row = activityBoard.addChallenge({
    kind: "peer",
    fromId,
    fromName: firstName(fromName),
    toId,
    activityId,
    day,
    doneIds,
  });

  activityBoard.pushSocial({
    learnerId: fromId,
    activityId,
    text: `dared ${target.name} to ${ACTIVITY_LABEL[activityId]}`,
  });

  if (!target.ghost) {
    notifyBoard.deliver({
      learners: [{ id: toId, name: target.name }],
      title: `${firstName(fromName)} dared you!`,
      body: `${firstName(fromName)} challenged you to ${ACTIVITY_LABEL[activityId]}. Beat them before the day ends.`,
      kind: "activity",
      activityId,
      source: "peer",
    });
  }

  return row;
}
