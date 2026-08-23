import { socialBoard, type MentorPublishedRoom, type SocialRoom } from "./socialStore";
import { istStamp } from "./notifyStore";

const GHOSTS = [
  { id: "ghost:meera", name: "Meera", hue: 0, line: "I like to play in the park." },
  { id: "ghost:kabir", name: "Kabir", hue: 1, line: "My favourite colour is yellow." },
  { id: "ghost:zara", name: "Zara", hue: 2, line: "I can say hello in English." },
  { id: "ghost:vihaan", name: "Vihaan", hue: 3, line: "The bee is on the flower." },
];

function hash(s: string) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

function firstName(raw: string) {
  return (raw || "Bee").trim().split(/\s+/)[0] || "Bee";
}

export function publicMentorRoom(row: MentorPublishedRoom) {
  const now = Date.now();
  const canEnter = row.status === "active" && Date.parse(row.expiresAt) > now;
  return {
    id: row.id,
    title: row.title,
    activityId: row.activityId,
    activityName: row.activityName,
    prompt: row.prompt,
    mentorName: row.mentorName,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
    endedAt: row.endedAt,
    status: row.status,
    playRoomId: row.playRoomId,
    canEnter,
  };
}

export function publicRoom(row: SocialRoom) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    prompt: row.prompt,
    hostId: row.hostId,
    hostName: row.hostName,
    status: row.status,
    players: row.players.map((p) => ({
      id: p.id,
      name: p.name,
      hue: p.hue,
      done: Boolean(p.answer),
      answer: row.kind === "circle" ? p.answer : undefined,
      awarded: p.awarded || 0,
    })),
    winnerId: row.winnerId,
    winnerName: row.winnerName,
    targetId: row.targetId,
    createdAt: row.createdAt,
  };
}

function tickGhosts(day: string) {
  const now = Date.now();
  const ghost = GHOSTS[Math.floor(now / 90_000) % GHOSTS.length];
  socialBoard.ghostChat({
    learnerId: ghost.id,
    name: ghost.name,
    hue: ghost.hue,
    text: ghost.line,
  });

  for (const room of socialBoard.roomsForDay(day)) {
    if (room.status === "done") continue;
    const age = (now - Date.parse(room.createdAt)) / 1000;
    if (age < 14) continue;
    if (room.kind === "circle") {
      const g = GHOSTS[hash(room.id) % GHOSTS.length];
      if (room.players.some((p) => p.id === g.id && p.answer)) continue;
      if (age < 20) continue;
      try {
        socialBoard.joinRoom(room.id, { id: g.id, name: g.name, hue: g.hue });
        socialBoard.ghostSay(room, { id: g.id, name: g.name, hue: g.hue }, g.line);
      } catch {
        /* skip */
      }
      continue;
    }
    const ghostPlayer = room.players.find((p) => p.id.startsWith("ghost:")) || (room.targetId?.startsWith("ghost:")
      ? GHOSTS.find((x) => x.id === room.targetId)
      : room.kind === "race"
        ? GHOSTS[hash(room.id) % GHOSTS.length]
        : null);
    if (!ghostPlayer) continue;
    const g = "hue" in ghostPlayer ? ghostPlayer : { id: ghostPlayer.id, name: ghostPlayer.name, hue: 0 };
    if (room.players.some((p) => p.id === g.id && p.answer)) continue;
    try {
      socialBoard.joinRoom(room.id, { id: g.id, name: g.name, hue: g.hue });
      socialBoard.ghostSay(room, { id: g.id, name: g.name, hue: g.hue }, room.prompt);
    } catch {
      /* skip */
    }
  }
}

export function packSocial(meId: string, name: string, hue: number, look?: import("@britbee/shared").BeeLook) {
  const day = istStamp().day;
  socialBoard.heartbeat(meId, firstName(name), hue, look);
  socialBoard.ensureCircle(day);
  tickGhosts(day);

  const online = socialBoard.online().map((p) => ({
    id: p.learnerId,
    name: p.name,
    hue: p.hue,
    look: p.look,
    me: p.learnerId === meId,
  }));

  const ghostsOnline = GHOSTS.filter((_, i) => hash(`${day}:${Math.floor(Date.now() / 40_000)}:${i}`) % 3 !== 0).map((g) => ({
    id: g.id,
    name: g.name,
    hue: g.hue,
    me: false,
  }));

  const seen = new Set(online.map((p) => p.name.toLowerCase()));
  const live = [...online];
  for (const g of ghostsOnline) {
    if (seen.has(g.name.toLowerCase())) continue;
    live.push(g);
    seen.add(g.name.toLowerCase());
  }

  const rooms = socialBoard
    .roomsForDay(day)
    .filter((r) => r.kind !== "circle" || r.players.length > 0)
    .map(publicRoom);

  return {
    day,
    prompt: socialBoard.ensureCircle(day).prompt,
    circle: publicRoom(socialBoard.ensureCircle(day)),
    online: live.slice(0, 10),
    chat: socialBoard.chat(36).reverse(),
    rooms,
    mentorRooms: socialBoard.mentorRoomsAll(60).map(publicMentorRoom),
    vibes: socialBoard.recentVibes(24),
  };
}
