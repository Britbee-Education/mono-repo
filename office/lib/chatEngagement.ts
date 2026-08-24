export type ChatKind = "text" | "sticker" | "material" | "voice" | "attachment";

export type AttachmentKind = "photo" | "video" | "document";

export type ChatMaterialId = "sentence" | "story" | "phonics" | "verbs" | "social-play";

const STICKER_EMOJI: Record<string, string> = {
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

const MATERIAL_LABEL: Record<ChatMaterialId, string> = {
  sentence: "Sentence builder",
  story: "Story time",
  phonics: "Phonics sounds",
  verbs: "Action verbs",
  "social-play": "Playground",
};

export type RichChatMessage = {
  id: string;
  text: string;
  kind?: ChatKind;
  stickerId?: string;
  materialId?: ChatMaterialId | string;
  voiceSec?: number;
  voiceUrl?: string;
  voiceText?: string;
  attachmentKind?: AttachmentKind;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
};

export function legacyStickerEmoji(id?: string) {
  if (!id) return "";
  return STICKER_EMOJI[id] || "";
}

export function materialLabel(id?: ChatMaterialId | string) {
  if (!id) return "Activity";
  return MATERIAL_LABEL[id as ChatMaterialId] || id;
}

export function messagePreview(msg: RichChatMessage, max = 42) {
  const kind = msg.kind || "text";
  let raw = msg.text || "";
  if (kind === "sticker") raw = legacyStickerEmoji(msg.stickerId) || msg.text || "Cheer";
  if (kind === "voice") raw = msg.voiceText || "Voice note";
  if (kind === "attachment") {
    raw =
      msg.attachmentKind === "photo"
        ? "Photo"
        : msg.attachmentKind === "video"
          ? "Video"
          : msg.attachmentName || "Document";
  }
  if (kind === "material") raw = materialLabel(msg.materialId);
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
