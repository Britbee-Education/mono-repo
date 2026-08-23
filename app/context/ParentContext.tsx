import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type ApiUser } from "@/lib/api";
import { loadParent, saveParent, type ParentRecord, type PlanId } from "@/lib/parent";
import { useAuth } from "@/context/AuthContext";

type Ctx = {
  ready: boolean;
  unlocked: boolean;
  hasPin: boolean;
  paused: boolean;
  planId: PlanId;
  planSince?: string;
  lock: () => void;
  unlockWithPassword: (password: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  setPlan: (id: PlanId) => Promise<void>;
  setPaused: (paused: boolean) => Promise<void>;
};

const ParentContext = createContext<Ctx | null>(null);

function last10(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function recordFromUser(user: ApiUser | null, local: ParentRecord): ParentRecord {
  const remote = user?.parentSettings;
  return {
    pin: local.pin,
    paused: typeof remote?.paused === "boolean" ? remote.paused : local.paused,
    planId: remote?.planId === "monthly" || remote?.planId === "yearly" ? remote.planId : local.planId,
    planSince: remote?.planSince || local.planSince,
  };
}

export function ParentProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const userId = user?.id || "";
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [record, setRecord] = useState<ParentRecord>({ planId: "trial", paused: false });

  useEffect(() => {
    setUnlocked(false);
    if (!userId) {
      setRecord({ planId: "trial", paused: false });
      setReady(true);
      return;
    }
    setReady(false);
    loadParent(userId).then((row) => {
      setRecord(recordFromUser(user, row));
      setReady(true);
    });
  }, [userId, user?.parentSettings?.paused, user?.parentSettings?.planId, user?.parentSettings?.planSince]);

  const persistRemote = useCallback(
    async (next: Pick<ParentRecord, "paused" | "planId" | "planSince">) => {
      if (!userId) return;
      const data = await api.updateMe({
        parentSettings: {
          paused: next.paused,
          planId: next.planId,
          planSince: next.planSince,
        },
      });
      setUser(data.user);
    },
    [userId, setUser]
  );

  const persist = useCallback(
    async (next: ParentRecord) => {
      setRecord(next);
      if (userId) {
        await saveParent(userId, next);
        await persistRemote(next);
      }
    },
    [userId, persistRemote]
  );

  const unlockWithPassword = useCallback(
    async (password: string) => {
      const phone = last10(user?.phone);
      if (!phone) throw new Error("No parent phone on this account.");
      await api.confirmPassword(phone, password);
      setUnlocked(true);
    },
    [user?.phone]
  );

  const unlockWithPin = useCallback(
    async (pin: string) => {
      if (!record.pin || pin !== record.pin) throw new Error("That PIN doesn’t match.");
      setUnlocked(true);
    },
    [record.pin]
  );

  const setPin = useCallback(
    async (pin: string) => {
      const next = { ...record, pin };
      setRecord(next);
      if (userId) await saveParent(userId, next);
    },
    [record, userId]
  );

  const setPlan = useCallback(
    async (id: PlanId) => {
      await persist({ ...record, planId: id, planSince: new Date().toISOString() });
    },
    [persist, record]
  );

  const setPaused = useCallback(
    async (paused: boolean) => {
      await persist({ ...record, paused });
    },
    [persist, record]
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      unlocked,
      hasPin: Boolean(record.pin),
      paused: record.paused,
      planId: record.planId,
      planSince: record.planSince,
      lock: () => setUnlocked(false),
      unlockWithPassword,
      unlockWithPin,
      setPin,
      setPlan,
      setPaused,
    }),
    [ready, unlocked, record, unlockWithPassword, unlockWithPin, setPin, setPlan, setPaused]
  );

  return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>;
}

export function useParent() {
  const ctx = useContext(ParentContext);
  if (!ctx) throw new Error("useParent requires ParentProvider");
  return ctx;
}
