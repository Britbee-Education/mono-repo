"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type Learner } from "@/lib/api";
import { ACTIVITY_CATALOG, type ActivityId } from "@/lib/activities";
import { formatWhen } from "@/lib/progress";

type Kind = "general" | "activity" | "class";
type Tab = "inbox" | "send" | "sent" | "templates" | "daily";

type Template = {
  id: string;
  name: string;
  kind: Kind;
  activityId?: ActivityId;
  title: string;
  body: string;
};

type Schedule = {
  id: string;
  activityId: ActivityId;
  enabled: boolean;
  time: string;
  templateId: string;
  lastSentDate?: string;
};

type LogRow = {
  id: string;
  learnerName?: string;
  title: string;
  body: string;
  kind: Kind;
  source: string;
  createdAt: string;
};

type InboxRow = {
  id: string;
  kind: "chat" | "class" | "hive";
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  href?: string;
  learnerId?: string;
};

function labelOf(l: Learner) {
  return l.childLabel || l.child?.childName || l.name;
}

function activityName(id?: string) {
  return ACTIVITY_CATALOG.find((a) => a.id === id)?.name || "Any";
}

function inboxIcon(kind: InboxRow["kind"]) {
  if (kind === "chat") return "💬";
  if (kind === "class") return "🎥";
  return "🏟️";
}

type Props = {
  compact?: boolean;
  onClose?: () => void;
  onUnreadChange?: (count: number) => void;
};

export function NotifyPanel({ compact = false, onClose, onUnreadChange }: Props) {
  const [tab, setTab] = useState<Tab>("inbox");
  const [learners, setLearners] = useState<Learner[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [board, tpls, sch, lg, incoming] = await Promise.all([
      api("/guide/board"),
      api("/guide/notify/templates"),
      api("/guide/notify/schedules"),
      api("/guide/notify/log"),
      api("/guide/notify/inbox"),
    ]);
    setLearners(board.learners || []);
    setTemplates(tpls.templates || []);
    setSchedules(sch.schedules || []);
    setLog(lg.messages || []);
    setInbox(incoming.items || []);
    onUnreadChange?.(Number(incoming.unread) || 0);
  }, [onUnreadChange]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
    const t = window.setInterval(() => void load().catch(() => undefined), compact ? 8000 : 15000);
    return () => window.clearInterval(t);
  }, [load, compact]);

  const tabs: [Tab, string][] = compact
    ? [
        ["inbox", "Inbox"],
        ["send", "Send"],
        ["sent", "Sent"],
      ]
    : [
        ["inbox", "Inbox"],
        ["send", "Send"],
        ["sent", "Sent"],
        ["templates", "Templates"],
        ["daily", "Daily"],
      ];

  function openInboxItem(item: InboxRow) {
    if (item.kind === "chat" && item.learnerId) {
      onClose?.();
      window.dispatchEvent(new CustomEvent("britbee:open-messages", { detail: { learnerId: item.learnerId } }));
      return;
    }
    if (item.kind === "hive") {
      onClose?.();
      window.dispatchEvent(new CustomEvent("britbee:open-messages", { detail: { chat: "common" } }));
      return;
    }
    if (item.href) {
      onClose?.();
      window.location.href = item.href;
    }
  }

  return (
    <div className={compact ? "notify-panel notify-panel-compact" : "page wide notify-panel"}>
      {!compact ? (
        <>
          <h1 className="hello">Notifications</h1>
          <p className="lead">
            Hive inbox for kids plus your mentor feed — new messages, live classes, and quick sends. Live classes are under{" "}
            <Link href="/dashboard/classes">Classes</Link>.
          </p>
        </>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}
      {note ? (
        <p className="hint notify-panel-note" style={{ color: "var(--success)" }}>
          {note}
        </p>
      ) : null}

      <div className="tabs notify-panel-tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? "tab on" : "tab"} type="button" onClick={() => setTab(id)}>
            {label}
            {id === "inbox" && inbox.some((i) => i.unread) ? <span className="tab-dot" /> : null}
          </button>
        ))}
      </div>

      <div className="notify-panel-stage">
        {tab === "inbox" ? <InboxPanel items={inbox} onOpen={openInboxItem} compact={compact} /> : null}
        {tab === "send" ? (
          <SendPanel
            compact={compact}
            learners={learners}
            templates={templates}
            onDone={async (msg) => {
              setNote(msg);
              await load();
            }}
            onError={setError}
          />
        ) : null}
        {tab === "sent" ? <SentPanel log={log} compact={compact} /> : null}
        {!compact && tab === "templates" ? (
          <TemplatesPanel
            templates={templates}
            onDone={async (msg) => {
              setNote(msg);
              await load();
            }}
            onError={setError}
          />
        ) : null}
        {!compact && tab === "daily" ? (
          <DailyPanel
            schedules={schedules}
            templates={templates}
            onDone={async (msg) => {
              setNote(msg);
              await load();
            }}
            onError={setError}
          />
        ) : null}
      </div>
    </div>
  );
}

function InboxPanel({
  items,
  onOpen,
  compact,
}: {
  items: InboxRow[];
  onOpen: (item: InboxRow) => void;
  compact?: boolean;
}) {
  const visible = compact ? items.slice(0, 5) : items;

  if (!visible.length) {
    return (
      <div className="card notify-inbox-empty">
        <p className="hint">You&apos;re all caught up — no new kid messages or class alerts.</p>
      </div>
    );
  }

  return (
    <div className="notify-inbox-list">
      {visible.map((item) => (
        <button key={item.id} type="button" className={`notify-inbox-row${item.unread ? " unread" : ""}`} onClick={() => onOpen(item)}>
          <span className="notify-inbox-icon">{inboxIcon(item.kind)}</span>
          <span className="notify-inbox-body">
            <span className="notify-inbox-top">
              <span className="notify-inbox-title">{item.title}</span>
              <span className="notify-inbox-time">{formatWhen(item.createdAt)}</span>
            </span>
            <span className="notify-inbox-preview">{item.body}</span>
          </span>
          {item.unread ? <span className="notify-inbox-dot" /> : null}
        </button>
      ))}
    </div>
  );
}

function SendPanel({
  compact,
  learners,
  templates,
  onDone,
  onError,
}: {
  compact?: boolean;
  learners: Learner[];
  templates: Template[];
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [activityId, setActivityId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const tpl = templates.find((t) => t.id === templateId);

  useEffect(() => {
    if (!tpl) return;
    setTitle(tpl.title);
    setBody(tpl.body);
    setActivityId(tpl.activityId || "");
  }, [tpl]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError("");
    try {
      const data = await api("/guide/notify/send", {
        method: "POST",
        body: JSON.stringify({
          templateId: templateId || undefined,
          title,
          body,
          activityId: activityId || undefined,
          learnerIds: picked,
        }),
      });
      onDone(`Sent to ${data.sent} learner${data.sent === 1 ? "" : "s"}${data.skipped ? ` · ${data.skipped} muted` : ""}.`);
      setTitle("");
      setBody("");
      setPicked([]);
      setTemplateId("");
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card coach-form notify-send-form" onSubmit={send}>
      <div className={compact ? "notify-send-grid" : "coach-grid"}>
        <label className="field">
          <span>Template</span>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Write from scratch</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {!compact ? (
          <label className="field">
            <span>Link to activity</span>
            <select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
              <option value="">None</option>
              {ACTIVITY_CATALOG.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.quest}. {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>Title</span>
          <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
        </label>
      </div>
      <label className="field">
        <span>Message</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required maxLength={600} rows={compact ? 3 : 4} />
      </label>
      <p className="hint">Pick kids below, or leave empty to buzz the whole hive.</p>
      <div className={`pick-grid${compact ? " pick-grid-compact" : ""}`}>
        {learners.map((l) => {
          const on = picked.includes(l.id);
          return (
            <label key={l.id} className={on ? "pick on" : "pick"}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => setPicked((list) => (on ? list.filter((id) => id !== l.id) : [...list, l.id]))}
              />
              {labelOf(l)}
            </label>
          );
        })}
      </div>
      <button className="btn btn-yellow" disabled={saving} style={{ maxWidth: 280, marginTop: 14 }}>
        {saving ? "Sending…" : picked.length ? `Send to ${picked.length}` : "Send to everyone"}
      </button>
    </form>
  );
}

function SentPanel({ log, compact }: { log: LogRow[]; compact?: boolean }) {
  const visible = compact ? log.slice(0, 4) : log.slice(0, 80);
  return (
    <div className="card notify-sent-list">
      {visible.length ? (
        visible.map((m) => (
          <article key={m.id} className="note notify-sent-row">
            <time>
              {formatWhen(m.createdAt)} · {m.learnerName || "Learner"} · {m.source}
            </time>
            <p className="notify-item-title">{m.title}</p>
            <p className={compact ? "mini" : undefined}>{m.body}</p>
          </article>
        ))
      ) : (
        <p className="hint">Nothing sent yet.</p>
      )}
    </div>
  );
}

function TemplatesPanel({
  templates,
  onDone,
  onError,
}: {
  templates: Template[];
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const blank: Template = { id: "", name: "", kind: "general", title: "", body: "" };
  const [draft, setDraft] = useState<Template>(blank);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError("");
    try {
      await api(draft.id ? `/guide/notify/templates/${draft.id}` : "/guide/notify/templates", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(draft),
      });
      setDraft(blank);
      onDone(draft.id ? "Template saved." : "Template added.");
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    onError("");
    try {
      await api(`/guide/notify/templates/${id}`, { method: "DELETE" });
      if (draft.id === id) setDraft(blank);
      onDone("Template removed.");
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Could not delete.");
    }
  }

  return (
    <div className="split">
      <form className="card coach-form" onSubmit={save}>
        <h2 className="section" style={{ marginTop: 0 }}>
          {draft.id ? "Edit template" : "New template"}
        </h2>
        <label className="field">
          <span>Name</span>
          <input className="text-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        </label>
        <div className="coach-grid">
          <label className="field">
            <span>Kind</span>
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}>
              <option value="general">General</option>
              <option value="activity">Activity reminder</option>
              <option value="class">Class</option>
            </select>
          </label>
          <label className="field">
            <span>Activity</span>
            <select
              value={draft.activityId || ""}
              onChange={(e) => setDraft({ ...draft, activityId: (e.target.value || undefined) as ActivityId | undefined })}
            >
              <option value="">None</option>
              {ACTIVITY_CATALOG.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Title</span>
          <input className="text-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
        </label>
        <label className="field">
          <span>Body</span>
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} required />
        </label>
        <div className="row-actions">
          <button className="btn btn-yellow" disabled={saving} style={{ maxWidth: 200 }}>
            {saving ? "Saving…" : draft.id ? "Save template" : "Add template"}
          </button>
          {draft.id ? (
            <button type="button" className="mini-link" onClick={() => setDraft(blank)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <div className="card">
        {templates.map((t) => (
          <article key={t.id} className="note">
            <time>
              {t.kind} {t.activityId ? `· ${activityName(t.activityId)}` : ""}
            </time>
            <p className="notify-item-title">{t.name}</p>
            <p className="mini">
              {t.title} — {t.body}
            </p>
            <div className="row-actions" style={{ marginTop: 8 }}>
              <button type="button" className="mini-link" onClick={() => setDraft(t)}>
                Edit
              </button>
              <button type="button" className="mini-link" onClick={() => remove(t.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function DailyPanel({
  schedules,
  templates,
  onDone,
  onError,
}: {
  schedules: Schedule[];
  templates: Template[];
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  async function patch(id: string, body: Partial<Schedule>) {
    onError("");
    try {
      await api(`/guide/notify/schedules/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      onDone("Daily reminder updated.");
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Could not update.");
    }
  }

  return (
    <div className="table-wrap">
      <table className="sheet">
        <thead>
          <tr>
            <th>Activity</th>
            <th>On</th>
            <th>Time (IST)</th>
            <th>Template</th>
            <th>Last sent</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id}>
              <td>
                <b>{activityName(s.activityId)}</b>
              </td>
              <td>
                <input type="checkbox" checked={s.enabled} onChange={(e) => patch(s.id, { enabled: e.target.checked })} />
              </td>
              <td>
                <input className="time-input" type="time" value={s.time} onChange={(e) => patch(s.id, { time: e.target.value })} />
              </td>
              <td>
                <select value={s.templateId} onChange={(e) => patch(s.id, { templateId: e.target.value })}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="mini">{s.lastSentDate || "Never"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
