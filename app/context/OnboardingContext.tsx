import React, { createContext, useContext, useMemo, useState } from "react";

export type OnboardingDraft = {
  name: string;
  email: string;
  phone: string;
  password: string;
  resetToken: string;
  childName: string;
  dateOfBirth: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: string;
};

const defaults: OnboardingDraft = {
  name: "",
  email: "",
  phone: "",
  password: "",
  resetToken: "",
  childName: "Arjun Sharma",
  dateOfBirth: "12/08/2017",
  level: "beginner",
  goal: "Speak confidently",
};

type Ctx = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(defaults);
  const value = useMemo(
    () => ({
      draft,
      update: (patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch })),
      reset: () => setDraft(defaults),
    }),
    [draft]
  );
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding requires OnboardingProvider");
  return ctx;
}
