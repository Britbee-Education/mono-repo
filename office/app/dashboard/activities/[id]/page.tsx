"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type ActivityEvent, type GuideNote, type Learner } from "@/lib/api";
import { ACTIVITY_CATALOG, STATUS_OPTIONS, isActivityId, type ActivityId, type CoachStatus } from "@/lib/activities";
import { activityStatLine, displayStatus, formatWhen } from "@/lib/progress";
import { focusLabel, focusOptions } from "@/lib/focus";
import { ActivityCatalog } from "@/components/ActivityCatalog";
import { StatusChip } from "@/components/StatusChip";
import { DataListToolbar } from "@/components/DataListToolbar";
import { downloadJson } from "@/lib/dataTools";

function labelOf(l: Learner) {
  return l.childLabel || l.child?.childName || l.name;
}

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id || "");
  const meta = ACTIVITY_CATALOG.find((a) => a.id === id);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [notes, setNotes] = useState<GuideNote[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState("");
  const [status, setStatus] = useState<CoachStatus>("assigned");
  const [focusItem, setFocusItem] = useState("");
  const [coachNote, setCoachNote] = useState("");
  const [saving, setSaving] = useState(false);

  const valid = isActivityId(id);
  const activityId = (valid ? id : "phonics") as ActivityId;
  const focuses = useMemo(() => focusOptions(activityId), [activityId]);

  function load() {
    if (!valid) return;
    api(`/guide/activities/${id}`)
      .then((data) => {
        setLearners(data.learners || []);
        setNotes(data.notes || []);
        setEvents(data.events || []);
      })
      .catch((e: Error) => setError(e.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const row = learners.find((l) => l.id === picked);
    if (!row) return;
    const coach = row.activities?.[activityId];
    if (coach?.status) setStatus(coach.status);
    setFocusItem(coach?.focusItem || "");
    setCoachNote(coach?.coachNote || "");
  }, [picked, learners, activityId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      await api(`/guide/learners/${picked}/activities/${activityId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, focusItem, coachNote }),
      });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!meta || !valid) {
    return (
      <div className="page">
        <Link href="/dashboard/activities" className="back">
          ← Activities
        </Link>
        <div className="error-box">Unknown activity</div>
      </div>
    );
  }

  const assigned = learners.filter((l) => displayStatus(activityId, l.activities?.[activityId] || null, l.progress || null) === "assigned");
  const review = learners.filter((l) => displayStatus(activityId, l.activities?.[activityId] || null, l.progress || null) === "needs-review");
  const live = learners.filter((l) => displayStatus(activityId, l.activities?.[activityId] || null, l.progress || null) === "in-progress");

  return (
    <div className="page wide">
      <Link href="/dashboard/activities" className="back">
        ← All activities
      </Link>
      <p className="eyebrow">
        Quest {meta.quest} · {meta.appTitle}
      </p>
      <h1 className="hello">
        {meta.icon} {meta.name}
      </h1>
      <p className="lead">{meta.order}</p>
      <p className="hint" style={{ marginTop: 6 }}>
        {meta.tip}
      </p>

      <div className="stats">
        <div className="stat">
          <b>{assigned.length}</b>
          <span>Assigned</span>
        </div>
        <div className="stat">
          <b>{live.length}</b>
          <span>In progress</span>
        </div>
        <div className="stat">
          <b>{review.length}</b>
          <span>Needs review</span>
        </div>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <h2 className="section">Roster</h2>
      <DataListToolbar
        label={`${learners.length} learners · ${meta.name}`}
        onExport={async () => {
          downloadJson(`britbee-activity-${activityId}-${Date.now()}.json`, {
            activityId,
            activity: meta,
            learners: learners.map((l) => ({
              id: l.id,
              name: labelOf(l),
              coach: l.activities?.[activityId] || null,
              progress: l.progress || null,
              syncedAt: l.syncedAt,
            })),
            notes,
            events,
          });
        }}
      />
      <div className="table-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th>Child</th>
              <th>Status</th>
              <th>In the app</th>
              <th>Focus</th>
              <th>Coach note</th>
              <th>Last sync</th>
            </tr>
          </thead>
          <tbody>
            {learners.map((l) => {
              const coach = l.activities?.[activityId] || null;
              const shown = displayStatus(activityId, coach, l.progress || null);
              return (
                <tr key={l.id} className={picked === l.id ? "row-now" : undefined}>
                  <td>
                    <button className="table-link" type="button" onClick={() => setPicked(l.id)}>
                      {labelOf(l)}
                    </button>
                    <div className="mini">{l.child?.level || l.role}</div>
                  </td>
                  <td>
                    <StatusChip status={shown} />
                  </td>
                  <td>{activityStatLine(activityId, l.progress || null)}</td>
                  <td>{focusLabel(activityId, coach?.focusItem) || "—"}</td>
                  <td>{coach?.coachNote || "—"}</td>
                  <td className="mini">{formatWhen(l.syncedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="section">Coach a child</h2>
      <form className="card coach-form" onSubmit={save}>
        <div className="coach-grid">
          <label className="field">
            <span>Learner</span>
            <select value={picked} onChange={(e) => setPicked(e.target.value)} required>
              <option value="">Select a child</option>
              {learners.map((l) => (
                <option key={l.id} value={l.id}>
                  {labelOf(l)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as CoachStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Focus item (exact exercise)</span>
            <select value={focusItem} onChange={(e) => setFocusItem(e.target.value)}>
              <option value="">No specific focus</option>
              {focuses.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Coach note for this activity</span>
          <textarea value={coachNote} onChange={(e) => setCoachNote(e.target.value)} maxLength={600} placeholder="What to practise, what went wrong, what to repeat next session." />
        </label>
        <button className="btn btn-yellow" disabled={saving || !picked} style={{ maxWidth: 280 }}>
          {saving ? "Saving…" : "Save coaching"}
        </button>
      </form>

      <h2 className="section">Curriculum in order</h2>
      <ActivityCatalog id={activityId} />

      <h2 className="section">Recent coaching log</h2>
      <div className="card">
        {events.length || notes.length ? (
          <>
            {events.map((ev) => (
              <article key={ev.id} className="note">
                <time>
                  {formatWhen(ev.createdAt)} · {ev.guideName} ·{" "}
                  {labelOf(
                    learners.find((l) => l.id === ev.learnerId) || { id: "", name: "Learner", role: "learner" }
                  )}
                </time>
                <p>{ev.text}</p>
              </article>
            ))}
            {notes.map((n) => (
              <article key={n.id} className="note">
                <time>
                  {formatWhen(n.createdAt)} · {n.guideName} · session note
                </time>
                <p>{n.text}</p>
              </article>
            ))}
          </>
        ) : (
          <p className="hint">No coaching events yet. Assign a child and save a status or note.</p>
        )}
      </div>
    </div>
  );
}
