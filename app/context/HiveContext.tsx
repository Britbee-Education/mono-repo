import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Alert } from "react-native";
import { api, isApiError, type HivePayload } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";

type Ctx = {
  hive: HivePayload | null;
  refresh: () => Promise<void>;
  dare: (learnerId: string, activityId?: string) => Promise<boolean>;
};

const HiveContext = createContext<Ctx | null>(null);

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function HiveProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { dailyDone, streak } = useProgress();
  const [hive, setHive] = useState<HivePayload | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setHive((prev) => (prev ? null : prev));
      return;
    }
    const data = await api.hive();
    setHive((prev) => (sameJson(prev, data) ? prev : data));
  }, [user]);

  const dare = useCallback(
    async (learnerId: string, activityId = "sentence") => {
      try {
        const res = await api.dareBee(learnerId, activityId);
        setHive((prev) => (sameJson(prev, res.hive) ? prev : res.hive));
        return true;
      } catch (e: unknown) {
        const msg = isApiError(e) ? e.message : "Could not send dare";
        Alert.alert("Dare", msg);
        return false;
      }
    },
    []
  );

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

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void refresh(), 1_200);
    return () => clearTimeout(t);
  }, [dailyDone, streak, refresh, user]);

  const value = useMemo<Ctx>(
    () => ({
      hive,
      refresh,
      dare,
    }),
    [hive, refresh, dare]
  );

  return <HiveContext.Provider value={value}>{children}</HiveContext.Provider>;
}

export function useHive() {
  const ctx = useContext(HiveContext);
  if (!ctx) throw new Error("useHive requires HiveProvider");
  return ctx;
}
