export type ChatKind = "text" | "sticker" | "material" | "voice" | "attachment";

export type AttachmentKind = "photo" | "video" | "document";

export type ChatVibeId = "popper" | "celebrate" | "clap" | "fire" | "heart" | "bee";

/** @deprecated Stickers are no longer sent; ids kept for old chat rows. */
export const CHAT_STICKER_IDS = [
  "bee",
  "star",
  "party",
  "clap",
  "heart",
  "fire",
  "rocket",
  "rainbow",
  "trophy",
  "sparkle",
  "cool",
  "think",
] as const;

export type ChatStickerId = (typeof CHAT_STICKER_IDS)[number];

export const CHAT_MATERIAL_IDS = ["sentence", "story", "phonics", "verbs", "social-play"] as const;

export type ChatMaterialId = (typeof CHAT_MATERIAL_IDS)[number];

export const CHAT_VIBE_IDS = ["popper", "celebrate", "clap", "fire", "heart", "bee"] as const;

const STICKER_EMOJI: Record<ChatStickerId, string> = {
  bee: "🐝",
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

export function isChatKind(raw: unknown): raw is ChatKind {
  return raw === "text" || raw === "sticker" || raw === "material" || raw === "voice" || raw === "attachment";
}

export function isAttachmentKind(raw: unknown): raw is AttachmentKind {
  return raw === "photo" || raw === "video" || raw === "document";
}

export function attachmentLabel(kind: AttachmentKind, name?: string) {
  if (kind === "photo") return "Photo";
  if (kind === "video") return "Video";
  return name?.trim() || "Document";
}

export function isLegacyStickerId(raw: unknown): raw is ChatStickerId {
  return typeof raw === "string" && (CHAT_STICKER_IDS as readonly string[]).includes(raw);
}

export function isChatMaterialId(raw: unknown): raw is ChatMaterialId {
  return typeof raw === "string" && (CHAT_MATERIAL_IDS as readonly string[]).includes(raw);
}

export function isChatVibeId(raw: unknown): raw is ChatVibeId {
  return typeof raw === "string" && (CHAT_VIBE_IDS as readonly string[]).includes(raw);
}

export function stickerEmoji(id: ChatStickerId) {
  return STICKER_EMOJI[id];
}

export function materialLabel(id: ChatMaterialId) {
  return MATERIAL_LABEL[id];
}

export type ResolvedChatPayload = {
  kind: ChatKind;
  text: string;
  stickerId?: string;
  materialId?: ChatMaterialId;
  voiceSec?: number;
  voiceUrl?: string;
  voiceText?: string;
  attachmentKind?: AttachmentKind;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
};

export type ResolvedVibePayload = {
  vibe: ChatVibeId;
};

export function resolveChatPayload(body: unknown, opts?: { englishCheck?: (text: string) => string | null }): ResolvedChatPayload {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const kindRaw = typeof b.kind === "string" ? b.kind : "text";
  const kind: ChatKind = isChatKind(kindRaw) ? kindRaw : "text";

  if (kind === "sticker") {
    throw Object.assign(new Error("Stickers are no longer supported."), { status: 410 });
  }

  if (kind === "material") {
    const materialId = isChatMaterialId(b.materialId) ? b.materialId : null;
    if (!materialId) throw Object.assign(new Error("Pick something to share."), { status: 400 });
    return { kind, materialId, text: materialLabel(materialId) };
  }

  if (kind === "voice") {
    const voiceText = typeof b.voiceText === "string" ? b.voiceText.replace(/\s+/g, " ").trim().slice(0, 220) : "";
    const voiceUrl = typeof b.voiceUrl === "string" ? b.voiceUrl.trim().slice(0, 500) : undefined;
    const voiceSec = Math.min(120, Math.max(1, Number(b.voiceSec) || 0));
    if (!voiceText && !voiceUrl) throw Object.assign(new Error("Could not send voice note."), { status: 400 });
    const text = voiceText || "Voice note";
    return { kind, text, voiceText: voiceText || undefined, voiceUrl, voiceSec: voiceSec || undefined };
  }

  if (kind === "attachment") {
    const attachmentUrl = typeof b.attachmentUrl === "string" ? b.attachmentUrl.trim().slice(0, 500) : "";
    const attachmentKind = isAttachmentKind(b.attachmentKind) ? b.attachmentKind : null;
    const attachmentName = typeof b.attachmentName === "string" ? b.attachmentName.trim().slice(0, 120) : "";
    const attachmentMime = typeof b.attachmentMime === "string" ? b.attachmentMime.trim().slice(0, 120) : "";
    if (!attachmentUrl || !attachmentKind) throw Object.assign(new Error("Could not send attachment."), { status: 400 });
    return {
      kind,
      text: attachmentLabel(attachmentKind, attachmentName),
      attachmentKind,
      attachmentUrl,
      attachmentName: attachmentName || undefined,
      attachmentMime: attachmentMime || undefined,
    };
  }

  const text = typeof b.text === "string" ? b.text.replace(/\s+/g, " ").trim() : "";
  if (!text) throw Object.assign(new Error("Write your message."), { status: 400 });
  if (opts?.englishCheck) {
    const err = opts.englishCheck(text);
    if (err) throw Object.assign(new Error(err), { status: 400 });
  }
  return { kind: "text", text };
}

export function resolveVibePayload(body: unknown): ResolvedVibePayload {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const vibeRaw = typeof b.vibe === "string" ? b.vibe : "";
  if (!isChatVibeId(vibeRaw)) throw Object.assign(new Error("Unknown cheer."), { status: 400 });
  return { vibe: vibeRaw };
}
