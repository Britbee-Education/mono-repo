"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ACTIVITY_CATALOG, type ActivityId } from "@/lib/activities";
import { DataListToolbar } from "@/components/DataListToolbar";
import { downloadJson } from "@/lib/dataTools";

type MentorRoom = {
  id: string;
  title: string;
  activityId: string;
  activityName: string;
  prompt: string;
  mentorName: string;
  publishedAt: string;
  expiresAt: string;
  endedAt?: string;
  status: "active" | "ended" | "expired";
  playRoomId: string;
  canEnter: boolean;
};

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MentorRoomsPage() {
  const [rooms, setRooms] = useState<MentorRoom[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activityId, setActivityId] = useState(ACTIVITY_CATALOG[1]?.id || "sentence");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [durationMin, setDurationMin] = useState("90");

  async function load() {
    const data = await api("/guide/social/rooms");
    setRooms((data.rooms || []) as MentorRoom[]);
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, []);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const activity = ACTIVITY_CATALOG.find((a) => a.id === activityId);
      const data = await api("/guide/social/rooms", {
        method: "POST",
        body: JSON.stringify({
          title,
          prompt,
          activityId,
          activityName: activity?.name || activityId,
          durationMin: Number(durationMin) || 90,
        }),
      });
      setRooms((data.rooms || []) as MentorRoom[]);
      setTitle("");
      setPrompt("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not publish room.");
    } finally {
      setSaving(false);
    }
  }

  async function endRoom(id: string) {
    setError("");
    try {
      const data = await api(`/guide/social/rooms/${id}/end`, { method: "POST", body: JSON.stringify({}) });
      setRooms((data.rooms || []) as MentorRoom[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not end room.");
    }
  }

  const live = rooms.filter((r) => r.canEnter);
  const past = rooms.filter((r) => !r.canEnter);

  return (
    <div className="page wide">
      <div className="page-head">
        <h1 className="hello">Social rooms</h1>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <DataListToolbar
        label={`${rooms.length} room${rooms.length === 1 ? "" : "s"}`}
        onExport={async () => {
          const data = await api("/guide/social/rooms");
          downloadJson(`britbee-rooms-${Date.now()}.json`, data);
        }}
      />

      <form className="card form-card" onSubmit={(e) => void publish(e)}>
        <h2 className="section-title">Publish a room</h2>
        <label className="field">
          <span>Activity</span>
          <select value={activityId} onChange={(e) => setActivityId(e.target.value as ActivityId)}>
            {ACTIVITY_CATALOG.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Room title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Friday speaking circle" required />
        </label>
        <label className="field">
          <span>Activity notes / prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="What should kids do in this room?"
            required
          />
        </label>
        <label className="field">
          <span>Open for (minutes)</span>
          <input value={durationMin} onChange={(e) => setDurationMin(e.target.value)} type="number" min={15} max={1440} />
        </label>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? "Publishing…" : "Publish room"}
        </button>
      </form>

      <section className="section-block">
        <div className="section-head">
          <h2 className="section-title">Live · {live.length}</h2>
        </div>
        {!live.length ? <p className="hint">No live rooms.</p> : null}
        {live.map((room) => (
          <div key={room.id} className="slot" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <h3>{room.activityName}</h3>
              <p>{room.title}</p>
              <p style={{ marginTop: 6 }}>{room.prompt}</p>
              <p className="hint" style={{ marginTop: 6 }}>
                Expires {when(room.expiresAt)} · by {room.mentorName}
              </p>
            </div>
            <button type="button" className="btn ghost" onClick={() => void endRoom(room.id)}>
              End now
            </button>
          </div>
        ))}
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2 className="section-title">Past · {past.length}</h2>
        </div>
        {!past.length ? <p className="hint">No past rooms yet.</p> : null}
        {past.map((room) => (
          <div key={room.id} className="slot" style={{ marginBottom: 8, opacity: 0.85 }}>
            <div style={{ flex: 1 }}>
              <h3>{room.activityName}</h3>
              <p>{room.title}</p>
              <p style={{ marginTop: 6 }}>{room.prompt}</p>
              <p className="hint" style={{ marginTop: 6 }}>
                {room.status === "ended" ? `Ended ${when(room.endedAt || room.expiresAt)}` : `Expired ${when(room.expiresAt)}`}
              </p>
            </div>
            <span className="chip">{room.status}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
