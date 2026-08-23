import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import { useRouter } from "expo-router";
import { api, type InboxItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Notifications, registerForPush, unregisterPush } from "@/lib/push";

type Ctx = {
  items: InboxItem[];
  unread: number;
  enabled: boolean;
  refresh: () => Promise<void>;
  markRead: (id?: string) => Promise<void>;
  setEnabled: (on: boolean) => Promise<void>;
};

const NotifyContext = createContext<Ctx | null>(null);

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hrefFromData(data: Record<string, unknown> | undefined): string {
  const href = typeof data?.href === "string" ? data.href : "";
  if (href.startsWith("/") || href.startsWith("(")) return href;
  return "/(main)/inbox";
}

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [enabled, setEnabledState] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems((prev) => (prev.length ? [] : prev));
      setUnread((prev) => (prev === 0 ? prev : 0));
      return;
    }
    const data = await api.notifications();
    const nextItems = data.notifications || [];
    const nextUnread = data.unread || 0;
    const nextEnabled = data.enabled !== false;
    setItems((prev) => (sameJson(prev, nextItems) ? prev : nextItems));
    setUnread((prev) => (prev === nextUnread ? prev : nextUnread));
    setEnabledState((prev) => (prev === nextEnabled ? prev : nextEnabled));
  }, [user]);

  const markRead = useCallback(
    async (id?: string) => {
      await api.readNotification(id);
      await refresh();
    },
    [refresh]
  );

  const setEnabled = useCallback(async (on: boolean) => {
    setEnabledState(on);
    await api.setNotifyPref(on);
    if (Platform.OS === "web") return;
    if (on) await registerForPush().catch(() => null);
    else await unregisterPush().catch(() => undefined);
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 20_000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [refresh]);

  // Phone popup registration + tap → deep link into inbox / activity.
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!user || !enabled) {
      void unregisterPush().catch(() => undefined);
      return;
    }

    let alive = true;
    void registerForPush().catch(() => null);

    const received = Notifications.addNotificationReceivedListener(() => {
      if (alive) void refresh();
    });
    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      const data = event.notification.request.content.data as Record<string, unknown> | undefined;
      const href = hrefFromData(data);
      try {
        router.push(href as never);
      } catch {
        router.push("/(main)/inbox" as never);
      }
      void refresh();
    });

    return () => {
      alive = false;
      received.remove();
      response.remove();
    };
  }, [user, enabled, refresh, router]);

  const value = useMemo<Ctx>(
    () => ({
      items,
      unread,
      enabled,
      refresh,
      markRead,
      setEnabled,
    }),
    [items, unread, enabled, refresh, markRead, setEnabled]
  );

  return <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>;
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error("useNotify requires NotifyProvider");
  return ctx;
}
