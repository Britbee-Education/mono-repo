"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type CommonChatMessage, type MentorChatMessage } from "@/lib/api";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { ExternalLink, Send, Users } from "lucide-react";

type Thread = {
  learnerId: string;
  learnerName: string;
  learnerAvatarName: string;
  lastAt: string;
  lastText: string;
  unreadForMentor: number;
};

type CommonPreview = {
  lastAt: string;
  lastText: string;
  from: string;
  name: string;
} | null;

export type ChatTarget = "common" | string;

function avatarUrl(seed: string) {
  const safe = encodeURIComponent(seed || "Bee");
  return `https://api.dicebear.com/9.x/adventurer-neutral/png?seed=${safe}&size=64`;
}

function chatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function chatTailChanged<T extends { id: string }>(prev: T[], next: T[]) {
  if (prev.length !== next.length) return true;
  if (!prev.length) return false;
  return prev[prev.length - 1]?.id !== next[next.length - 1]?.id;
}

function previewText(text: string, max = 42) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function isPendingId(id: string) {
  return id.startsWith("pending-");
}

type Props = {
  compact?: boolean;
  dock?: boolean;
  initialChat?: ChatTarget;
  onUnreadChange?: (count: number) => void;
};

export function MentorChatPanel({ compact = false, dock = false, initialChat, onUnreadChange }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [commonPreview, setCommonPreview] = useState<CommonPreview>(null);
  const [activeChat, setActiveChat] = useState<ChatTarget>(initialChat || "common");
  const [dmMessages, setDmMessages] = useState<MentorChatMessage[]>([]);
  const [commonMessages, setCommonMessages] = useState<CommonChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef(0);

  useEffect(() => {
    if (initialChat) setActiveChat(initialChat);
  }, [initialChat]);

  const loadThreads = useCallback(async () => {
    const data = await api("/guide/chat/threads");
    const rows = (data.threads || []) as Thread[];
    setThreads(rows);
    setCommonPreview((data.common || null) as CommonPreview);
    const unread = rows.reduce((sum, t) => sum + (t.unreadForMentor || 0), 0);
    onUnreadChange?.(unread);
  }, [onUnreadChange]);

  const loadDm = useCallback(async (learnerId: string) => {
    if (!learnerId || learnerId === "common") return;
    const data = await api(`/guide/chat/${learnerId}`);
    const rows = (data.messages || []) as MentorChatMessage[];
    setDmMessages((prev) => {
      const pending = prev.filter((m) => isPendingId(m.id));
      const next = [...rows, ...pending.filter((p) => !rows.some((r) => r.id === p.id))];
      next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return chatTailChanged(prev, next) ? next : prev;
    });
  }, []);

  const loadCommon = useCallback(async () => {
    const data = await api("/guide/chat/common");
    const rows = (data.messages || []) as CommonChatMessage[];
    setCommonMessages((prev) => {
      const pending = prev.filter((m) => isPendingId(m.id));
      const next = [...rows, ...pending.filter((p) => !rows.some((r) => r.id === p.id))];
      next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return chatTailChanged(prev, next) ? next : prev;
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const resizeComposer = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    loadThreads().catch((e: Error) => setError(e.message));
  }, [loadThreads]);

  useEffect(() => {
    setError("");
    if (activeChat === "common") {
      loadCommon().catch((e: Error) => setError(e.message));
      return;
    }
    loadDm(activeChat).catch((e: Error) => setError(e.message));
  }, [activeChat, loadCommon, loadDm]);

  useEffect(() => {
    scrollToBottom();
  }, [commonMessages, dmMessages, activeChat, scrollToBottom]);

  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      void loadThreads().catch(() => undefined);
      if (activeChat === "common") void loadCommon().catch(() => undefined);
      else void loadDm(activeChat).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(pollRef.current);
  }, [activeChat, loadCommon, loadDm, loadThreads]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.learnerName.toLowerCase().includes(q));
  }, [search, threads]);

  const activeThread = useMemo(
    () => (activeChat === "common" ? null : threads.find((t) => t.learnerId === activeChat) || null),
    [threads, activeChat]
  );

  const totalUnread = useMemo(() => threads.reduce((sum, t) => sum + t.unreadForMentor, 0), [threads]);

  const headerTitle = activeChat === "common" ? "Common chat" : activeThread?.learnerName || "Direct chat";
  const headerSub =
    activeChat === "common"
      ? "Everyone in the hive can see this"
      : activeThread
        ? "Private chat with this learner"
        : "Pick a kid from the list";

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    setDraft("");
    resizeComposer();
    const tempId = `pending-${Date.now()}`;
    const optimisticAt = new Date().toISOString();
    try {
      if (activeChat === "common") {
        const optimistic: CommonChatMessage = {
          id: tempId,
          learnerId: "guide",
          name: "You",
          text,
          createdAt: optimisticAt,
          from: "mentor",
        };
        setCommonMessages((prev) => [...prev, optimistic]);
        const data = await api("/guide/chat/common", {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        setCommonMessages((data.messages || []) as CommonChatMessage[]);
      } else {
        const optimistic: MentorChatMessage = {
          id: tempId,
          learnerId: activeChat,
          text,
          from: "mentor",
          createdAt: optimisticAt,
        };
        setDmMessages((prev) => [...prev, optimistic]);
        const data = await api(`/guide/chat/${activeChat}`, {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        setDmMessages((data.messages || []) as MentorChatMessage[]);
      }
      await loadThreads();
      requestAnimationFrame(scrollToBottom);
    } catch (e: unknown) {
      if (activeChat === "common") {
        setCommonMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else {
        setDmMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
      setDraft(text);
      resizeComposer();
      setError(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function onDraftChange(value: string) {
    setDraft(value);
    requestAnimationFrame(resizeComposer);
  }

  const displayMessages =
    activeChat === "common"
      ? commonMessages.map((m) => ({
          id: m.id,
          createdAt: m.createdAt,
          mine: m.from === "mentor",
          label: m.from === "mentor" ? m.mentorName || "You" : m.name || "Learner",
          msg: m,
        }))
      : dmMessages.map((m) => ({
          id: m.id,
          createdAt: m.createdAt,
          mine: m.from === "mentor",
          label: m.from === "mentor" ? "You" : "Learner",
          msg: m,
        }));

  return (
    <div className={dock ? "wa-chat wa-chat-compact wa-chat-dock" : compact ? "wa-chat wa-chat-compact" : "page wide wa-chat-page"}>
      {!compact ? (
        <div className="page-head" style={{ marginBottom: 12 }}>
          <div>
            <h1 className="hello">Messages</h1>
            <p className="lead">
              Hive common chat plus direct messages with every learner — photos, voice notes, and files show up here too.
            </p>
          </div>
          {totalUnread > 0 ? (
            <div className="wa-chat-head-badge">{totalUnread} unread</div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="error-box wa-chat-error">{error}</div> : null}

      <div className="wa-chat-shell">
        <aside className="wa-chat-sidebar">
          <div className="wa-chat-sidebar-head">
            <input
              className="wa-chat-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search kids…"
            />
          </div>

          <div className="wa-chat-thread-list">
            <button
              type="button"
              className={`wa-chat-thread ${activeChat === "common" ? "active" : ""}`}
              onClick={() => setActiveChat("common")}
            >
              <div className="wa-chat-avatar wa-chat-avatar-group">
                <Users size={18} />
              </div>
              <div className="wa-chat-thread-body">
                <div className="wa-chat-thread-top">
                  <span className="wa-chat-thread-name">Common chat</span>
                  {commonPreview?.lastAt ? <span className="wa-chat-thread-time">{chatTime(commonPreview.lastAt)}</span> : null}
                </div>
                <div className="wa-chat-thread-preview">
                  {commonPreview
                    ? `${commonPreview.from === "mentor" ? "You: " : `${commonPreview.name}: `}${previewText(commonPreview.lastText)}`
                    : "Say hi to the whole hive"}
                </div>
              </div>
            </button>

            {filteredThreads.map((t) => (
              <button
                key={t.learnerId}
                type="button"
                className={`wa-chat-thread ${activeChat === t.learnerId ? "active" : ""}`}
                onClick={() => setActiveChat(t.learnerId)}
              >
                <img className="wa-chat-avatar" src={avatarUrl(t.learnerAvatarName)} alt="" />
                <div className="wa-chat-thread-body">
                  <div className="wa-chat-thread-top">
                    <span className="wa-chat-thread-name">{t.learnerName}</span>
                    {t.lastAt ? <span className="wa-chat-thread-time">{chatTime(t.lastAt)}</span> : null}
                  </div>
                  <div className="wa-chat-thread-preview">{t.lastText ? previewText(t.lastText) : "Start a direct chat"}</div>
                </div>
                {t.unreadForMentor > 0 ? <span className="wa-chat-unread">{t.unreadForMentor}</span> : null}
              </button>
            ))}

            {!filteredThreads.length ? <p className="hint wa-chat-empty">No learners match your search.</p> : null}
          </div>

          {totalUnread > 0 ? (
            <div className="wa-chat-sidebar-foot">{totalUnread} unread direct message{totalUnread === 1 ? "" : "s"}</div>
          ) : null}
        </aside>

        <section className="wa-chat-window">
          <header className="wa-chat-window-head">
            <div className="wa-chat-window-head-main">
              <div className="wa-chat-window-title">{headerTitle}</div>
              <div className="wa-chat-window-sub">{headerSub}</div>
              {activeChat !== "common" && activeThread ? (
                <Link href={`/dashboard/learners/${activeThread.learnerId}`} className="wa-chat-learner-link">
                  Open learner profile
                  <ExternalLink size={12} />
                </Link>
              ) : null}
            </div>
            {activeChat !== "common" && activeThread ? (
              <img className="wa-chat-head-avatar" src={avatarUrl(activeThread.learnerAvatarName)} alt="" />
            ) : (
              <div className="wa-chat-avatar wa-chat-avatar-group wa-chat-head-avatar">
                <Users size={18} />
              </div>
            )}
          </header>

          <div className="wa-chat-messages" ref={scrollRef}>
            {!displayMessages.length ? (
              <p className="hint wa-chat-empty-center">
                {activeChat === "common"
                  ? "No hive messages yet. Say hello to everyone!"
                  : "No messages yet. Send the first hello."}
              </p>
            ) : (
              displayMessages.map((m) => (
                <div key={m.id} className={`wa-chat-row ${m.mine ? "mine" : "theirs"}${isPendingId(m.id) ? " pending" : ""}`}>
                  <div className={`wa-chat-bubble ${m.mine ? "mine" : "theirs"}${isPendingId(m.id) ? " pending" : ""}`}>
                    {!m.mine ? <div className="wa-chat-bubble-label">{m.label}</div> : null}
                    <ChatMessageBody msg={m.msg} mine={m.mine} />
                    <div className="wa-chat-bubble-time">{isPendingId(m.id) ? "Sending…" : chatTime(m.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <footer className="wa-chat-composer">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={onComposerKeyDown}
              rows={1}
              placeholder={activeChat === "common" ? "Message everyone in the hive…" : "Message this kid…"}
              className="wa-chat-input"
            />
            <button
              type="button"
              className="wa-chat-send"
              disabled={!draft.trim() || sending || (activeChat !== "common" && !activeThread)}
              onClick={() => void send()}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
