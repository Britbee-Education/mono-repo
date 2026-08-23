"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ToastHost } from "@/components/ToastHost";
import { clearSession, getToken, getUser, api, type GuideUser } from "@/lib/api";
import {
  Activity,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Home,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  PanelRightClose,
  Puzzle,
  Video,
  Users,
} from "lucide-react";
import { MentorChatPanel, type ChatTarget } from "@/components/MentorChatPanel";
import { NotifyPanel } from "@/components/NotifyPanel";

const DOCK_KEY = "britbee_messages_dock_open";
const SIDEBAR_KEY = "britbee_sidebar_collapsed";

type NavTone = "gold" | "purple" | "green" | "blue" | "orange" | "pink" | "teal" | "cyan";

type WorkspaceLink = {
  href: string;
  label: string;
  glyph: ComponentType<{ size?: number }>;
  tone: NavTone;
};

const WORKSPACE_LINKS: WorkspaceLink[] = [
  { href: "/dashboard", label: "Dashboard", glyph: Home, tone: "gold" },
  { href: "/dashboard/classes", label: "Classes", glyph: Video, tone: "purple" },
  { href: "/dashboard/rooms", label: "Rooms", glyph: Puzzle, tone: "green" },
  { href: "/dashboard/learners", label: "Learners", glyph: Users, tone: "blue" },
  { href: "/dashboard/learn", label: "E-Learn", glyph: BookOpen, tone: "orange" },
  { href: "/dashboard/activities", label: "Activities", glyph: Activity, tone: "pink" },
];

function readDockOpen() {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(DOCK_KEY);
  if (raw === null) return true;
  return raw === "1";
}

function readSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_KEY) === "1";
}

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer-neutral/png?seed=${encodeURIComponent(seed || "Mentor")}&size=80`;
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<GuideUser | null>(null);
  const [messagesDockOpen, setMessagesDockOpen] = useState(true);
  const [dockChat, setDockChat] = useState<ChatTarget | undefined>(undefined);
  const [notifyPanelOpen, setNotifyPanelOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messageUnread, setMessageUnread] = useState(0);
  const [notifyUnread, setNotifyUnread] = useState(0);
  const [todayProgress, setTodayProgress] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const onMessagesPage = pathname === "/dashboard/messages" || pathname.startsWith("/dashboard/messages/");
  const onNotificationsPage = pathname === "/dashboard/notifications" || pathname.startsWith("/dashboard/notifications/");
  const onProfilePage = pathname === "/dashboard/profile" || pathname.startsWith("/dashboard/profile/");

  useEffect(() => {
    setMessagesDockOpen(readDockOpen());
    setSidebarCollapsed(readSidebarCollapsed());
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.classList.remove("page-enter");
    void main.offsetWidth;
    main.classList.add("page-enter");
  }, [pathname]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ learnerId?: string; chat?: ChatTarget }>).detail;
      if (detail?.chat) setDockChat(detail.chat);
      else if (detail?.learnerId) setDockChat(detail.learnerId);
      setMessagesDockOpen(true);
      localStorage.setItem(DOCK_KEY, "1");
    };
    window.addEventListener("britbee:open-messages", onOpen);
    return () => window.removeEventListener("britbee:open-messages", onOpen);
  }, []);

  function toggleMessagesDock() {
    setMessagesDockOpen((open) => {
      const next = !open;
      localStorage.setItem(DOCK_KEY, next ? "1" : "0");
      return next;
    });
  }

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    setUser(getUser() || { id: "", name: "Guide", role: "guide" });
  }, [router, pathname]);

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const [threads, inbox, learnersRes] = await Promise.all([
          api("/guide/chat/threads"),
          api("/guide/notify/inbox"),
          api("/guide/learners"),
        ]);
        if (cancelled) return;
        const rows = (threads.threads || []) as { unreadForMentor?: number }[];
        setMessageUnread(rows.reduce((sum, t) => sum + (t.unreadForMentor || 0), 0));
        setNotifyUnread(Number(inbox.unread) || 0);
        const learners = (learnersRes.learners || []) as { syncedAt?: string | null }[];
        const synced = learners.filter((l) => l.syncedAt).length;
        setTodayProgress(learners.length ? Math.round((synced / learners.length) * 100) : 0);
      } catch {
        // ignore
      }
    };
    void loadUnread();
    const t = window.setInterval(() => void loadUnread(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  if (!user) return null;

  const showDock = messagesDockOpen && !onMessagesPage;
  const messagesActive = showDock || onMessagesPage;
  const notifyActive = notifyPanelOpen || onNotificationsPage;

  return (
    <div className={`shell${showDock ? " shell-dock-open" : ""}${sidebarCollapsed ? " shell-sidebar-collapsed" : ""}`}>
      <aside className={`sidebar${sidebarCollapsed ? " collapsed" : ""}`} aria-label="Main navigation">
        <div className="sidebar-head">
          <div className="sidebar-brand-block">
            <BrandLogo width={sidebarCollapsed ? 38 : 136} />
          </div>
          <button type="button" className="sidebar-collapse" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronLeft size={16} className={sidebarCollapsed ? "sidebar-collapse-flip" : undefined} />
          </button>
        </div>

        <div className="sidebar-body">
          {!sidebarCollapsed ? <div className="sidebar-label">Workspace</div> : null}
          <nav className="sidebar-nav sidebar-nav-main" aria-label="Workspace">
            {WORKSPACE_LINKS.map((link) => {
              const Icon = link.glyph;
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-item${active ? " active" : ""}`}
                  title={sidebarCollapsed ? link.label : undefined}
                >
                  <span className={`nav-glyph nav-glyph--${link.tone}`} aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  {!sidebarCollapsed ? <span className="sidebar-item-label">{link.label}</span> : null}
                  {!sidebarCollapsed && active && link.href === "/dashboard" ? (
                    <span className="sidebar-item-trail" aria-hidden="true">
                      <Gauge size={14} />
                    </span>
                  ) : null}
                  {!sidebarCollapsed && !(active && link.href === "/dashboard") ? (
                    <span className="sidebar-item-trail" aria-hidden="true">
                      <ChevronRight size={14} />
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-signout"
            onClick={() => {
              clearSession();
              router.replace("/");
            }}
            title={sidebarCollapsed ? "Sign out" : undefined}
          >
            <LogOut size={16} />
            {!sidebarCollapsed ? <span>Sign out</span> : null}
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-lead">
            <div className="topbar-date">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
              {todayProgress > 0 ? <span className="topbar-progress-pill">{todayProgress}% synced</span> : null}
          </div>

          <div className="topbar-actions">
            <div className="topbar-icons" aria-label="Communication">
              <button
                type="button"
                className={`topbar-iconlink${messagesActive ? " active" : ""}`}
                onClick={toggleMessagesDock}
                aria-pressed={messagesActive}
              >
                <MessageSquare size={16} />
                Messages
                {messageUnread > 0 ? <span className="topbar-badge">{messageUnread > 9 ? "9+" : messageUnread}</span> : null}
              </button>
              <button
                type="button"
                className={`topbar-iconlink${notifyActive ? " active" : ""}`}
                onClick={() => setNotifyPanelOpen((open) => !open)}
                aria-pressed={notifyActive}
              >
                <Bell size={16} />
                Notifications
                {notifyUnread > 0 ? <span className="topbar-badge">{notifyUnread > 9 ? "9+" : notifyUnread}</span> : null}
              </button>
            </div>

            <div className="topbar-mentor-wrap">
              <Link
                href="/dashboard/profile"
                className={`topbar-mentor${onProfilePage ? " active" : ""}`}
                aria-label="Open account and settings"
                onClick={() => setProfileMenuOpen(false)}
              >
                <img className="topbar-mentor-photo" src={avatarUrl(user.name || "Mentor")} alt="" />
                <div className="topbar-mentor-body">
                  <div className="topbar-mentor-name">{user.name}</div>
                </div>
              </Link>
              <div className="topbar-profile-menu-wrap">
                <button
                  type="button"
                  className="topbar-profile-menu-btn"
                  aria-label="Open profile menu"
                  aria-expanded={profileMenuOpen}
                  onClick={() => setProfileMenuOpen((v) => !v)}
                >
                  <MoreHorizontal size={16} />
                </button>
                {profileMenuOpen ? (
                  <div className="topbar-profile-menu">
                    <Link href="/dashboard/profile" className="topbar-profile-menu-item" onClick={() => setProfileMenuOpen(false)}>
                      Profile
                    </Link>
                    <button
                      type="button"
                      className="topbar-profile-menu-item danger"
                      onClick={() => {
                        clearSession();
                        router.replace("/");
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {notifyPanelOpen && !onNotificationsPage ? (
          <div className="sidepanel-backdrop" onClick={() => setNotifyPanelOpen(false)} role="dialog" aria-modal="true">
            <div className="sidepanel sidepanel-notify" onClick={(e) => e.stopPropagation()}>
              <div className="sidepanel-head">
                <div className="sidepanel-title">Notifications</div>
                <div className="sidepanel-actions">
                  <Link href="/dashboard/notifications" className="mini-link" onClick={() => setNotifyPanelOpen(false)}>
                    Open full page
                  </Link>
                  <button type="button" className="mini-link" onClick={() => setNotifyPanelOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
              <div className="sidepanel-body">
                <NotifyPanel compact onUnreadChange={setNotifyUnread} onClose={() => setNotifyPanelOpen(false)} />
              </div>
            </div>
          </div>
        ) : null}

        <div className={`workspace-row${showDock ? " with-dock" : ""}`}>
          <main ref={mainRef} className="content-main">
            {children}
          </main>

          {showDock ? (
            <aside className="message-dock" aria-label="Messages dock">
              <div className="message-dock-head">
                <div>
                  <div className="message-dock-title">Messages</div>
                </div>
                <div className="message-dock-actions">
                  <Link href="/dashboard/messages" className="mini-link">
                    Expand
                  </Link>
                  <button type="button" className="message-dock-collapse" onClick={toggleMessagesDock} aria-label="Hide messages dock">
                    <PanelRightClose size={16} />
                  </button>
                </div>
              </div>
              <div className="message-dock-body">
                <MentorChatPanel dock compact initialChat={dockChat} onUnreadChange={setMessageUnread} />
              </div>
            </aside>
          ) : null}
        </div>
      </div>
      <ToastHost />
    </div>
  );
}
