import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, type ApiUser, type OtpPurpose } from "@/lib/api";
import { unregisterPush } from "@/lib/push";

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  loginWithPassword: (phone: string, password: string) => Promise<void>;
  sendOtp: (phone: string, purpose: OtpPurpose) => Promise<{ ok: boolean; phone: string; devOtp?: string }>;
  verifyOtp: (
    phone: string,
    otp: string,
    extra?: { name?: string; purpose?: OtpPurpose; referralCode?: string }
  ) => Promise<{ isNew: boolean; needsPassword: boolean; resetToken?: string }>;
  setPassword: (password: string) => Promise<void>;
  resetPassword: (phone: string, resetToken: string, password: string) => Promise<void>;
  updateProfile: (payload: { name?: string; child?: ApiUser["child"] }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: ApiUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setUser,
      async loginWithPassword(phone, password) {
        const { token, user: u } = await api.login({ phone, password, portal: "mobile" });
        await api.setToken(token);
        setUser(u);
      },
      sendOtp: (phone, purpose) => api.sendOtp(phone, purpose),
      async verifyOtp(phone, otp, extra) {
        const purpose = extra?.purpose || "signup";
        const res = await api.verifyOtp({
          phone,
          otp,
          purpose,
          portal: "mobile",
          name: extra?.name,
          referralCode: extra?.referralCode || undefined,
        });
        if (res.resetToken) {
          return { isNew: false, needsPassword: true, resetToken: res.resetToken };
        }
        if (res.token && res.user) {
          await api.setToken(res.token);
          setUser(res.user);
        }
        return { isNew: Boolean(res.isNew), needsPassword: Boolean(res.needsPassword) };
      },
      async setPassword(password) {
        const { user: u } = await api.setPassword(password);
        setUser(u);
      },
      async resetPassword(phone, resetToken, password) {
        const { token, user: u } = await api.resetPassword({ phone, resetToken, password });
        await api.setToken(token);
        setUser(u);
      },
      async updateProfile(payload) {
        const { user: u } = await api.updateMe(payload);
        setUser(u);
      },
      async signOut() {
        await unregisterPush().catch(() => undefined);
        await api.clearToken();
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
