export type ChatKind = "text" | "sticker" | "material" | "voice" | "attachment";

export type AttachmentKind = "photo" | "video" | "document";

export type ChatVibeId = "popper" | "celebrate" | "clap" | "fire" | "heart" | "bee";

export type ChatCheer = {
  id: ChatVibeId;
  label: string;
  emoji: string;
};

export type ChatMaterial = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  href: string;
  tint: string;
};

export const CHAT_CHEERS: ChatCheer[] = [
  { id: "popper", label: "Popper", emoji: "🎊" },
  { id: "celebrate", label: "Celebrate", emoji: "🎉" },
  { id: "clap", label: "Clap", emoji: "👏" },
  { id: "fire", label: "Fire", emoji: "🔥" },
  { id: "heart", label: "Heart", emoji: "❤️" },
  { id: "bee", label: "Bee", emoji: "" },
];

export const CHAT_MATERIALS: ChatMaterial[] = [
  {
    id: "sentence",
    title: "Sentence builder",
    subtitle: "Build one strong English sentence",
    emoji: "✍️",
    href: "/(main)/learn?quest=sentence",
    tint: "#EAF2FF",
  },
  {
    id: "story",
    title: "Story time",
    subtitle: "Read and speak a short story",
    emoji: "📖",
    href: "/(main)/learn?quest=story",
    tint: "#FFF4E5",
  },
  {
    id: "phonics",
    title: "Phonics sounds",
    subtitle: "Practice letter sounds",
    emoji: "🔤",
    href: "/(main)/learn?quest=phonics",
    tint: "#F3E8FF",
  },
  {
    id: "verbs",
    title: "Action verbs",
    subtitle: "Jump, clap, run — say the action",
    emoji: "🏃",
    href: "/(main)/learn?quest=verbs",
    tint: "#E8F5E9",
  },
  {
    id: "social-play",
    title: "Playground",
    subtitle: "Battle, race, and dare friends",
    emoji: "🎮",
    href: "/(main)/social",
    tint: "#FFF8E1",
  },
];

/** @deprecated Legacy emoji sticker ids for old messages only. */
const LEGACY_STICKER_EMOJI: Record<string, string> = {
  bee: "",
  star: "⭐",
  party: "🎉",
  clap: "👏",
  heart: "❤️",
  fire: "🔥",
  rocket: "🚀",
  rainbow: "🌈",
  trophy: "🏆",
  sparkle: "✨",
  cool: "😎",
  think: "🤔",
};

export function materialById(id: string) {
  return CHAT_MATERIALS.find((m) => m.id === id);
}

export function cheerById(id: string) {
  return CHAT_CHEERS.find((c) => c.id === id);
}

export function cheerUsesMascot(id: string) {
  return id === "bee";
}

export function cheerEmoji(id: string) {
  if (cheerUsesMascot(id)) return "";
  return cheerById(id)?.emoji || LEGACY_STICKER_EMOJI[id] || "✨";
}

export function legacyStickerEmoji(id: string) {
  return LEGACY_STICKER_EMOJI[id];
}

export function legacyStickerUsesMascot(id: string) {
  return id === "bee";
}

export type ChatSendPayload = {
  kind?: ChatKind;
  text?: string;
  materialId?: string;
  voiceSec?: number;
  voiceUrl?: string;
  voiceText?: string;
  attachmentKind?: AttachmentKind;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
};

export type CheerSendPayload = {
  vibe: ChatVibeId;
};

export type RichChatMessage = {
  id: string;
  text: string;
  kind?: ChatKind;
  /** @deprecated */
  stickerId?: string;
  /** @deprecated */
  stickerUrl?: string;
  materialId?: string;
  voiceSec?: number;
  voiceUrl?: string;
  voiceText?: string;
  attachmentKind?: AttachmentKind;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
};

export type SocialVibeEvent = {
  id: string;
  vibe: ChatVibeId;
  learnerId: string;
  name: string;
  hue: number;
  at: string;
  /** @deprecated */
  stickerId?: string;
  /** @deprecated */
  stickerUrl?: string;
};

export function messagePreview(msg: RichChatMessage) {
  if (msg.kind === "sticker") return legacyStickerEmoji(msg.stickerId || "") || msg.text || "🎨";
  if (msg.kind === "material") return `${materialById(msg.materialId || "")?.emoji || "📚"} ${msg.text}`;
  if (msg.kind === "voice") return `🎤 ${msg.voiceText || msg.text || "Voice note"}`;
  if (msg.kind === "attachment") {
    if (msg.attachmentKind === "photo") return "📷 Photo";
    if (msg.attachmentKind === "video") return "🎬 Video";
    return `📄 ${msg.attachmentName || msg.text || "Document"}`;
  }
  return msg.text;
}

export function payloadKey(msg: RichChatMessage) {
  if (msg.kind === "sticker") return `sticker:${msg.stickerId || msg.text}`;
  if (msg.kind === "material") return `material:${msg.materialId}`;
  if (msg.kind === "voice") return `voice:${msg.voiceText || msg.text}:${msg.voiceSec || 0}`;
  if (msg.kind === "attachment") return `attachment:${msg.attachmentUrl || msg.text}`;
  return `text:${msg.text.replace(/\s+/g, " ").trim()}`;
}

export function cheerPayload(cheer: ChatCheer): CheerSendPayload {
  return { vibe: cheer.id };
}
