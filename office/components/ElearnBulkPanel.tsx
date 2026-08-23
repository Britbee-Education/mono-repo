"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
};

export function ElearnBulkPanel({ open, onClose, onDone, onError }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [titlePrefix, setTitlePrefix] = useState("E‑Learn Clip");
  const [line, setLine] = useState("");
  const [tip, setTip] = useState("");
  const [duration, setDuration] = useState<30 | 60 | 90>(30);
  const [topic, setTopic] = useState("Speak");
  const [art, setArt] = useState("bee");
  const [bg, setBg] = useState("#1A2B5F");
  const [publishOnCreate, setPublishOnCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const canSubmit = useMemo(
    () => files.length > 0 && line.trim() && titlePrefix.trim() && tip.trim(),
    [files.length, line, titlePrefix, tip]
  );

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setProgress({ done: 0, total: files.length });
      let done = 0;
      for (let i = 0; i < files.length; i++) {
        const form = new FormData();
        form.append("video", files[i]);
        const up = await api("/guide/learn/upload", { method: "POST", body: form });
        const videoUrl = typeof up.videoUrl === "string" ? up.videoUrl : "";
        if (!videoUrl) throw new Error(`Upload failed for file #${i + 1}.`);
        await api("/guide/learn", {
          method: "POST",
          body: JSON.stringify({
            title: `${titlePrefix.trim()} ${i + 1}`,
            line,
            tip,
            duration,
            topic,
            videoUrl,
            art,
            bg,
            published: publishOnCreate,
          }),
        });
        done += 1;
        setProgress({ done, total: files.length });
      }
      onDone(`Uploaded ${done} clip${done === 1 ? "" : "s"}.`);
      setFiles([]);
      onClose();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Bulk upload failed.");
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0 });
    }
  }

  return (
    <div className="sidepanel-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="sidepanel" onClick={(e) => e.stopPropagation()}>
        <div className="sidepanel-head">
          <span className="sidepanel-title">Bulk upload · field mapping</span>
          <button type="button" className="mini-link" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sidepanel-body">
          <form className="card coach-form class-book-form" onSubmit={submit}>
            <p className="hint">Map the same metadata to every video file you pick.</p>
            <label className="field">
              <span>Video files</span>
              <input type="file" accept="video/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </label>
            <div className="coach-grid">
              <label className="field">
                <span>Topic</span>
                <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                  {["Sounds", "Speak", "Story", "Act", "Maps", "Words", "Manners"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Duration</span>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value) as 30 | 60 | 90)}>
                  {[30, 60, 90].map((n) => (
                    <option key={n} value={n}>
                      {n}s
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Title prefix</span>
              <input className="text-input" value={titlePrefix} onChange={(e) => setTitlePrefix(e.target.value)} />
            </label>
            <label className="field">
              <span>Kid line</span>
              <input className="text-input" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Hello, how are you?" />
            </label>
            <label className="field">
              <span>Kid tip</span>
              <input className="text-input" value={tip} onChange={(e) => setTip(e.target.value)} />
            </label>
            <div className="coach-grid">
              <label className="field">
                <span>Picture word</span>
                <input className="text-input" value={art} onChange={(e) => setArt(e.target.value)} />
              </label>
              <label className="field">
                <span>Card color</span>
                <input className="text-input" value={bg} onChange={(e) => setBg(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Publish on create</span>
              <select value={publishOnCreate ? "yes" : "no"} onChange={(e) => setPublishOnCreate(e.target.value === "yes")}>
                <option value="no">No (draft)</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            {progress.total ? (
              <p className="hint">
                Uploading {progress.done}/{progress.total}
              </p>
            ) : null}
            <button className="btn btn-yellow" disabled={busy || !canSubmit} type="submit" style={{ maxWidth: 280, marginTop: 14 }}>
              {busy ? "Working…" : `Upload ${files.length || 0} clips`}
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
