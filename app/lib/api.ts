import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_URL } from "@/constants/theme";

const TOKEN_KEY = "britbee_token";

async function storageGet(key: string) {
  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string) {
  if (Platform.OS === "web") {
    localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  hasPassword?: boolean;
  child?: {
    childName?: string;
    dateOfBirth?: string;
    level?: string;
    goal?: string;
    avatar?: import("@britbee/shared").BeeLook;
  };
  // Parents may have multiple children; the API still exposes `child` as the active child.
  children?: {
    childName?: string;
    dateOfBirth?: string;
    level?: "beginner" | "intermediate" | "advanced";
    goal?: string;
    avatar?: import("@britbee/shared").BeeLook;
  }[];
  activeChildIndex?: number;
  parentSettings?: {
    paused?: boolean;
    planId?: "trial" | "monthly" | "yearly";
    planSince?: string;
    subscriptionStatus?: string;
    renewsAt?: string;
    cancelAtPeriodEnd?: boolean;
  };
};

export type ChildProfile = {
  childName?: string;
  dateOfBirth?: string;
  level?: "beginner" | "intermediate" | "advanced";
  goal?: string;
  avatar?: import("@britbee/shared").BeeLook;
};

export type OtpPurpose = "signup" | "reset";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : data.message || "Request failed";
    throw new ApiError(message, res.status, typeof data.code === "string" ? data.code : undefined);
  }
  return data as T;
}

export type HiveBee = {
  id: string;
  name: string;
  ghost: boolean;
  points: number;
  streak: number;
  dailyDone: boolean;
  buzzing: boolean;
  place: number;
  level: number;
  title: string;
  hue: number;
  look?: import("@britbee/shared").BeeLook;
};

export type HiveFeedItem = {
  id: string;
  learnerId: string;
  name: string;
  text: string;
  activityId?: string;
  href?: string;
  createdAt: string;
};

export type HivePayload = {
  day: string;
  me: HiveBee;
  board: HiveBee[];
  race: {
    activityId: string;
    title: string;
    href: string;
    done: number;
    total: number;
    youDone: boolean;
    guideName: string;
  };
  mentor: {
    activityId: string;
    title: string;
    href: string;
    guideName: string;
    focusItem: string;
  } | null;
  dare: {
    id: string;
    activityId: string;
    title: string;
    href: string;
    otherName: string;
    fromMe: boolean;
    iDone: boolean;
    theyDone: boolean;
    both: boolean;
  } | null;
  rival: {
    id: string;
    name: string;
    hue: number;
    delta: number;
    place: number;
    direction: "ahead" | "behind";
  } | null;
  feed: HiveFeedItem[];
  dareTargets: { id: string; name: string; hue: number; ghost: boolean; look?: import("@britbee/shared").BeeLook }[];
  canDare: boolean;
  buzzingNow: number;
  rooms?: Record<
    string,
    {
      done: number;
      total: number;
      live: { id: string; name: string; hue: number; look?: import("@britbee/shared").BeeLook }[];
      winners: { id: string; name: string; hue: number; look?: import("@britbee/shared").BeeLook }[];
    }
  >;
};

export type SocialPlayer = {
  id: string;
  name: string;
  hue: number;
  look?: import("@britbee/shared").BeeLook;
  done: boolean;
  answer?: string;
  awarded: number;
};

export type SocialRoom = {
  id: string;
  kind: "circle" | "battle" | "race";
  title: string;
  prompt: string;
  hostId: string;
  hostName: string;
  status: "open" | "live" | "done";
  players: SocialPlayer[];
  winnerId?: string;
  winnerName?: string;
  targetId?: string;
  createdAt: string;
};

export type SocialChat = {
  id: string;
  learnerId: string;
  name: string;
  hue: number;
  look?: import("@britbee/shared").BeeLook;
  text: string;
  createdAt: string;
  from?: "learner" | "mentor";
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

export type SocialVibeEvent = {
  id: string;
  vibe: "popper" | "celebrate" | "clap" | "fire" | "heart" | "bee";
  learnerId: string;
  name: string;
  hue: number;
  at: string;
  stickerId?: string;
  stickerUrl?: string;
  packageId?: number;
};

export type MentorPublishedRoom = {
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

export type SocialPayload = {
  day: string;
  prompt: string;
  circle: SocialRoom;
  online: { id: string; name: string; hue: number; me: boolean; look?: import("@britbee/shared").BeeLook }[];
  chat: SocialChat[];
  rooms: SocialRoom[];
  mentorRooms: MentorPublishedRoom[];
  vibes?: SocialVibeEvent[];
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

export type ChatSendPayload = {
  kind?: "text" | "material" | "voice" | "attachment";
  text?: string;
  materialId?: string;
  voiceSec?: number;
  voiceUrl?: string;
  voiceText?: string;
  attachmentKind?: "photo" | "video" | "document";
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
};

export type ChatUploadResult = {
  attachmentUrl: string;
  attachmentMime: string;
  attachmentName: string;
  attachmentKind: "photo" | "video" | "document";
};

export type ChatVoiceUploadResult = {
  voiceUrl: string;
  voiceMime: string;
};

export type CheerSendPayload = {
  vibe: SocialVibeEvent["vibe"];
};

export type LearnClip = {
  id: string;
  title: string;
  line: string;
  tip: string;
  duration: 30 | 60 | 90;
  topic: string;
  videoUrl: string | number;
  art: string;
  bg: string;
  guideName: string;
  createdAt: string;
};

export const api = {
  getToken: () => storageGet(TOKEN_KEY),
  setToken: (token: string) => storageSet(TOKEN_KEY, token),
  clearToken: () => storageDelete(TOKEN_KEY),
  login: (body: { email?: string; phone?: string; password: string; portal?: string }) =>
    request<{ token: string; user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  confirmPassword: async (phone: string, password: string) => {
    await request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password, portal: "mobile" }),
    });
  },
  sendOtp: (phone: string, purpose: OtpPurpose) =>
    request<{ ok: boolean; phone: string; purpose: OtpPurpose; devOtp?: string }>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone, purpose }),
    }),
  verifyOtp: (body: { phone: string; otp: string; purpose: OtpPurpose; portal?: string; name?: string }) =>
    request<{
      token?: string;
      user?: ApiUser;
      isNew?: boolean;
      needsPassword?: boolean;
      resetToken?: string;
      phone?: string;
    }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setPassword: async (password: string) => {
    const token = await storageGet(TOKEN_KEY);
    return request<{ user: ApiUser }>(
      "/auth/password",
      { method: "POST", body: JSON.stringify({ password }) },
      token
    );
  },
  resetPassword: (body: { phone: string; resetToken: string; password: string }) =>
    request<{ token: string; user: ApiUser }>("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMe: async (payload: Record<string, unknown>) => {
    const token = await storageGet(TOKEN_KEY);
    return request<{ user: ApiUser }>(
      "/auth/me",
      { method: "PATCH", body: JSON.stringify(payload) },
      token
    );
  },
  parentChildren: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return { children: [] as ChildProfile[], activeChildIndex: 0 };
    try {
      return await request<{ children: ChildProfile[]; activeChildIndex: number }>("/auth/me/children", {}, token);
    } catch {
      return { children: [] as ChildProfile[], activeChildIndex: 0 };
    }
  },
  parentAddChild: async (payload: ChildProfile) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ children: ChildProfile[]; activeChildIndex: number; user: ApiUser }>(
      "/auth/me/children",
      { method: "POST", body: JSON.stringify({ child: payload }) },
      token
    );
  },
  parentSetActiveChild: async (index: number) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ children: ChildProfile[]; activeChildIndex: number; user: ApiUser }>(
      "/auth/me/children/active",
      { method: "POST", body: JSON.stringify({ index }) },
      token
    );
  },
  parentUpdateChild: async (index: number, payload: ChildProfile) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ children: ChildProfile[]; activeChildIndex: number; user: ApiUser }>(
      `/auth/me/children/${index}`,
      { method: "PATCH", body: JSON.stringify({ child: payload }) },
      token
    );
  },
  me: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return null;
    try {
      const data = await request<{ user: ApiUser; token?: string }>("/auth/me", {}, token);
      if (data.token) await storageSet(TOKEN_KEY, data.token);
      return data.user;
    } catch {
      await storageDelete(TOKEN_KEY);
      return null;
    }
  },
  syncProgress: async (snapshot: {
    points: number;
    streak: number;
    clearedSounds: string[];
    dailyDone: boolean;
    dailyEver: boolean;
    storyEver: boolean;
    verbsCleared: string[];
    prepCorrect: number;
    lastActiveDay?: string;
    sprouts?: unknown[];
    planets?: unknown[];
    packDay?: string;
    packsToday?: string[];
    pendingClaim?: unknown;
    claimWait?: unknown[];
    attendStreak?: number;
    attendDay?: string;
    classAttendStreak?: number;
    classAttendDay?: string;
    track?: unknown;
    missed?: unknown[];
    todayDone?: string[];
  }) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return null;
    try {
      return await request<{ ok: boolean; syncedAt: string }>(
        "/progress",
        { method: "POST", body: JSON.stringify(snapshot) },
        token
      );
    } catch {
      return null;
    }
  },
  progressLoad: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return null;
    try {
      return await request<{ snapshot: Record<string, unknown>; syncedAt?: string }>(
        "/progress",
        { method: "GET" },
        token
      );
    } catch {
      return null;
    }
  },
  notifications: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return { notifications: [] as InboxItem[], unread: 0, enabled: true };
    try {
      return await request<{ notifications: InboxItem[]; unread: number; enabled: boolean }>("/notifications", {}, token);
    } catch {
      return { notifications: [], unread: 0, enabled: true };
    }
  },
  classes: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return { classes: [] as KidClass[] };
    try {
      return await request<{ classes: KidClass[] }>("/notifications/classes", {}, token);
    } catch {
      return { classes: [] };
    }
  },
  classById: async (id: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return null;
    try {
      const data = await request<{ class: KidClass }>(`/notifications/classes/${id}`, {}, token);
      return data.class;
    } catch {
      return null;
    }
  },
  classJoin: async (id: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ ok: boolean; class: KidClass }>(`/notifications/classes/${id}/join`, {
      method: "POST",
      body: JSON.stringify({}),
    }, token);
  },
  classClaim: async (id: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ credited: boolean; points: number; class: KidClass }>(`/notifications/classes/${id}/claim`, {
      method: "POST",
      body: JSON.stringify({}),
    }, token);
  },
  readNotification: async (id?: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return;
    await request("/notifications/read", { method: "POST", body: JSON.stringify({ id }) }, token).catch(() => undefined);
  },
  setNotifyPref: async (enabled: boolean) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return;
    await request("/notifications/pref", { method: "PATCH", body: JSON.stringify({ enabled }) }, token).catch(() => undefined);
  },
  hive: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return null;
    try {
      return await request<HivePayload>("/progress/hive", {}, token);
    } catch {
      return null;
    }
  },
  dareBee: async (learnerId: string, activityId = "sentence") => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ ok: boolean; hive: HivePayload }>("/progress/challenge", {
      method: "POST",
      body: JSON.stringify({ learnerId, activityId }),
    }, token);
  },
  social: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return null;
    try {
      return await request<SocialPayload>("/progress/social", {}, token);
    } catch {
      return null;
    }
  },
  socialChat: async (payload: ChatSendPayload | string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    const body = typeof payload === "string" ? { text: payload } : payload;
    return request<SocialPayload>("/progress/social/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },
  socialVibe: async (payload: CheerSendPayload | SocialVibeEvent["vibe"]) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    const body = typeof payload === "string" ? { vibe: payload } : payload;
    return request<SocialPayload>("/progress/social/vibe", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },
  socialStart: async (kind: "battle" | "race", learnerId?: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ room: SocialRoom; social: SocialPayload }>("/progress/social/rooms", {
      method: "POST",
      body: JSON.stringify({ kind, learnerId }),
    }, token);
  },
  socialJoin: async (id: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ room: SocialRoom; social: SocialPayload }>(`/progress/social/rooms/${id}/join`, {
      method: "POST",
      body: JSON.stringify({}),
    }, token);
  },
  socialSay: async (id: string, text: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ room: SocialRoom; awarded: number; already: boolean; social: SocialPayload }>(
      `/progress/social/rooms/${id}/say`,
      { method: "POST", body: JSON.stringify({ text }) },
      token
    );
  },
  socialRoom: async (id: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return null;
    try {
      return await request<{ room: SocialRoom; social: SocialPayload }>(`/progress/social/rooms/${id}`, {}, token);
    } catch {
      return null;
    }
  },
  mentorChat: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return { messages: [] as MentorChatMessage[] };
    try {
      return await request<{ messages: MentorChatMessage[] }>("/progress/mentor-chat", {}, token);
    } catch {
      return { messages: [] as MentorChatMessage[] };
    }
  },
  mentorChatSend: async (payload: ChatSendPayload | string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    const body = typeof payload === "string" ? { text: payload } : payload;
    return request<{ messages: MentorChatMessage[] }>(
      "/progress/mentor-chat",
      { method: "POST", body: JSON.stringify(body) },
      token
    );
  },
  chatUpload: async (form: FormData) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    const res = await fetch(`${API_URL}/progress/chat/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = typeof data.error === "string" ? data.error : "Could not upload file.";
      throw new ApiError(message, res.status);
    }
    return data as ChatUploadResult;
  },
  chatVoiceUpload: async (form: FormData) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    const res = await fetch(`${API_URL}/progress/chat/voice-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = typeof data.error === "string" ? data.error : "Could not upload voice note.";
      throw new ApiError(message, res.status);
    }
    return data as ChatVoiceUploadResult;
  },
  learn: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return { clips: [] as LearnClip[], seenIds: [] as string[] };
    try {
      return await request<{ clips: LearnClip[]; seenIds: string[] }>("/progress/learn", {}, token);
    } catch {
      return { clips: [] as LearnClip[], seenIds: [] as string[] };
    }
  },
  learnSeen: async (id: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) return;
    await request(`/progress/learn/${id}/seen`, { method: "POST", body: JSON.stringify({}) }, token).catch(() => undefined);
  },
  billingSummary: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<BillingSummary>("/billing/summary", {}, token);
  },
  billingCheckout: async (planId: "monthly" | "yearly", method: PaymentMethod) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ payment: BillingPayment }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ planId, method }),
    }, token);
  },
  billingConfirmPayment: async (paymentId: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<BillingConfirmResult>(`/billing/payments/${paymentId}/confirm`, {
      method: "POST",
      body: JSON.stringify({}),
    }, token);
  },
  billingCancelPayment: async (paymentId: string) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ payment: BillingPayment }>(`/billing/payments/${paymentId}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    }, token);
  },
  billingSwitchTrial: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ subscription: BillingSubscription; user: ApiUser }>("/billing/trial", {
      method: "POST",
      body: JSON.stringify({}),
    }, token);
  },
  billingCancelSubscription: async (atPeriodEnd = true) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ subscription: BillingSubscription; user: ApiUser }>("/billing/subscription/cancel", {
      method: "POST",
      body: JSON.stringify({ atPeriodEnd }),
    }, token);
  },
  billingResumeSubscription: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ subscription: BillingSubscription; user: ApiUser }>("/billing/subscription/resume", {
      method: "POST",
      body: JSON.stringify({}),
    }, token);
  },
  billingPayments: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ payments: BillingPayment[] }>("/billing/payments", {}, token);
  },
  billingInvoices: async () => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ invoices: BillingInvoice[] }>("/billing/invoices", {}, token);
  },
  billingActivity: async (limit = 40) => {
    const token = await storageGet(TOKEN_KEY);
    if (!token) throw new ApiError("Not signed in", 401);
    return request<{ activity: ParentActivityItem[] }>(`/billing/activity?limit=${limit}`, {}, token);
  },
};

export type PaymentMethod = "upi" | "card" | "netbanking";

export type BillingSubscription = {
  userId: string;
  planId: "trial" | "monthly" | "yearly";
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string;
  updatedAt: string;
};

export type BillingPayment = {
  id: string;
  userId: string;
  planId: "trial" | "monthly" | "yearly";
  amount: number;
  currency: "INR";
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  method?: PaymentMethod;
  invoiceId?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
};

export type BillingInvoice = {
  id: string;
  userId: string;
  paymentId?: string;
  planId: "trial" | "monthly" | "yearly";
  amount: number;
  currency: "INR";
  status: "open" | "paid" | "void";
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  paidAt?: string;
};

export type ParentActivityItem = {
  id: string;
  userId: string;
  childIndex?: number;
  childName?: string;
  type: "practice" | "payment" | "subscription" | "settings" | "class" | "achievement";
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type BillingSummary = {
  subscription: BillingSubscription;
  pendingPayments: BillingPayment[];
  recentActivity: ParentActivityItem[];
  invoices: BillingInvoice[];
  user?: ApiUser;
};

export type BillingConfirmResult = {
  payment: BillingPayment;
  subscription: BillingSubscription;
  invoice: BillingInvoice;
  user?: ApiUser;
};

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  kind: string;
  activityId?: string;
  href?: string;
  source: string;
  createdAt: string;
  readAt?: string;
};

export type KidClass = {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  durationMin: number;
  classKind?: "individual" | "group";
  learnerCount?: number;
  endsAt?: string;
  guideName: string;
  status: "scheduled" | "live" | "ended";
  roomUrl: string;
  liveAt?: string;
  endedAt?: string;
  joinedByMe?: boolean;
};

export function liveJoinUrl(roomUrl: string, displayName: string) {
  const safe = (displayName || "Bee").replace(/[#"&<>]/g, "").slice(0, 32) || "Bee";
  if (!/meet\.jit\.si/i.test(roomUrl)) {
    const sep = roomUrl.includes("?") ? "&" : "?";
    return `${roomUrl}${sep}name=${encodeURIComponent(safe)}`;
  }
  return (
    `${roomUrl}` +
    `#userInfo.displayName="${safe}"` +
    `&config.disableDeepLinking=true` +
    `&config.prejoinPageEnabled=false` +
    `&config.startWithAudioMuted=false` +
    `&config.startWithVideoMuted=false` +
    `&config.requireDisplayName=false` +
    `&config.enableWelcomePage=false`
  );
}
