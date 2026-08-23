import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Alert } from "react-native";
import { api, isApiError, type ChatSendPayload, type CheerSendPayload, type MentorChatMessage, type SocialChat, type SocialPayload, type SocialRoom } from "@/lib/api";
import { messagePreview, payloadKey } from "@/lib/chatEngagement";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";

type Ctx = {
  social: SocialPayload | null;
  mentorChat: MentorChatMessage[];
  chatLive: boolean;
  setChatLive: (on: boolean) => void;
  refresh: () => Promise<void>;
  refreshChat: () => Promise<void>;
  sendChat: (text: string) => Promise<boolean>;
  sendChatPayload: (payload: ChatSendPayload) => Promise<boolean>;
  sendMentorChat: (text: string) => Promise<boolean>;
  sendMentorChatPayload: (payload: ChatSendPayload) => Promise<boolean>;
  sendVibe: (payload: CheerSendPayload) => Promise<boolean>;
  startRoom: (kind: "battle" | "race", learnerId?: string) => Promise<SocialRoom | null>;
  joinRoom: (id: string) => Promise<SocialRoom | null>;
  sayInRoom: (id: string, text: string) => Promise<SocialRoom | null>;
  loadRoom: (id: string) => Promise<SocialRoom | null>;
};

const SocialContext = createContext<Ctx | null>(null);

function chatTailChanged<T extends { id: string }>(prev: T[], next: T[]) {
  if (prev.length !== next.length) return true;
  if (!prev.length) return false;
  return prev[prev.length - 1]?.id !== next[next.length - 1]?.id;
}

function pendingSocialAcked(pending: SocialChat, server: SocialChat[]) {
  const key = payloadKey(pending);
  return server.some(
    (row) =>
      payloadKey(row) === key &&
      row.learnerId === pending.learnerId &&
      Math.abs(new Date(row.createdAt).getTime() - new Date(pending.createdAt).getTime()) < 60_000
  );
}

function pendingMentorAcked(pending: MentorChatMessage, server: MentorChatMessage[]) {
  const key = payloadKey(pending);
  return server.some(
    (row) =>
      payloadKey(row) === key &&
      row.from === pending.from &&
      row.learnerId === pending.learnerId &&
      Math.abs(new Date(row.createdAt).getTime() - new Date(pending.createdAt).getTime()) < 60_000
  );
}

function mergeChatWithPending(server: SocialChat[], pending: SocialChat[]) {
  const keep = pending.filter((row) => !pendingSocialAcked(row, server));
  const merged = [...server, ...keep];
  merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return merged;
}

function mergeMentorWithPending(server: MentorChatMessage[], pending: MentorChatMessage[]) {
  const keep = pending.filter((row) => !pendingMentorAcked(row, server));
  const merged = [...server, ...keep];
  merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return merged;
}

function mergeSocial(prev: SocialPayload | null, next: SocialPayload | null) {
  if (!next) return null;
  if (!prev) return next;
  const chatSame = !chatTailChanged(prev.chat || [], next.chat || []);
  const roomsSame = JSON.stringify(prev.rooms) === JSON.stringify(next.rooms);
  const onlineSame = JSON.stringify(prev.online) === JSON.stringify(next.online);
  const mentorRoomsSame = JSON.stringify(prev.mentorRooms) === JSON.stringify(next.mentorRooms);
  const vibesSame = JSON.stringify(prev.vibes) === JSON.stringify(next.vibes);
  if (chatSame && roomsSame && onlineSame && mentorRoomsSame && vibesSame && prev.prompt === next.prompt && prev.day === next.day) return prev;
  return next;
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { addPoints } = useProgress();
  const [social, setSocial] = useState<SocialPayload | null>(null);
  const [mentorChat, setMentorChat] = useState<MentorChatMessage[]>([]);
  const [chatLive, setChatLive] = useState(false);
  const userRef = useRef(user);
  const sendLockRef = useRef(false);
  userRef.current = user;

  const applySocial = useCallback((data: SocialPayload | null) => {
    setSocial((prev) => mergeSocial(prev, data));
  }, []);

  const applyMentor = useCallback((rows: MentorChatMessage[]) => {
    setMentorChat((prev) => {
      const pending = prev.filter((m) => isPendingChatId(m.id));
      const next = mergeMentorWithPending(rows, pending);
      return chatTailChanged(prev, next) ? next : prev;
    });
  }, []);

  const refreshChat = useCallback(async () => {
    const me = userRef.current;
    if (!me) return;
    const [socialData, mentorData] = await Promise.all([api.social(), api.mentorChat()]);
    if (socialData) {
      setSocial((prev) => {
        if (!prev) return socialData;
        const serverChat = socialData.chat || [];
        const pending = (prev.chat || []).filter((m) => isPendingChatId(m.id));
        const merged = mergeChatWithPending(serverChat, pending);
        const chatSame = !chatTailChanged(prev.chat || [], merged);
        const mentorRoomsSame = JSON.stringify(prev.mentorRooms) === JSON.stringify(socialData.mentorRooms || []);
        const vibesSame = JSON.stringify(prev.vibes) === JSON.stringify(socialData.vibes || []);
        if (chatSame && mentorRoomsSame && vibesSame) return prev;
        return { ...prev, chat: merged, mentorRooms: socialData.mentorRooms || [], vibes: socialData.vibes || [] };
      });
    }
    applyMentor(mentorData.messages || []);
  }, [applyMentor]);

  const refresh = useCallback(async () => {
    const me = userRef.current;
    if (!me) {
      setSocial((prev) => (prev ? null : prev));
      setMentorChat((prev) => (prev.length ? [] : prev));
      return;
    }
    const [socialData, mentorData] = await Promise.all([api.social(), api.mentorChat()]);
    applySocial(socialData);
    applyMentor(mentorData.messages || []);
  }, [applySocial, applyMentor]);

  const sendChatPayload = useCallback(
    async (payload: ChatSendPayload) => {
      const me = userRef.current;
      if (!me || sendLockRef.current) return false;
      sendLockRef.current = true;
      const tempId = `pending-chat-${Date.now()}`;
      const meName = me.child?.childName?.split(/\s+/)[0] || "Bee";
      const optimistic: SocialChat = {
        id: tempId,
        learnerId: me.id,
        name: meName,
        hue: 0,
        text: messagePreview({ id: tempId, ...payload, text: payload.text || "" }),
        createdAt: new Date().toISOString(),
        kind: payload.kind,
        materialId: payload.materialId,
        voiceSec: payload.voiceSec,
        voiceUrl: payload.voiceUrl,
        voiceText: payload.voiceText,
        attachmentKind: payload.attachmentKind,
        attachmentUrl: payload.attachmentUrl,
        attachmentName: payload.attachmentName,
        attachmentMime: payload.attachmentMime,
      };
      setSocial((prev) => (prev ? { ...prev, chat: [...(prev.chat || []), optimistic] } : prev));
      try {
        const data = await api.socialChat(payload);
        setSocial((prev) => {
          if (!data) return prev;
          const pending = (prev?.chat || []).filter((m) => isPendingChatId(m.id));
          const chat = mergeChatWithPending(data.chat || [], pending);
          return { ...data, chat };
        });
        return true;
      } catch (e: unknown) {
        setSocial((prev) =>
          prev ? { ...prev, chat: (prev.chat || []).filter((m) => m.id !== tempId) } : prev
        );
        Alert.alert("Chat", isApiError(e) ? e.message : "Could not send.");
        return false;
      } finally {
        sendLockRef.current = false;
      }
    },
    []
  );

  const sendChat = useCallback(
    async (text: string) => sendChatPayload({ kind: "text", text }),
    [sendChatPayload]
  );

  const sendMentorChatPayload = useCallback(async (payload: ChatSendPayload) => {
    const me = userRef.current;
    if (!me || sendLockRef.current) return false;
    sendLockRef.current = true;
    const tempId = `pending-mentor-${Date.now()}`;
    const optimistic: MentorChatMessage = {
      id: tempId,
      learnerId: me.id,
      text: messagePreview({ id: tempId, ...payload, text: payload.text || "" }),
      from: "learner",
      createdAt: new Date().toISOString(),
      kind: payload.kind,
      materialId: payload.materialId,
      voiceSec: payload.voiceSec,
      voiceUrl: payload.voiceUrl,
      voiceText: payload.voiceText,
      attachmentKind: payload.attachmentKind,
      attachmentUrl: payload.attachmentUrl,
      attachmentName: payload.attachmentName,
      attachmentMime: payload.attachmentMime,
    };
    setMentorChat((prev) => [...prev, optimistic]);
    try {
      const data = await api.mentorChatSend(payload);
      applyMentor(data.messages || []);
      return true;
    } catch (e: unknown) {
      setMentorChat((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("Mentor chat", isApiError(e) ? e.message : "Could not send.");
      return false;
    } finally {
      sendLockRef.current = false;
    }
  }, [applyMentor]);

  const sendMentorChat = useCallback(
    async (text: string) => sendMentorChatPayload({ kind: "text", text }),
    [sendMentorChatPayload]
  );

  const sendVibe = useCallback(async (payload: CheerSendPayload) => {
    try {
      const data = await api.socialVibe(payload);
      applySocial(data);
      return true;
    } catch {
      return false;
    }
  }, [applySocial]);

  const startRoom = useCallback(
    async (kind: "battle" | "race", learnerId?: string) => {
      try {
        const res = await api.socialStart(kind, learnerId);
        applySocial(res.social);
        return res.room;
      } catch (e: unknown) {
        Alert.alert("Social", isApiError(e) ? e.message : "Could not start.");
        return null;
      }
    },
    [applySocial]
  );

  const joinRoom = useCallback(
    async (id: string) => {
      try {
        const res = await api.socialJoin(id);
        applySocial(res.social);
        return res.room;
      } catch (e: unknown) {
        Alert.alert("Social", isApiError(e) ? e.message : "Could not join.");
        return null;
      }
    },
    [applySocial]
  );

  const sayInRoom = useCallback(
    async (id: string, text: string) => {
      try {
        const res = await api.socialSay(id, text);
        applySocial(res.social);
        if (res.awarded && !res.already) {
          addPoints(
            res.awarded,
            res.awarded >= 10 ? "Battle win!" : res.awarded >= 6 ? "Race pack!" : "Circle pack!",
            res.awarded >= 10 ? "fanfare" : "coin"
          );
        }
        return res.room;
      } catch (e: unknown) {
        Alert.alert("Say it in English", isApiError(e) ? e.message : "Try again.");
        return null;
      }
    },
    [applySocial, addPoints]
  );

  const loadRoom = useCallback(
    async (id: string) => {
      const res = await api.socialRoom(id);
      if (res?.social) applySocial(res.social);
      return res?.room || null;
    },
    [applySocial]
  );

  useEffect(() => {
    void refresh();
    const slow = setInterval(() => void refresh(), 8_000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    return () => {
      clearInterval(slow);
      sub.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (!user || !chatLive) return;
    void refreshChat();
    const fast = setInterval(() => void refreshChat(), 1_000);
    return () => clearInterval(fast);
  }, [user, chatLive, refreshChat]);

  const value = useMemo<Ctx>(
    () => ({
      social,
      mentorChat,
      chatLive,
      setChatLive,
      refresh,
      refreshChat,
      sendChat,
      sendChatPayload,
      sendMentorChat,
      sendMentorChatPayload,
      sendVibe,
      startRoom,
      joinRoom,
      sayInRoom,
      loadRoom,
    }),
    [social, mentorChat, chatLive, refresh, refreshChat, sendChat, sendChatPayload, sendMentorChat, sendMentorChatPayload, sendVibe, startRoom, joinRoom, sayInRoom, loadRoom]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial requires SocialProvider");
  return ctx;
}

export function isPendingChatId(id: string) {
  return id.startsWith("pending-");
}
