"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Users, UserRound, Search, Sparkles } from "lucide-react";
import { api, getUser, type Learner } from "@/lib/api";
import {
  audienceError,
  avatarUrl,
  buildKidRoster,
  defaultStartsAt,
  formatBookPreview,
  levelLabel,
  NOTE_SNIPPETS,
  timePresets,
  TITLE_SUGGESTIONS,
  type ClassKind,
} from "@/lib/classBook";

type ClassRow = {
  title: string;
  body?: string;
  durationMin: number;
  classKind?: ClassKind;
  learnerIds: string[];
};

type Props = {
  open: boolean;
  learners: Learner[];
  onClose: () => void;
  onBooked: (msg: string) => void;
  onError: (msg: string) => void;
  prefill?: ClassRow;
};

export function BookClassPanel({ open, learners, onClose, onBooked, onError, prefill }: Props) {
  const mentor = getUser();
  const roster = useMemo(() => buildKidRoster(learners), [learners]);
  const presets = useMemo(() => timePresets(), [open]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [classKind, setClassKind] = useState<ClassKind>("group");
  const [picked, setPicked] = useState<string[]>([]);
  const [learnerQuery, setLearnerQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const name = mentor?.name?.split(/\s+/)[0] || "Mentor";
    if (prefill) {
      setTitle(prefill.title);
      setBody(prefill.body || "");
      setDurationMin(prefill.durationMin);
      setClassKind(prefill.classKind || (prefill.learnerIds.length === 1 ? "individual" : "group"));
      setPicked(prefill.learnerIds);
      setStartsAt(defaultStartsAt());
    } else {
      setTitle(`Live class with ${name}`);
      setBody("");
      setDurationMin(30);
      setClassKind("group");
      setPicked([]);
      setStartsAt(defaultStartsAt());
    }
    setLearnerQuery("");
  }, [open, prefill, mentor?.name]);

  const filteredRoster = useMemo(() => {
    const q = learnerQuery.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (k) =>
        k.childName.toLowerCase().includes(q) ||
        k.parentName?.toLowerCase().includes(q) ||
        k.level?.toLowerCase().includes(q)
    );
  }, [roster, learnerQuery]);

  const preview = formatBookPreview(startsAt, durationMin, classKind, picked.length, roster.length);
  const pickError = audienceError(classKind, picked.length);

  function setKind(next: ClassKind) {
    setClassKind(next);
    if (next === "individual" && picked.length > 1) setPicked((list) => list.slice(0, 1));
  }

  function toggleKid(pickId: string) {
    setPicked((list) => {
      const on = list.includes(pickId);
      if (classKind === "individual") return on ? [] : [pickId];
      return on ? list.filter((id) => id !== pickId) : [...list, pickId];
    });
  }

  function selectAllVisible() {
    if (classKind === "individual") return;
    const ids = filteredRoster.map((k) => k.pickId);
    setPicked((list) => Array.from(new Set([...list, ...ids])));
  }

  function clearPicked() {
    setPicked([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = audienceError(classKind, picked.length);
    if (err) {
      onError(err);
      return;
    }
    setSaving(true);
    onError("");
    try {
      const iso = new Date(startsAt).toISOString();
      const data = await api("/guide/notify/classes", {
        method: "POST",
        body: JSON.stringify({
          title,
          body: body || undefined,
          startsAt: iso,
          durationMin,
          learnerIds: picked,
          classKind,
        }),
      });
      onBooked(`Live class booked for ${data.sent} learner${data.sent === 1 ? "" : "s"}.`);
      onClose();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Could not book class.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="sidepanel-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Book a class">
      <aside className="sidepanel book-class-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sidepanel-head">
          <div>
            <span className="sidepanel-title">Book live class</span>
            <p className="book-class-lead">Schedule on demand — kids get a notification when it&apos;s live.</p>
          </div>
          <button type="button" className="mini-link" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="book-class-form" onSubmit={submit}>
          <div className="sidepanel-body book-class-body">
            <div className="book-class-preview">
              <CalendarClock size={18} aria-hidden="true" />
              <span>{preview}</span>
            </div>

            <section className="book-class-section">
              <h3 className="book-class-section-title">Session</h3>
              <label className="field">
                <span>Title</span>
                <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
              </label>
              <div className="book-class-suggestions">
                {TITLE_SUGGESTIONS[classKind].map((s) => (
                  <button key={s} type="button" className="book-chip" onClick={() => setTitle(s)}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="book-class-type-row">
                <span className="field-label">Class type</span>
                <div className="book-segments" role="tablist" aria-label="Class type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={classKind === "group"}
                    className={`book-segment${classKind === "group" ? " on" : ""}`}
                    onClick={() => setKind("group")}
                  >
                    <Users size={15} aria-hidden="true" />
                    Group
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={classKind === "individual"}
                    className={`book-segment${classKind === "individual" ? " on" : ""}`}
                    onClick={() => setKind("individual")}
                  >
                    <UserRound size={15} aria-hidden="true" />
                    1:1
                  </button>
                </div>
              </div>

              <div className="book-class-grid">
                <label className="field">
                  <span>When</span>
                  <input
                    className="text-input"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Length</span>
                  <select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </label>
              </div>

              <div className="book-class-suggestions">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`book-chip${startsAt === p.value ? " on" : ""}`}
                    onClick={() => setStartsAt(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="book-class-section">
              <h3 className="book-class-section-title">Note for kids</h3>
              <label className="field">
                <span>Optional message in the class invite</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Bring a smile. We'll talk in English."
                  maxLength={600}
                />
              </label>
              <div className="book-class-suggestions">
                {NOTE_SNIPPETS.map((s) => (
                  <button key={s} type="button" className="book-chip" onClick={() => setBody(s)}>
                    <Sparkles size={12} aria-hidden="true" />
                    {s.length > 36 ? `${s.slice(0, 36)}…` : s}
                  </button>
                ))}
              </div>
            </section>

            <section className="book-class-section">
              <div className="book-class-section-head">
                <div>
                  <h3 className="book-class-section-title">Audience</h3>
                  <p className="book-class-hint">
                    {classKind === "individual"
                      ? "Pick exactly one learner."
                      : picked.length
                        ? `${picked.length} selected`
                        : `Leave empty to invite all ${roster.length} learners in the hive.`}
                  </p>
                </div>
                {classKind === "group" ? (
                  <div className="book-class-audience-actions">
                    <button type="button" className="mini-link" onClick={selectAllVisible}>
                      Select all
                    </button>
                    {picked.length ? (
                      <button type="button" className="mini-link" onClick={clearPicked}>
                        Clear
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {pickError ? <p className="book-class-warn">{pickError}</p> : null}

              <label className="book-class-search">
                <Search size={16} aria-hidden="true" />
                <input
                  className="text-input"
                  value={learnerQuery}
                  onChange={(e) => setLearnerQuery(e.target.value)}
                  placeholder="Search by child or parent name"
                />
              </label>

              <div className="book-kid-list">
                {filteredRoster.map((k) => {
                  const on = picked.includes(k.pickId);
                  const lvl = levelLabel(k.level);
                  return (
                    <button
                      key={k.key}
                      type="button"
                      className={`book-kid-row${on ? " on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleKid(k.pickId)}
                    >
                      <img className="book-kid-avatar" src={avatarUrl(k.childName)} alt="" />
                      <span className="book-kid-body">
                        <span className="book-kid-name">{k.childName}</span>
                        <span className="book-kid-meta">
                          {k.parentName ? `Parent: ${k.parentName}` : "Learner account"}
                          {lvl ? ` · ${lvl}` : ""}
                          {k.synced ? " · synced" : " · not synced yet"}
                        </span>
                      </span>
                      <span className={`book-kid-check${on ? " on" : ""}`} aria-hidden="true">
                        {on ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
                {!filteredRoster.length ? <p className="hint">No learners match that search.</p> : null}
              </div>
            </section>
          </div>

          <div className="book-class-footer">
            <button type="button" className="btn btn-navy" style={{ height: 44, maxWidth: 120 }} onClick={onClose}>
              Cancel
            </button>
            <button
              className={`btn btn-yellow${saving ? " is-busy" : ""}`}
              disabled={saving || Boolean(pickError)}
              style={{ height: 44, flex: 1, maxWidth: 280 }}
            >
              {saving ? "Booking…" : "Book live class"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
