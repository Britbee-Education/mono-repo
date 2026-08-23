"use client";

import { ExternalLink, FileText, Mic, Play } from "lucide-react";
import { legacyStickerEmoji, materialLabel, type RichChatMessage } from "@/lib/chatEngagement";

function absUrl(url?: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  return `${base.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export function ChatMessageBody({ msg, mine }: { msg: RichChatMessage; mine?: boolean }) {
  const kind = msg.kind || "text";

  if (kind === "sticker") {
    return <div className="wa-chat-sticker">{legacyStickerEmoji(msg.stickerId) || msg.text || "🎨"}</div>;
  }

  if (kind === "material") {
    return (
      <div className={`wa-chat-card ${mine ? "mine" : ""}`}>
        <div className="wa-chat-card-kicker">Activity</div>
        <div className="wa-chat-card-title">{materialLabel(msg.materialId)}</div>
        {msg.text ? <div className="wa-chat-card-sub">{msg.text}</div> : null}
      </div>
    );
  }

  if (kind === "voice") {
    const src = absUrl(msg.voiceUrl);
    return (
      <div className="wa-chat-voice">
        {src ? (
          <audio controls preload="none" src={src} className="wa-chat-audio">
            <track kind="captions" />
          </audio>
        ) : (
          <div className="wa-chat-voice-fallback">
            <Mic size={16} />
            Voice note
          </div>
        )}
        {msg.voiceText ? <div className="wa-chat-voice-text">{msg.voiceText}</div> : null}
        {msg.voiceSec ? <div className="wa-chat-voice-meta">{Math.max(1, Math.round(msg.voiceSec))}s</div> : null}
      </div>
    );
  }

  if (kind === "attachment") {
    const url = absUrl(msg.attachmentUrl);
    const name = msg.attachmentName || msg.text || "File";
    if (msg.attachmentKind === "photo" && url) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="wa-chat-photo-link">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={name} className="wa-chat-photo" />
        </a>
      );
    }
    const icon = msg.attachmentKind === "video" ? <Play size={16} /> : <FileText size={16} />;
    return (
      <a href={url || "#"} target="_blank" rel="noreferrer" className={`wa-chat-file ${mine ? "mine" : ""}`}>
        <span className="wa-chat-file-icon">{icon}</span>
        <span className="wa-chat-file-body">
          <span className="wa-chat-file-title">
            {msg.attachmentKind === "video" ? "Video" : msg.attachmentKind === "photo" ? "Photo" : name}
          </span>
          <span className="wa-chat-file-sub">Tap to open</span>
        </span>
        <ExternalLink size={14} />
      </a>
    );
  }

  return <div className="wa-chat-text">{msg.text}</div>;
}
