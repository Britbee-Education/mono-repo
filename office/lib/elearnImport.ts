import { api } from "@/lib/api";

export type ImportClip = {
  id?: string;
  title?: string;
  line?: string;
  tip?: string;
  duration?: 30 | 60 | 90;
  topic?: string;
  videoUrl?: string;
  art?: string;
  bg?: string;
  guideName?: string;
  published?: boolean;
  moderationStatus?: "pending" | "approved" | "rejected";
  moderationNote?: string;
};

export function clipsFromImportJson(parsed: unknown): ImportClip[] {
  const clipsCandidate =
    Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed && "clips" in parsed
        ? (parsed as { clips?: unknown }).clips
        : undefined;
  return Array.isArray(clipsCandidate) ? (clipsCandidate as ImportClip[]) : [];
}

export async function importClipsJson(parsed: unknown) {
  const clips = clipsFromImportJson(parsed);
  if (!clips.length) throw new Error("No clips found in this JSON.");

  let created = 0;
  let moderated = 0;

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    if (!c.videoUrl || typeof c.videoUrl !== "string") continue;

    const createdRes = await api("/guide/learn", {
      method: "POST",
      body: JSON.stringify({
        title: typeof c.title === "string" ? c.title : `Imported Clip ${i + 1}`,
        line: typeof c.line === "string" ? c.line : "",
        tip: typeof c.tip === "string" ? c.tip : "",
        duration: typeof c.duration === "number" ? c.duration : 30,
        topic: typeof c.topic === "string" ? c.topic : "Speak",
        videoUrl: c.videoUrl,
        art: typeof c.art === "string" ? c.art : "bee",
        bg: typeof c.bg === "string" ? c.bg : "#1A2B5F",
        published: typeof c.published === "boolean" ? c.published : false,
      }),
    });

    const newId = typeof createdRes?.clip?.id === "string" ? createdRes.clip.id : "";
    if (!newId) continue;
    created += 1;

    const mod = c.moderationStatus;
    if (mod && (mod === "approved" || mod === "rejected" || mod === "pending")) {
      await api(`/guide/learn/${newId}/moderate`, {
        method: "POST",
        body: JSON.stringify({
          moderationStatus: mod,
          moderationNote: typeof c.moderationNote === "string" ? c.moderationNote : "",
          publish: mod === "approved",
        }),
      });
      moderated += 1;
    }
  }

  return { created, moderated };
}
