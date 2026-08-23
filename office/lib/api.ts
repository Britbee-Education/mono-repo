import type { ActivityId, CoachStatus } from "./activities";
import type { AppSnapshot } from "./progress";

export type GuideUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  hasPassword?: boolean;
};

export type Learner = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  child?: {
    childName?: string;
    dateOfBirth?: string;
    level?: "beginner" | "intermediate" | "advanced";
    goal?: string;
  };
  childLabel?: string;
  lastNote?: string | null;
  lastNoteAt?: string | null;
  progress?: AppSnapshot | null;
  syncedAt?: string | null;
  activities?: Partial<
    Record<
      ActivityId,
      {
        learnerId: string;
        activityId: ActivityId;
        status?: CoachStatus;
        focusItem?: string;
        coachNote?: string;
        updatedAt?: string;
        guideName?: string;
      } | null
    >
  >;
};

export type GuideNote = {
  id: string;
  learnerId: string;
  guideId: string;
  guideName: string;
  text: string;
  createdAt: string;
  activityId?: string;
};

export type ActivityEvent = {
  id: string;
  learnerId: string;
  activityId: ActivityId;
  kind: "status" | "focus" | "note";
  text: string;
  createdAt: string;
  guideName: string;
};

export type MentorChatMessage = {
  id: string;
  learnerId: string;
  text: string;
  from: "learner" | "mentor";
  createdAt: string;
  mentorId?: string;
  mentorName?: string;
  kind?: "text" | "sticker" | "material" | "voice" | "attachment";
  stickerId?: string;
  stickerUrl?: string;
  packageId?: number;
  materialId?: string;
  voiceSec?: number;
  voiceUrl?: string;
  voiceText?: string;
  attachmentKind?: "photo" | "video" | "document";
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
};

export type CommonChatMessage = MentorChatMessage & {
  name?: string;
  hue?: number;
};

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const TOKEN_KEY = "britbee_office_token";
export const USER_KEY = "britbee_office_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): GuideUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuideUser;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: GuideUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data;
}

export async function api(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isFormData) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return parse(
    await fetch(`${API}${path}`, {
      ...init,
      headers,
    })
  );
}
