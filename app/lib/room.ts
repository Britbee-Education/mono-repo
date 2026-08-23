import type { InboxItem, HivePayload } from "@/lib/api";
import { QUESTS, nextQuest, questDone, questUnlocked, type ProgressSnapshot, type QuestId } from "@/lib/quests";

export type RoomMsg = {
  id: string;
  at: number;
  side: "left" | "right" | "center";
  name: string;
  hue: number;
  maya?: boolean;
  you?: boolean;
  kind: "text" | "card" | "system";
  emoji?: string;
  text: string;
  sub?: string;
  cta?: string;
  href?: string;
  locked?: boolean;
  lockHint?: string;
  accent?: "race" | "dare" | "quest" | "pin" | "done";
  questId?: QuestId;
};

function startOfDay(day: string) {
  const t = Date.parse(`${day}T04:00:00.000Z`);
  return Number.isNaN(t) ? Date.now() - 8 * 3600_000 : t;
}

function hueFor(hive: HivePayload | null, name: string) {
  const row = hive?.board.find((b) => b.name.toLowerCase() === name.toLowerCase());
  return row?.hue ?? name.length % 8;
}

function kidFeed(text: string) {
  return text
    .replace("finished today's Daily Buzz", "did Daily Buzz!")
    .replace("cleared a first sound in Sound Lab", "got a new sound!")
    .replace("mastered another sound", "got a new sound!")
    .replace("finished Story Trail", "finished the story!")
    .replace("acted out 3 verbs this week", "acted 3 verbs!")
    .replace("acted out a new verb", "did a new action!")
    .replace("cleared Bee Maps", "finished Bee Maps!")
    .replace("accepted a dare · Daily Buzz", "took the dare!")
    .replace(/^is on a (\d+)-day streak$/, "🔥 $1 days in a row!");
}

export function buildRoom(
  hive: HivePayload | null,
  snapshot: ProgressSnapshot,
  inbox: InboxItem[],
  meName: string
): RoomMsg[] {
  const day0 = startOfDay(hive?.day || new Date().toISOString().slice(0, 10));
  const out: RoomMsg[] = [];
  const guide = hive?.race.guideName || "Maya";

  out.push({
    id: "sys-open",
    at: day0,
    side: "center",
    name: "",
    hue: 0,
    kind: "system",
    text: "🐝  Hive is buzzing",
  });

  out.push({
    id: "maya-hi",
    at: day0 + 60_000,
    side: "left",
    name: guide,
    hue: 0,
    maya: true,
    kind: "text",
    emoji: "👋",
    text: `Hi! Tap Play and beat your friends today.`,
  });

  if (hive?.mentor) {
    const q = QUESTS.find((x) => x.id === hive.mentor!.activityId);
    out.push({
      id: `pin-${hive.mentor.activityId}`,
      at: day0 + 12 * 60_000,
      side: "left",
      name: hive.mentor.guideName,
      hue: 0,
      maya: true,
      kind: "card",
      accent: "pin",
      emoji: q?.emoji || "⭐",
      text: `${hive.mentor.guideName} picked ${hive.mentor.title} for you`,
      sub: hive.mentor.focusItem || "Tap to play it now.",
      href: hive.mentor.href,
      cta: "Let's go!",
    });
  }

  if (hive?.dare && !hive.dare.both) {
    out.push({
      id: `dare-${hive.dare.id}`,
      at: Date.now() - 8 * 60_000,
      side: hive.dare.fromMe ? "right" : "left",
      name: hive.dare.fromMe ? meName : hive.dare.otherName,
      hue: hueFor(hive, hive.dare.fromMe ? meName : hive.dare.otherName),
      you: hive.dare.fromMe,
      kind: "card",
      accent: "dare",
      emoji: "⚡",
      text: hive.dare.fromMe ? `Dare sent to ${hive.dare.otherName}!` : `${hive.dare.otherName} dared you!`,
      sub: hive.dare.iDone ? "You did it. Waiting…" : hive.dare.theyDone ? "They finished. Your turn!" : "First one to finish wins.",
      href: hive.dare.href,
      cta: hive.dare.iDone ? "Open" : "I got this!",
    });
  }

  for (const n of inbox) {
    if (n.source === "peer" && hive?.dare) continue;
    out.push({
      id: `msg-${n.id}`,
      at: Date.parse(n.createdAt) || day0,
      side: "left",
      name: n.source === "peer" ? n.title.replace(/ dared you!$/i, "") : guide,
      hue: n.source === "peer" ? hueFor(hive, n.title) : 0,
      maya: n.source !== "peer",
      kind: n.href ? "card" : "text",
      accent: n.source === "peer" ? "dare" : "pin",
      emoji: n.source === "peer" ? "⚡" : "💛",
      text: n.title,
      sub: n.body.length > 80 ? `${n.body.slice(0, 78)}…` : n.body,
      href: n.href,
      cta: n.href ? "Open" : undefined,
    });
  }

  for (const item of hive?.feed || []) {
    const you = item.name.toLowerCase() === meName.toLowerCase();
    const q = QUESTS.find((x) => x.id === item.activityId);
    out.push({
      id: `feed-${item.id}`,
      at: Date.parse(item.createdAt) || Date.now(),
      side: you ? "right" : "left",
      name: you ? meName : item.name,
      hue: hueFor(hive, item.name),
      you,
      kind: "text",
      emoji: q?.emoji || "⭐",
      text: you ? `I ${kidFeed(item.text)}` : kidFeed(item.text),
      href: item.href,
    });
  }

  const seen = new Set<string>();
  return out
    .sort((a, b) => b.at - a.at)
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
}

export function clock(at: number) {
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
