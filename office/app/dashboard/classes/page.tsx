"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Learner } from "@/lib/api";
import { formatWhen } from "@/lib/progress";
import { DataListToolbar } from "@/components/DataListToolbar";
import { BookClassPanel } from "@/components/BookClassPanel";
import { PageSkeleton } from "@/components/PageSkeleton";
import { downloadJson } from "@/lib/dataTools";
import { useDebouncedValue } from "@/lib/useDebounced";
import { toast } from "@/lib/toast";
import type { ClassKind } from "@/lib/classBook";

type ClassStatus = "scheduled" | "live" | "ended";
type ViewTab = "upcoming" | "archive";

type ClassRow = {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  durationMin: number;
  guideName: string;
  status: ClassStatus;
  classKind?: ClassKind;
  learnerCount?: number;
  roomUrl: string;
  joinUrl?: string;
  learnerIds: string[];
  endsAt?: string;
  liveAt?: string;
  endedAt?: string;
  joinedLearnerIds?: string[];
};

function statusLabel(s: ClassStatus) {
  if (s === "live") return "Live";
  if (s === "ended") return "Ended";
  return "Scheduled";
}

function whoLabel(c: ClassRow) {
  const kind = c.classKind || (c.learnerIds.length === 1 ? "individual" : "group");
  if (kind === "individual") return "1:1";
  if (c.learnerIds.length) return `${c.learnerIds.length} learners`;
  return "Whole hive";
}

function isToday(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function relativeStart(iso: string) {
  const diff = Date.parse(iso) - Date.now();
  if (Number.isNaN(diff)) return "";
  if (diff <= 0) return "Started";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `In ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `In ${hrs} hr${hrs === 1 ? "" : "s"}`;
  const days = Math.round(hrs / 24);
  return `In ${days} day${days === 1 ? "" : "s"}`;
}

export default function ClassesPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [view, setView] = useState<ViewTab>("upcoming");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 100);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showBook, setShowBook] = useState(false);
  const [bookPrefill, setBookPrefill] = useState<ClassRow | undefined>();
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [board, cls] = await Promise.all([api("/guide/board"), api("/guide/notify/classes")]);
    setLearners(board.learners || []);
    setClasses(cls.classes || []);
    setInitialLoad(false);
  }, []);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
    const t = setInterval(() => load().catch(() => undefined), 8_000);
    return () => clearInterval(t);
  }, [load]);

  const live = useMemo(() => classes.filter((c) => c.status === "live"), [classes]);
  const upcoming = useMemo(
    () =>
      classes
        .filter((c) => c.status === "scheduled")
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
    [classes]
  );
  const archive = useMemo(
    () =>
      classes
        .filter((c) => c.status === "ended")
        .sort((a, b) => Date.parse(b.endedAt || b.startsAt) - Date.parse(a.endedAt || a.startsAt)),
    [classes]
  );

  const endedToday = useMemo(
    () => archive.filter((c) => isToday(c.endedAt || c.startsAt)).length,
    [archive]
  );

  const filtered = useMemo(() => {
    const pool = view === "upcoming" ? [...live, ...upcoming] : archive;
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.guideName.toLowerCase().includes(q) ||
        whoLabel(c).toLowerCase().includes(q)
    );
  }, [view, live, upcoming, archive, debouncedQuery]);

  const liveVisible = useMemo(() => {
    if (view !== "upcoming") return [];
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return live;
    return live.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.guideName.toLowerCase().includes(q) ||
        whoLabel(c).toLowerCase().includes(q)
    );
  }, [view, live, debouncedQuery]);

  const nextClass = upcoming[0];

  function openBook(prefill?: ClassRow) {
    setBookPrefill(prefill);
    setShowBook(true);
  }

  async function goLive(id: string) {
    setError("");
    try {
      await api(`/guide/notify/classes/${id}/live`, { method: "POST", body: JSON.stringify({}) });
      toast("Class is live — kids can tap Join.", "success");
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start class.";
      setError(msg);
      toast(msg, "error");
    }
  }

  async function endClass(id: string) {
    setError("");
    try {
      await api(`/guide/notify/classes/${id}/end`, { method: "POST", body: JSON.stringify({}) });
      toast("Class ended.", "success");
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not end class.";
      setError(msg);
      toast(msg, "error");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this class from the schedule?")) return;
    setError("");
    try {
      await api(`/guide/notify/classes/${id}`, { method: "DELETE" });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete class.");
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast("Room link copied.", "success");
    } catch {
      toast("Could not copy link.", "error");
    }
  }

  if (initialLoad) return <PageSkeleton rows={4} />;

  function ClassActions({ c }: { c: ClassRow }) {
    const url = c.joinUrl || c.roomUrl;
    return (
      <div className="row-actions class-row-actions">
        {c.status !== "ended" ? (
          <>
            <a className="mini-link" href={url} target="_blank" rel="noreferrer">
              Join
            </a>
            <button type="button" className="mini-link" onClick={() => void copyLink(url)}>
              Copy link
            </button>
          </>
        ) : null}
        {c.status === "scheduled" ? (
          <button type="button" className="mini-link" onClick={() => void goLive(c.id)}>
            Start now
          </button>
        ) : null}
        {c.status === "live" ? (
          <button type="button" className="mini-link" onClick={() => void endClass(c.id)}>
            End
          </button>
        ) : null}
        {c.status === "ended" ? (
          <button type="button" className="mini-link" onClick={() => openBook(c)}>
            Rebook
          </button>
        ) : null}
        <button type="button" className="mini-link" onClick={() => void remove(c.id)}>
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="page wide">
      <div className="page-head class-page-head">
        <div>
          <h1 className="hello">Live classes</h1>
          {nextClass ? (
            <p className="section-sub">
              Next up {relativeStart(nextClass.startsAt)} · {formatWhen(nextClass.startsAt)}
            </p>
          ) : (
            <p className="section-sub">Upcoming sessions and class archive.</p>
          )}
        </div>
        <button type="button" className="btn btn-yellow class-book-btn" onClick={() => openBook()}>
          Book class
        </button>
      </div>

      <div className="page-kpis">
        <div className="kpi">
          <b>{live.length}</b>
          <span>Live now</span>
        </div>
        <div className="kpi">
          <b>{upcoming.length}</b>
          <span>Upcoming</span>
        </div>
        <div className="kpi">
          <b>{endedToday}</b>
          <span>Ended today</span>
        </div>
        <div className="kpi">
          <b>{archive.length}</b>
          <span>In archive</span>
        </div>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <DataListToolbar
        label={`${classes.length} class${classes.length === 1 ? "" : "es"} on record`}
        onExport={async () => {
          const data = await api("/guide/notify/classes");
          downloadJson(`britbee-classes-${Date.now()}.json`, data);
          toast("Classes export downloaded.", "success");
        }}
      />

      {liveVisible.length ? (
        <section className="section-block">
          <div className="section-head">
            <h2 className="section-title">Live now</h2>
          </div>
          <div className="class-live-stack">
            {liveVisible.map((c) => (
              <article key={c.id} className="class-card class-card-live">
                <div className="class-card-main">
                  <div className="class-card-top">
                    <span className="class-pill class-pill-live">Live</span>
                    <span className="class-meta">{c.durationMin} min · {whoLabel(c)}</span>
                  </div>
                  <h3 className="class-card-title">{c.title}</h3>
                  <p className="class-card-sub">{c.guideName}</p>
                </div>
                <div className="class-card-side">
                  <a className="btn btn-yellow" href={c.joinUrl || c.roomUrl} target="_blank" rel="noreferrer">
                    Join as mentor
                  </a>
                  <ClassActions c={c} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="class-toolbar">
        <div className="tabs">
          <button type="button" className={view === "upcoming" ? "tab on" : "tab"} onClick={() => setView("upcoming")}>
            Upcoming ({live.length + upcoming.length})
          </button>
          <button type="button" className={view === "archive" ? "tab on" : "tab"} onClick={() => setView("archive")}>
            Archive ({archive.length})
          </button>
        </div>
        <input
          className="text-input class-search"
          placeholder="Search class, mentor, audience…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {view === "upcoming" ? (
        <section className="section-block">
          <div className="section-head">
            <h2 className="section-title">Upcoming</h2>
            {!filtered.length ? (
              <button type="button" className="mini-link" onClick={() => openBook()}>
                Book first class
              </button>
            ) : null}
          </div>
          {filtered.length ? (
            <div className="class-list">
              {filtered
                .filter((c) => c.status !== "live")
                .map((c) => (
                  <article key={c.id} className="class-card">
                    <div className="class-card-main">
                      <div className="class-card-top">
                        <span className="class-pill">{statusLabel(c.status)}</span>
                        <span className="class-meta">{relativeStart(c.startsAt)}</span>
                      </div>
                      <h3 className="class-card-title">{c.title}</h3>
                      <p className="class-card-sub">
                        {formatWhen(c.startsAt)} · {c.durationMin} min · {whoLabel(c)} · {c.guideName}
                      </p>
                      {c.body ? <p className="class-card-note">{c.body}</p> : null}
                    </div>
                    <ClassActions c={c} />
                  </article>
                ))}
            </div>
          ) : (
            <div className="card class-empty">
              <b>No upcoming classes</b>
              <p className="hint">Book a session when you need one — the form stays out of the way until then.</p>
              <button type="button" className="btn btn-yellow" style={{ maxWidth: 180, marginTop: 12 }} onClick={() => openBook()}>
                Book class
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="section-block">
          <div className="section-head">
            <h2 className="section-title">Archive</h2>
            <span className="section-sub">Ended classes · rebook or delete</span>
          </div>
          {filtered.length ? (
            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>When</th>
                    <th>Length</th>
                    <th>Who</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b>{c.title}</b>
                        <div className="mini">{c.guideName}</div>
                      </td>
                      <td>{formatWhen(c.endedAt || c.startsAt)}</td>
                      <td>{c.durationMin} min</td>
                      <td>{whoLabel(c)}</td>
                      <td>{c.joinedLearnerIds?.length ? `${c.joinedLearnerIds.length} joined` : "—"}</td>
                      <td>
                        <ClassActions c={c} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card class-empty">
              <b>No archived classes</b>
              <p className="hint">Finished sessions appear here for reference and rebooking.</p>
            </div>
          )}
        </section>
      )}

      <BookClassPanel
        open={showBook}
        learners={learners}
        prefill={bookPrefill}
        onClose={() => {
          setShowBook(false);
          setBookPrefill(undefined);
        }}
        onBooked={(msg) => {
          toast(msg, "success");
          setView("upcoming");
          void load();
        }}
        onError={(msg) => {
          setError(msg);
          toast(msg, "error");
        }}
      />
    </div>
  );
}
