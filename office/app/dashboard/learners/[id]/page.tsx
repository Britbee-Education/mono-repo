"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type GuideNote, type Learner } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ACTIVITY_CATALOG, STATUS_OPTIONS, type ActivityId, type CoachStatus } from "@/lib/activities";
import { activityStatLine, displayStatus, formatWhen } from "@/lib/progress";
import { activityName, focusLabel, focusOptions } from "@/lib/focus";
import { StatusChip } from "@/components/StatusChip";
import { ParentBillingPanel } from "@/components/ParentBillingPanel";
import { ParentReferralPanel } from "@/components/ParentReferralPanel";
import { InitialsMark } from "@/components/MascotMark";

function last10(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export default function LearnerDetailPage() {
  const params = useParams<{ id: string }>();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [notes, setNotes] = useState<GuideNote[]>([]);
  const [text, setText] = useState("");
  const [activityId, setActivityId] = useState<ActivityId | "">("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusEdits, setStatusEdits] = useState<Partial<Record<ActivityId, CoachStatus>>>({});
  const [buzzing, setBuzzing] = useState(false);

  function load() {
    return api(`/guide/learners/${params.id}`).then((data) => {
      setLearner(data.learner);
      setNotes(data.notes || []);
    });
  }

  useEffect(() => {
    let alive = true;
    load().catch((e: Error) => {
      if (alive) setError(e.message);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await api(`/guide/learners/${params.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ text, activityId: activityId || undefined }),
      });
      setNotes((list) => [data.note, ...list]);
      setText("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  async function saveActivity(id: ActivityId) {
    const status = statusEdits[id];
    if (!status) return;
    setError("");
    try {
      const data = await api(`/guide/learners/${params.id}/activities/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setLearner(data.learner);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update activity.");
    }
  }

  if (!learner && !error) return <div className="page">Loading…</div>;
  if (!learner) {
    return (
      <div className="page">
        <Link href="/dashboard/learners" className="back">
          ← Learners
        </Link>
        <div className="error-box">{error || "Learner not found"}</div>
      </div>
    );
  }

  const child = learner.child?.childName || learner.name;
  const phone = last10(learner.phone);
  const snap = learner.progress || null;
  const isParent = learner.role === "parent";

  return (
    <div className="page wide">
      <Link href="/dashboard/learners" className="back">
        ← Learners
      </Link>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <InitialsMark name={child} size={56} />
        </div>
        <h1 className="hello" style={{ fontSize: 24 }}>
          {child}
        </h1>
        <p className="lead">
          {learner.child?.childName ? `Parent: ${learner.name}` : learner.role}
          {phone ? ` · +91 ${phone}` : learner.email ? ` · ${learner.email}` : ""}
        </p>
        {learner.child?.level ? (
          <p style={{ marginTop: 8 }}>
            <span className="chip">{learner.child.level}</span>
            {learner.child.goal ? <span className="learner-goal-tag">{learner.child.goal}</span> : null}
          </p>
        ) : null}
        <p className="hint" style={{ marginTop: 10 }}>
          {snap ? `${snap.points} Buzz · ${snap.streak || 0}-day streak · last sync ${formatWhen(learner.syncedAt)}` : "Kids app has not synced yet"}
        </p>
      </div>

      {error ? <div className="error-box">{error}</div> : null}
      <div className="row-actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-yellow"
          style={{ maxWidth: 240, height: 44 }}
          disabled={buzzing}
          onClick={async () => {
            setBuzzing(true);
            setError("");
            try {
              await api("/guide/notify/send", {
                method: "POST",
                body: JSON.stringify({ templateId: "tpl-keep-buzzing", learnerIds: [learner.id] }),
              });
              toast("Buzz sent!", "success");
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Could not send.");
            } finally {
              setBuzzing(false);
            }
          }}
        >
          {buzzing ? "Sending…" : "Send a buzz"}
        </button>
        <button
          type="button"
          className="btn btn-navy"
          style={{ maxWidth: 240, height: 44 }}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("britbee:open-messages", { detail: { learnerId: learner.id } }));
          }}
        >
          Message
        </button>
        <Link href="/dashboard/notifications" className="mini-link">
          Notification desk
        </Link>
      </div>

      {isParent ? <ParentBillingPanel userId={learner.id} parentName={learner.name} /> : null}
      {isParent ? <ParentReferralPanel userId={learner.id} /> : null}

      <h2 className="section">Activity control</h2>
      <div className="radar">
        {ACTIVITY_CATALOG.map((a) => {
          const coach = learner.activities?.[a.id] || null;
          const shown = displayStatus(a.id, coach, snap);
          const options = focusOptions(a.id);
          return (
            <article key={a.id} className="card radar-card">
              <div className="eyebrow">
                Quest {a.quest} · {a.name}
              </div>
              <StatusChip status={shown} />
              <p className="hint" style={{ marginTop: 8 }}>
                {activityStatLine(a.id, snap)}
              </p>
              {coach?.focusItem ? <p className="coach-focus-item">{focusLabel(a.id, coach.focusItem)}</p> : null}
              {coach?.coachNote ? <p className="mini" style={{ marginTop: 6 }}>{coach.coachNote}</p> : null}
              <label className="field" style={{ marginTop: 10, marginBottom: 8 }}>
                <span>Set status</span>
                <select
                  value={statusEdits[a.id] || shown}
                  onChange={(e) => setStatusEdits((s) => ({ ...s, [a.id]: e.target.value as CoachStatus }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="row-actions">
                <button type="button" className="btn btn-navy" style={{ height: 40, fontSize: 13 }} onClick={() => saveActivity(a.id)}>
                  Save
                </button>
                <Link href={`/dashboard/activities/${a.id}`} className="mini-link">
                  Full curriculum
                </Link>
              </div>
              {options.length ? <p className="mini" style={{ marginTop: 8 }}>{options.length} exercises in this activity</p> : null}
            </article>
          );
        })}
      </div>

      <h2 className="section">Session note</h2>
      <form className="card note-form" onSubmit={saveNote}>
        <label className="field">
          <span>Attach to activity (optional)</span>
          <select value={activityId} onChange={(e) => setActivityId(e.target.value as ActivityId | "")}>
            <option value="">Whole session</option>
            {ACTIVITY_CATALOG.map((a) => (
              <option key={a.id} value={a.id}>
                {a.quest}. {a.name}
              </option>
            ))}
          </select>
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you practise? What still needs work?"
          maxLength={600}
        />
        <button className="btn btn-yellow" disabled={saving || !text.trim()}>
          {saving ? "Saving…" : "Save note"}
        </button>
      </form>

      <h2 className="section">Earlier notes</h2>
      <div className="card">
        {notes.length ? (
          notes.map((n) => (
            <article key={n.id} className="note">
              <time>
                {formatWhen(n.createdAt)} · {n.guideName}
                {n.activityId ? ` · ${activityName(n.activityId as ActivityId)}` : ""}
              </time>
              <p>{n.text}</p>
            </article>
          ))
        ) : (
          <p className="hint">No notes yet. Write one after today’s session.</p>
        )}
      </div>
    </div>
  );
}
