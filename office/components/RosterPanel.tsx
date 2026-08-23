"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical, RefreshCw, Save, Shuffle, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { DataListToolbar } from "@/components/DataListToolbar";
import { downloadJson, readJsonFile } from "@/lib/dataTools";
import { ACTIVITY_CATALOG } from "@/lib/activities";
import { PHONICS } from "@/lib/content/phonics";
import { PREPOSITIONS } from "@/lib/content/prepositions";
import { STORY } from "@/lib/content/story";
import { VERB_POOL } from "@/lib/content/verbs";
import {
  buildMonth,
  dayLabel,
  defaultDayPlan,
  parseMonthKey,
  shuffleMonthPhonics,
  shuffleMonthVerbs,
  swapDays,
  type DayPlan,
  type DayOverride,
} from "@/lib/rosterPlan";

function todayMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, delta: number) {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(key: string) {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function verbSummary(ids: string[]) {
  return ids
    .map((id) => VERB_POOL.find((v) => v.id === id))
    .filter(Boolean)
    .map((v) => v!.emoji)
    .join(" ");
}

export function RosterPanel() {
  const [month, setMonth] = useState(todayMonthKey);
  const [days, setDays] = useState<DayPlan[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragDate, setDragDate] = useState<string | null>(null);

  const loadMonth = useCallback(async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/guide/roster?month=${key}`);
      const overrides: Record<string, DayOverride> = {};
      for (const row of (data.overrides || []) as DayOverride[]) overrides[row.date] = row;
      const built = buildMonth(parseMonthKey(key).year, parseMonthKey(key).month, overrides);
      setDays(built.days);
      setDirty(false);
    } catch (e: unknown) {
      const built = buildMonth(parseMonthKey(key).year, parseMonthKey(key).month, {});
      setDays(built.days);
      setError(e instanceof Error ? e.message : "Could not load saved roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedDate(null);
    void loadMonth(month);
  }, [loadMonth, month]);

  const selected = useMemo(() => days.find((d) => d.date === selectedDate) || null, [days, selectedDate]);
  const manualCount = useMemo(() => days.filter((d) => d.manual).length, [days]);
  const lanes = ACTIVITY_CATALOG.filter((a) => a.id !== "phonics");

  async function saveMonth() {
    setSaving(true);
    setError("");
    setNote("");
    try {
      const payload = days.filter((d) => d.manual).map(({ date, phonicsId, sentence, verbIds, storyScene, prepIds, note, manual }) => ({
        date,
        phonicsId,
        sentence,
        verbIds,
        storyScene,
        prepIds,
        note,
        manual,
      }));
      await api("/guide/roster", { method: "PUT", body: JSON.stringify({ month, days: payload }) });
      setDirty(false);
      setNote("Roster saved for this month.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save roster.");
    } finally {
      setSaving(false);
    }
  }

  async function resetMonth() {
    if (!confirm("Clear all manual edits for this month and restore the auto rotation?")) return;
    setSaving(true);
    setError("");
    try {
      await api(`/guide/roster?month=${month}`, { method: "DELETE" });
      await loadMonth(month);
      setSelectedDate(null);
      setNote("Month reset to default rotation.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not reset roster.");
    } finally {
      setSaving(false);
    }
  }

  function patchDay(date: string, patch: Partial<DayPlan>) {
    setDays((rows) => rows.map((d) => (d.date === date ? { ...d, ...patch, manual: true } : d)));
    setDirty(true);
  }

  function onDropTarget(targetDate: string) {
    if (!dragDate || dragDate === targetDate) return;
    setDays((rows) => swapDays(rows, dragDate, targetDate));
    setDragDate(null);
    setDirty(true);
  }

  return (
    <div className="roster-page roster-panel">
      <div className="roster-page-head">
        <div className="roster-toolbar">
          <div className="roster-month-nav">
            <button type="button" className="roster-icon-btn" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
              <ArrowLeft size={16} />
            </button>
            <strong className="roster-month-label">{monthTitle(month)}</strong>
            <button type="button" className="roster-icon-btn" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
              <ArrowRight size={16} />
            </button>
          </div>
          <button
            type="button"
            className="btn btn-outline roster-tool-btn"
            onClick={() => {
              setDays((rows) => shuffleMonthPhonics(rows));
              setDirty(true);
            }}
          >
            <Shuffle size={14} /> Shuffle sounds
          </button>
          <button
            type="button"
            className="btn btn-outline roster-tool-btn"
            onClick={() => {
              setDays((rows) => shuffleMonthVerbs(rows));
              setDirty(true);
            }}
          >
            <Shuffle size={14} /> Shuffle verbs
          </button>
          <button type="button" className="btn btn-outline roster-tool-btn" onClick={() => void loadMonth(month)}>
            <RefreshCw size={14} /> Reload
          </button>
          <button type="button" className="btn btn-outline roster-tool-btn" onClick={() => void resetMonth()} disabled={saving}>
            <Trash2 size={14} /> Reset month
          </button>
          <button type="button" className="btn btn-yellow roster-tool-btn" onClick={() => void saveMonth()} disabled={saving || !dirty}>
            <Save size={14} /> {saving ? "Saving…" : dirty ? "Save roster" : "Saved"}
          </button>
        </div>
      </div>

      {error ? <div className="error-box">{error}</div> : null}
      {note ? (
        <p className="hint" style={{ color: "var(--success)" }}>
          {note}
        </p>
      ) : null}

      <DataListToolbar
        label={`${monthTitle(month)} · ${manualCount} manual day${manualCount === 1 ? "" : "s"}`}
        onExport={async () => {
          const payload = {
            month,
            days: days.filter((d) => d.manual).map(({ date, phonicsId, sentence, verbIds, storyScene, prepIds, note, manual }) => ({
              date,
              phonicsId,
              sentence,
              verbIds,
              storyScene,
              prepIds,
              note,
              manual,
            })),
          };
          downloadJson(`britbee-roster-${month}.json`, payload);
          setNote("Roster export downloaded.");
        }}
        onImport={async (file) => {
          const parsed = (await readJsonFile(file)) as { month?: string; days?: DayOverride[] };
          if (parsed.month && parsed.month !== month) {
            setMonth(parsed.month);
          }
          const rows = Array.isArray(parsed.days) ? parsed.days : [];
          if (!rows.length) throw new Error("No day overrides in this file.");
          await api("/guide/roster", {
            method: "PUT",
            body: JSON.stringify({ month: parsed.month || month, days: rows }),
          });
          await loadMonth(parsed.month || month);
          setNote(`Imported ${rows.length} day override${rows.length === 1 ? "" : "s"}.`);
        }}
      />

      <div className="roster-meta">
        <span>{days.length} days</span>
        <span>{manualCount} edited</span>
        <span>Drag day headers to swap</span>
      </div>

      {loading ? <p className="hint">Loading roster…</p> : null}

      <div className="roster-lanes-wrap">
        <table className="roster-lanes">
          <thead>
            <tr>
              <th className="roster-lane-label sticky-col">Activity</th>
              {days.map((d) => (
                <th
                  key={d.date}
                  className={`roster-day-head${d.manual ? " manual" : ""}${selectedDate === d.date ? " selected" : ""}`}
                  draggable
                  onDragStart={() => setDragDate(d.date)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropTarget(d.date)}
                >
                  <button type="button" className="roster-day-btn" onClick={() => setSelectedDate(d.date)}>
                    <GripVertical size={12} className="roster-grip" aria-hidden="true" />
                    <span>{dayLabel(d.date)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="roster-lane-label sticky-col">
                <span className="roster-lane-icon">🔤</span> Sound Lab
              </th>
              {days.map((d) => {
                const sound = PHONICS.find((s) => s.id === d.phonicsId);
                return (
                  <td key={d.date} className={`roster-cell${d.manual ? " manual" : ""}`}>
                    <button type="button" className="roster-cell-btn" onClick={() => setSelectedDate(d.date)}>
                      <strong>{sound?.glyph || "?"}</strong>
                      <span>{sound?.title || d.phonicsId}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
            {lanes.map((activity) => (
              <tr key={activity.id}>
                <th className="roster-lane-label sticky-col">
                  <span className="roster-lane-icon">{activity.icon}</span> {activity.name}
                </th>
                {days.map((d) => (
                  <td key={`${activity.id}-${d.date}`} className={`roster-cell${d.manual ? " manual" : ""}`}>
                    <button type="button" className="roster-cell-btn" onClick={() => setSelectedDate(d.date)}>
                      {activity.id === "sentence" ? (
                        <>
                          <strong>Daily Buzz</strong>
                          <span>{d.sentence}</span>
                        </>
                      ) : null}
                      {activity.id === "story" ? (
                        <>
                          <strong>Scene {d.storyScene + 1}</strong>
                          <span>{STORY.sentences[d.storyScene]?.text}</span>
                        </>
                      ) : null}
                      {activity.id === "verbs" ? (
                        <>
                          <strong>{verbSummary(d.verbIds)}</strong>
                          <span>{d.verbIds.length} verbs this week</span>
                        </>
                      ) : null}
                      {activity.id === "prepositions" ? (
                        <>
                          <strong>{d.prepIds.length} featured</strong>
                          <span>
                            {d.prepIds
                              .map((id) => PREPOSITIONS.find((p) => p.id === id)?.cloze)
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </>
                      ) : null}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <aside className="roster-editor card" aria-label="Edit day content">
          <div className="roster-editor-head">
            <div>
              <div className="eyebrow">Edit day</div>
              <h2 className="section-title">
                {dayLabel(selected.date)} · {selected.date}
              </h2>
            </div>
            <button type="button" className="mini-link" onClick={() => setSelectedDate(null)}>
              Close
            </button>
          </div>

          <label className="field">
            <span>Daily sound (Sound Lab + Daily Buzz)</span>
            <select
              value={selected.phonicsId}
              onChange={(e) => {
                const sound = PHONICS.find((s) => s.id === e.target.value);
                patchDay(selected.date, {
                  phonicsId: e.target.value,
                  sentence: sound?.sentence || selected.sentence,
                });
              }}
            >
              {PHONICS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.glyph} {s.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Daily Buzz sentence</span>
            <textarea rows={3} value={selected.sentence} onChange={(e) => patchDay(selected.date, { sentence: e.target.value })} />
          </label>

          <label className="field">
            <span>Story scene focus</span>
            <select value={selected.storyScene} onChange={(e) => patchDay(selected.date, { storyScene: Number(e.target.value) })}>
              {STORY.sentences.map((scene, i) => (
                <option key={i} value={i}>
                  Scene {i + 1}: {scene.text}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Weekly verbs (Act &amp; Say)</span>
            <div className="pick-grid roster-verb-picks">
              {VERB_POOL.map((v) => {
                const on = selected.verbIds.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`pick${on ? " on" : ""}`}
                    onClick={() => {
                      const next = on ? selected.verbIds.filter((id) => id !== v.id) : [...selected.verbIds, v.id].slice(0, 8);
                      patchDay(selected.date, { verbIds: next });
                    }}
                  >
                    {v.emoji} {v.word}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <span>Featured prepositions (Bee Maps)</span>
            <div className="pick-grid roster-prep-picks">
              {PREPOSITIONS.map((p) => {
                const on = selected.prepIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`pick${on ? " on" : ""}`}
                    onClick={() => {
                      const next = on ? selected.prepIds.filter((id) => id !== p.id) : [...selected.prepIds, p.id].slice(0, 6);
                      patchDay(selected.date, { prepIds: next });
                    }}
                  >
                    {p.answer}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="field">
            <span>Mentor note (internal)</span>
            <textarea
              rows={2}
              value={selected.note || ""}
              onChange={(e) => patchDay(selected.date, { note: e.target.value })}
              placeholder="Why you changed this day, pacing reminders, class links…"
            />
          </label>

          <div className="row-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                patchDay(selected.date, { ...defaultDayPlan(selected.date), manual: false });
              }}
            >
              Restore auto default
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
