"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, LogOut, MessageSquare, PanelLeft, Shield, User } from "lucide-react";
import { api, clearSession, getToken, getUser, saveSession, type GuideUser } from "@/lib/api";

const DOCK_KEY = "britbee_messages_dock_open";
const SIDEBAR_KEY = "britbee_sidebar_collapsed";
const NOTIFY_EMAIL_KEY = "britbee_mentor_notify_email";

type Tab = "profile" | "account" | "settings";

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer-neutral/png?seed=${encodeURIComponent(seed || "Mentor")}&size=160`;
}

function roleLabel(role?: string) {
  if (role === "superadmin") return "Administrator";
  if (role === "guide") return "Lead Mentor";
  return role || "Mentor";
}

function readBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "1";
}

export default function MentorProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [user, setUser] = useState<GuideUser | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [dockOpenDefault, setDockOpenDefault] = useState(true);
  const [sidebarCollapsedDefault, setSidebarCollapsedDefault] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    setDockOpenDefault(readBool(DOCK_KEY, true));
    setSidebarCollapsedDefault(readBool(SIDEBAR_KEY, false));
    setEmailAlerts(localStorage.getItem(NOTIFY_EMAIL_KEY) !== "0");
    void (async () => {
      try {
        const data = await api("/auth/me");
        const next = data.user as GuideUser;
        setUser(next);
        setName(next.name || "");
        saveSession(data.token || getToken() || "", next);
      } catch (e: unknown) {
        const cached = getUser();
        if (cached) {
          setUser(cached);
          setName(cached.name || "");
        } else {
          setError(e instanceof Error ? e.message : "Could not load profile.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setError("");
    setNote("");
    try {
      const data = await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() || user.name }),
      });
      const next = data.user as GuideUser;
      const token = getToken();
      if (token) saveSession(token, next);
      setUser(next);
      setName(next.name || "");
      setNote("Profile updated.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError("");
    setNote("");
    try {
      const data = await api("/auth/password", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      const next = data.user as GuideUser;
      const token = getToken();
      if (token) saveSession(token, next);
      setUser(next);
      setPassword("");
      setPasswordConfirm("");
      setNote("Password updated.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  function saveSettings() {
    localStorage.setItem(DOCK_KEY, dockOpenDefault ? "1" : "0");
    localStorage.setItem(SIDEBAR_KEY, sidebarCollapsedDefault ? "1" : "0");
    localStorage.setItem(NOTIFY_EMAIL_KEY, emailAlerts ? "1" : "0");
    setNote("Settings saved.");
    setError("");
  }

  if (loading) {
    return (
      <div className="page wide">
        <p className="hint">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page wide">
        <div className="error-box">{error || "Profile unavailable."}</div>
      </div>
    );
  }

  return (
    <div className="page wide mentor-profile-page">
      <div className="page-head mentor-profile-head">
        <div>
          <Link href="/dashboard" className="back">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <h1 className="hello">Profile</h1>
        </div>
      </div>

      {error ? <div className="error-box">{error}</div> : null}
      {note ? (
        <p className="hint" style={{ color: "var(--success)" }}>
          {note}
        </p>
      ) : null}

      <div className="mentor-profile-layout">
        <aside className="mentor-profile-sidebar card">
          <div className="mentor-profile-identity">
            <img className="mentor-profile-avatar" src={avatarUrl(user.name || "Mentor")} alt="" />
            <strong>{user.name}</strong>
            <span>{roleLabel(user.role)}</span>
            {user.email ? <span className="mini">{user.email}</span> : null}
          </div>

          <div className="mentor-profile-tabs" role="tablist" aria-label="Profile sections">
            {(
              [
                ["profile", "Profile", User],
                ["account", "Account", Shield],
                ["settings", "Settings", PanelLeft],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`mentor-profile-tab${tab === id ? " on" : ""}`}
                onClick={() => {
                  setTab(id);
                  setError("");
                  setNote("");
                }}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mentor-profile-signout"
            onClick={() => {
              clearSession();
              router.replace("/");
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </aside>

        <section className="mentor-profile-panel card">
          {tab === "profile" ? (
            <>
              <div className="section-head">
                <h2 className="section-title">Profile</h2>
              </div>

              <label className="field">
                <span>Display name</span>
                <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mentor name" />
              </label>

              <label className="field">
                <span>Email</span>
                <input className="text-input" value={user.email || ""} readOnly disabled />
              </label>

              <label className="field">
                <span>Role</span>
                <input className="text-input" value={roleLabel(user.role)} readOnly disabled />
              </label>

              <div className="row-actions">
                <button type="button" className="btn btn-yellow" disabled={saving} onClick={() => void saveProfile()}>
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </>
          ) : null}

          {tab === "account" ? (
            <>
              <div className="section-head">
                <h2 className="section-title">Password</h2>
              </div>

              <div className="mentor-profile-readonly">
                <div>
                  <span className="mini">Signed in as</span>
                  <strong>{user.email || user.phone || user.name}</strong>
                </div>
                <div>
                  <span className="mini">Password status</span>
                  <strong>{user.hasPassword ? "Password set" : "No password yet"}</strong>
                </div>
              </div>

              <form className="mentor-profile-form" onSubmit={(e) => void savePassword(e)}>
                <label className="field">
                  <span>New password</span>
                  <input
                    className="text-input"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    className="text-input"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </label>
                <div className="row-actions">
                  <button type="submit" className="btn btn-yellow" disabled={saving || !password}>
                    {saving ? "Saving…" : "Update password"}
                  </button>
                </div>
              </form>
            </>
          ) : null}

          {tab === "settings" ? (
            <>
              <div className="section-head">
                <h2 className="section-title">Settings</h2>
              </div>

              <div className="mentor-settings-list">
                <label className="mentor-setting-row">
                  <span className="mentor-setting-copy">
                    <MessageSquare size={16} aria-hidden="true" />
                    <span>
                      <strong>Messages dock on load</strong>
                    </span>
                  </span>
                  <input type="checkbox" checked={dockOpenDefault} onChange={(e) => setDockOpenDefault(e.target.checked)} />
                </label>

                <label className="mentor-setting-row">
                  <span className="mentor-setting-copy">
                    <PanelLeft size={16} aria-hidden="true" />
                    <span>
                      <strong>Collapse sidebar on load</strong>
                    </span>
                  </span>
                  <input type="checkbox" checked={sidebarCollapsedDefault} onChange={(e) => setSidebarCollapsedDefault(e.target.checked)} />
                </label>

                <label className="mentor-setting-row">
                  <span className="mentor-setting-copy">
                    <Bell size={16} aria-hidden="true" />
                    <span>
                      <strong>Class reminder emails</strong>
                    </span>
                  </span>
                  <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                </label>
              </div>

              <div className="row-actions">
                <button type="button" className="btn btn-yellow" onClick={saveSettings}>
                  Save settings
                </button>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
