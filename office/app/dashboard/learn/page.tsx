"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { DataListToolbar } from "@/components/DataListToolbar";
import { ElearnBulkPanel } from "@/components/ElearnBulkPanel";
import { downloadJson, readJsonFile } from "@/lib/dataTools";
import { importClipsJson } from "@/lib/elearnImport";

type ClipRow = {
  id: string;
  title: string;
  line: string;
  tip: string;
  duration: 30 | 60 | 90;
  topic: string;
  videoUrl: string;
  art: string;
  bg: string;
  guideName: string;
  published: boolean;
  moderationStatus?: "pending" | "approved" | "rejected";
  moderationNote?: string;
  createdAt: string;
};

const TOPICS = ["Sounds", "Speak", "Story", "Act", "Maps", "Words", "Manners"];
const DURATIONS = [30, 60, 90];

function statusOf(c: ClipRow) {
  return c.moderationStatus || "approved";
}

function libraryLabel(c: ClipRow) {
  if (statusOf(c) === "rejected") return "Rejected";
  if (statusOf(c) === "pending") return "Pending";
  return c.published ? "Live" : "Draft";
}

export default function LearnPage() {
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "draft" | "pending" | "rejected">("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [line, setLine] = useState("");
  const [tip, setTip] = useState("");
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState("Speak");
  const [videoUrl, setVideoUrl] = useState("");
  const [art, setArt] = useState("bee");
  const [bg, setBg] = useState("#1A2B5F");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState<ClipRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const load = useCallback(async () => {
    const data = await api("/guide/learn");
    setClips(data.clips || []);
  }, []);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  const detail = useMemo(() => clips.find((c) => c.id === detailId) || null, [clips, detailId]);

  useEffect(() => {
    setEdit(detail);
  }, [detail]);

  const pendingCount = clips.filter((c) => statusOf(c) === "pending").length;
  const liveCount = clips.filter((c) => c.published && statusOf(c) === "approved").length;
  const draftCount = clips.filter((c) => !c.published && statusOf(c) !== "rejected").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clips.filter((c) => {
      if (topicFilter !== "All" && c.topic !== topicFilter) return false;
      const st = statusOf(c);
      if (statusFilter === "live" && !(c.published && st === "approved")) return false;
      if (statusFilter === "draft" && (c.published || st === "rejected")) return false;
      if (statusFilter === "pending" && st !== "pending") return false;
      if (statusFilter === "rejected" && st !== "rejected") return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.line.toLowerCase().includes(q) ||
        c.topic.toLowerCase().includes(q) ||
        c.guideName.toLowerCase().includes(q)
      );
    });
  }, [clips, query, topicFilter, statusFilter]);

  const canSubmit = useMemo(() => Boolean(title.trim() && line.trim() && (videoUrl.trim() || videoFile)), [title, line, videoUrl, videoFile]);

  async function uploadSelectedVideo() {
    if (!videoFile) return "";
    const form = new FormData();
    form.append("video", videoFile);
    const data = await api("/guide/learn/upload", { method: "POST", body: form });
    const url = typeof data.videoUrl === "string" ? data.videoUrl : "";
    if (!url) throw new Error("Upload finished but no video URL was returned.");
    return url;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let finalUrl = videoUrl.trim();
      if (!finalUrl && videoFile) {
        setUploading(true);
        finalUrl = await uploadSelectedVideo();
      }
      await api("/guide/learn", {
        method: "POST",
        body: JSON.stringify({ title, line, tip, duration, topic, videoUrl: finalUrl, art, bg, published: false }),
      });
      setTitle("");
      setLine("");
      setTip("");
      setVideoUrl("");
      setArt("bee");
      setBg("#1A2B5F");
      setVideoFile(null);
      setShowAdd(false);
      setNote("Clip saved as draft.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not post clip.");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  async function toggle(clip: ClipRow) {
    setError("");
    try {
      await api(`/guide/learn/${clip.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !clip.published }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update clip.");
    }
  }

  async function moderate(clip: ClipRow, moderationStatus: "approved" | "rejected") {
    setError("");
    try {
      await api(`/guide/learn/${clip.id}/moderate`, {
        method: "POST",
        body: JSON.stringify({ moderationStatus, publish: moderationStatus === "approved" }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not moderate clip.");
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setError("");
    try {
      await api(`/guide/learn/${edit.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: edit.title,
          line: edit.line,
          tip: edit.tip,
          duration: edit.duration,
          topic: edit.topic,
          videoUrl: edit.videoUrl,
          art: edit.art,
          bg: edit.bg,
        }),
      });
      setNote("Metadata updated.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save metadata.");
    }
  }

  async function replaceVideo(file: File) {
    if (!edit) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("video", file);
      const data = await api("/guide/learn/upload", { method: "POST", body: form });
      const url = typeof data.videoUrl === "string" ? data.videoUrl : "";
      if (!url) throw new Error("Upload failed.");
      await api(`/guide/learn/${edit.id}`, {
        method: "PATCH",
        body: JSON.stringify({ videoUrl: url }),
      });
      setNote("Video updated.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not replace video.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this clip from the library?")) return;
    setError("");
    try {
      await api(`/guide/learn/${id}`, { method: "DELETE" });
      if (detailId === id) setDetailId(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete clip.");
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function moderateMany(moderationStatus: "approved" | "rejected") {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    setError("");
    try {
      for (const id of selectedIds) {
        await api(`/guide/learn/${id}/moderate`, {
          method: "POST",
          body: JSON.stringify({ moderationStatus, publish: moderationStatus === "approved" }),
        });
      }
      const count = selectedIds.length;
      setSelectedIds([]);
      await load();
      setNote(`Updated ${count} clip${count === 1 ? "" : "s"}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="page wide elearn-page">
      <div className="page-head class-page-head">
        <div>
          <h1 className="hello">E-Learn</h1>
          <p className="section-sub">Content library — browse, publish, and manage learning clips.</p>
        </div>
        <button type="button" className="btn btn-yellow class-book-btn" onClick={() => setShowAdd(true)}>
          Upload clip
        </button>
      </div>

      <div className="elearn-studio-banner" aria-label="AI Content Studio — exclusive feature">
        <div className="elearn-studio-banner-glow" aria-hidden />
        <div className="elearn-studio-banner-inner">
          <div className="elearn-studio-lock-ring" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <div className="elearn-studio-copy">
            <span className="elearn-exclusive-pill">Exclusive</span>
            <h2 className="elearn-studio-title">AI Content Studio</h2>
            <p className="elearn-studio-lead">
              Generate curriculum-ready clips with AI — scripts, visuals, and kid-friendly pacing in one flow.
            </p>
          </div>
          <div className="elearn-studio-cta">
            <button type="button" className="btn elearn-studio-btn" disabled>
              Locked · Coming soon
            </button>
            <p className="elearn-studio-note">Available on mentor Pro. Manual uploads work today.</p>
          </div>
        </div>
      </div>

      <div className="page-kpis">
        <div className="kpi">
          <b>{clips.length}</b>
          <span>In library</span>
        </div>
        <div className="kpi">
          <b>{liveCount}</b>
          <span>Live</span>
        </div>
        <div className="kpi">
          <b>{draftCount}</b>
          <span>Drafts</span>
        </div>
        <div className="kpi">
          <b>{pendingCount}</b>
          <span>Pending review</span>
        </div>
      </div>

      {error ? <div className="error-box">{error}</div> : null}
      {note ? <p className="hint class-note-ok">{note}</p> : null}

      <DataListToolbar
        label={`${filtered.length} clip${filtered.length === 1 ? "" : "s"} in view`}
        onExport={async () => {
          const data = await api("/guide/learn");
          downloadJson(`britbee-e-learn-clips-${Date.now()}.json`, data);
          setNote("E‑Learn export downloaded.");
        }}
        onImport={async (file) => {
          const parsed = await readJsonFile(file);
          const { created, moderated } = await importClipsJson(parsed);
          setNote(`Imported ${created} clips. Restored moderation on ${moderated}.`);
          await load();
        }}
        extra={
          <button type="button" className="btn btn-outline data-list-btn" onClick={() => setShowBulk(true)}>
            Bulk upload
          </button>
        }
      />

      <div className="elearn-toolbar">
        <input
          className="text-input class-search"
          placeholder="Search title, line, topic, mentor…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="tabs elearn-status-tabs">
          {(["all", "live", "draft", "pending", "rejected"] as const).map((s) => (
            <button key={s} type="button" className={`tab ${statusFilter === s ? "on" : ""}`} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="elearn-topic-row">
        {["All", ...TOPICS].map((t) => (
          <button
            key={t}
            type="button"
            className={`elearn-topic-chip ${topicFilter === t ? "on" : ""}`}
            onClick={() => setTopicFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {selectedIds.length ? (
        <div className="card elearn-bulk-bar">
          <span className="mini">Selected {selectedIds.length}</span>
          <div className="row-actions">
            <button type="button" className="mini-link" disabled={bulkBusy} onClick={() => void moderateMany("approved")}>
              Approve
            </button>
            <button type="button" className="mini-link" disabled={bulkBusy} onClick={() => void moderateMany("rejected")}>
              Reject
            </button>
            <button type="button" className="mini-link" disabled={bulkBusy} onClick={() => setSelectedIds([])}>
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {filtered.length ? (
        <div className="elearn-library-grid">
          {filtered.map((c) => {
            const label = libraryLabel(c);
            const selected = selectedIds.includes(c.id);
            return (
              <article
                key={c.id}
                className={`elearn-clip-card ${detailId === c.id ? "on" : ""}`}
                style={{ ["--clip-bg" as string]: c.bg || "#1A2B5F" }}
              >
                <button type="button" className="elearn-clip-cover" onClick={() => setDetailId(c.id)}>
                  <span className="elearn-clip-art">{c.art}</span>
                  <span className="elearn-clip-duration">{c.duration}s</span>
                  {c.videoUrl ? <span className="elearn-clip-play">▶</span> : null}
                </button>
                <div className="elearn-clip-body">
                  <div className="elearn-clip-top">
                    <span className={`elearn-clip-status elearn-clip-status-${label.toLowerCase()}`}>{label}</span>
                    <span className="elearn-clip-topic">{c.topic}</span>
                  </div>
                  <h3 className="elearn-clip-title">{c.title}</h3>
                  <p className="elearn-clip-line">{c.line}</p>
                  <div className="elearn-clip-foot">
                    <span className="mini">{c.guideName}</span>
                    <label className="elearn-clip-check">
                      <input type="checkbox" checked={selected} onChange={() => toggleSelected(c.id)} aria-label={`Select ${c.title}`} />
                    </label>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card class-empty">
          <b>No clips in this view</b>
          <p className="hint">Try another filter, or upload your first learning bite.</p>
          <button type="button" className="btn btn-yellow" style={{ maxWidth: 180, marginTop: 12 }} onClick={() => setShowAdd(true)}>
            Upload clip
          </button>
        </div>
      )}

      {detail && edit ? (
        <div className="sidepanel-backdrop" onClick={() => setDetailId(null)} role="dialog" aria-modal="true">
          <aside className="sidepanel elearn-detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sidepanel-head">
              <span className="sidepanel-title">{detail.title}</span>
              <button type="button" className="mini-link" onClick={() => setDetailId(null)}>
                Close
              </button>
            </div>
            <div className="sidepanel-body">
              <div className="elearn-detail-cover" style={{ background: detail.bg }}>
                <span className="elearn-clip-art">{detail.art}</span>
              </div>
              {detail.videoUrl ? (
                <video
                  key={detail.id}
                  src={detail.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="elearn-detail-video"
                />
              ) : (
                <p className="hint">No video attached yet.</p>
              )}
              <div className="elearn-detail-meta">
                <span className={`elearn-clip-status elearn-clip-status-${libraryLabel(detail).toLowerCase()}`}>
                  {libraryLabel(detail)}
                </span>
                <span className="mini">
                  {detail.topic} · {detail.duration}s · {statusOf(detail)}
                </span>
              </div>
              <div className="row-actions elearn-detail-actions">
                <button type="button" className="mini-link" onClick={() => void moderate(detail, "approved")}>
                  Approve
                </button>
                <button type="button" className="mini-link" onClick={() => void moderate(detail, "rejected")}>
                  Reject
                </button>
                <button type="button" className="mini-link" onClick={() => void toggle(detail)}>
                  {detail.published ? "Unpublish" : "Publish"}
                </button>
                {detail.videoUrl ? (
                  <a className="mini-link" href={detail.videoUrl} target="_blank" rel="noreferrer">
                    Open video
                  </a>
                ) : null}
                <button type="button" className="mini-link" onClick={() => void remove(detail.id)}>
                  Delete
                </button>
              </div>
              <form className="coach-form elearn-edit-form" onSubmit={(e) => { e.preventDefault(); void saveEdit(); }}>
                <h3 className="section-title">Edit clip</h3>
                <div className="coach-grid">
                  <label className="field">
                    <span>Title</span>
                    <input className="text-input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Topic</span>
                    <select value={edit.topic} onChange={(e) => setEdit({ ...edit, topic: e.target.value })}>
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Length</span>
                    <select value={edit.duration} onChange={(e) => setEdit({ ...edit, duration: Number(e.target.value) as 30 | 60 | 90 })}>
                      {DURATIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}s
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Line</span>
                  <input className="text-input" value={edit.line} onChange={(e) => setEdit({ ...edit, line: e.target.value })} />
                </label>
                <label className="field">
                  <span>Tip</span>
                  <input className="text-input" value={edit.tip} onChange={(e) => setEdit({ ...edit, tip: e.target.value })} />
                </label>
                <div className="coach-grid">
                  <label className="field">
                    <span>Picture word</span>
                    <input className="text-input" value={edit.art} onChange={(e) => setEdit({ ...edit, art: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Card color</span>
                    <input className="text-input" value={edit.bg} onChange={(e) => setEdit({ ...edit, bg: e.target.value })} />
                  </label>
                </div>
                <div className="row-actions">
                  <button type="submit" className="btn btn-yellow" style={{ maxWidth: 160 }}>
                    Save
                  </button>
                  <label className="mini-link" style={{ cursor: "pointer" }}>
                    Replace video
                    <input
                      type="file"
                      accept="video/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void replaceVideo(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {uploading ? <span className="mini">Uploading…</span> : null}
                </div>
              </form>
            </div>
          </aside>
        </div>
      ) : null}

      {showAdd ? (
        <div className="sidepanel-backdrop" onClick={() => setShowAdd(false)} role="dialog" aria-modal="true">
          <aside className="sidepanel" onClick={(e) => e.stopPropagation()}>
            <div className="sidepanel-head">
              <span className="sidepanel-title">Upload clip</span>
              <button type="button" className="mini-link" onClick={() => setShowAdd(false)}>
                Close
              </button>
            </div>
            <div className="sidepanel-body">
              <form className="card coach-form class-book-form" onSubmit={create}>
                <div className="coach-grid">
                  <label className="field">
                    <span>Title</span>
                    <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Say hello" required />
                  </label>
                  <label className="field">
                    <span>Length</span>
                    <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                      {DURATIONS.map((n) => (
                        <option key={n} value={n}>
                          {n} seconds
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Topic</span>
                    <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>English line</span>
                  <input className="text-input" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Hello, how are you?" required />
                </label>
                <label className="field">
                  <span>Kid tip (optional)</span>
                  <input className="text-input" value={tip} onChange={(e) => setTip(e.target.value)} placeholder="Use this when you meet a friend." />
                </label>
                <div className="coach-grid">
                  <label className="field">
                    <span>Video file</span>
                    <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                  </label>
                  <label className="field">
                    <span>Video URL</span>
                    <input className="text-input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
                  </label>
                  <label className="field">
                    <span>Picture word</span>
                    <input className="text-input" value={art} onChange={(e) => setArt(e.target.value)} placeholder="bee, cat…" />
                  </label>
                  <label className="field">
                    <span>Card color</span>
                    <input className="text-input" value={bg} onChange={(e) => setBg(e.target.value)} placeholder="#1A2B5F" />
                  </label>
                </div>
                <button className="btn btn-yellow" disabled={!canSubmit || saving || uploading} style={{ maxWidth: 240, marginTop: 14 }}>
                  {saving || uploading ? "Saving…" : "Save draft"}
                </button>
                {!canSubmit ? <p className="hint">Title, line, and a video file or URL required.</p> : null}
              </form>
            </div>
          </aside>
        </div>
      ) : null}

      <ElearnBulkPanel
        open={showBulk}
        onClose={() => setShowBulk(false)}
        onDone={(msg) => {
          setNote(msg);
          void load();
        }}
        onError={(msg) => setError(msg)}
      />
    </div>
  );
}
