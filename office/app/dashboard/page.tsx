"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, MessageCircle, Users, Video } from "lucide-react";
import { api, getUser, type Learner } from "@/lib/api";
import type { ActivityId } from "@/lib/activities";
import { displayStatus } from "@/lib/progress";
import { ACTIVITIES, sessionPlan } from "@/lib/today";

type GuidanceTab = "guidance" | "learning";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(name?: string) {
  if (!name) return "Mentor";
  return name.trim().split(/\s+/)[0] || "Mentor";
}

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer-neutral/png?seed=${encodeURIComponent(seed || "Learner")}&size=64`;
}

function labelOf(l: Learner) {
  return l.childLabel || l.child?.childName || l.name || "Learner";
}

function levelLabel(level?: string) {
  if (level === "advanced") return "Advanced";
  if (level === "intermediate") return "Intermediate";
  return "Beginner";
}

function fillColor(hex: string) {
  const a = hex.slice(-2).toLowerCase();
  if (a === "22" || a === "33" || a === "66") return hex.slice(0, -2) + "ff";
  return hex;
}

function learnerStatus(l: Learner, id: ActivityId) {
  return displayStatus(id, l.activities?.[id] || null, l.progress || null);
}

export default function TodayPage() {
  const plan = sessionPlan();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [guidanceTab, setGuidanceTab] = useState<GuidanceTab>("guidance");
  const mentor = getUser();

  useEffect(() => {
    api("/guide/learners")
      .then((data) => setLearners(data.learners || []))
      .catch(() => setLearners([]));
    api("/guide/billing/overview")
      .then((data) => setPendingPayments(data.overview?.pendingCount || 0))
      .catch(() => setPendingPayments(0));
  }, []);

  const totalLearners = learners.length;
  const syncedCount = learners.filter((l) => l.syncedAt).length;
  const syncPct = totalLearners ? syncedCount / totalLearners : 0;

  const learnerOps = useMemo(
    () =>
      learners
        .map((l) => {
          const review = ACTIVITIES.filter((a) => learnerStatus(l, a.href) === "needs-review").length;
          const active = ACTIVITIES.filter((a) => learnerStatus(l, a.href) === "in-progress").length;
          const cleared = ACTIVITIES.filter((a) => learnerStatus(l, a.href) === "cleared").length;
          return { l, review, active, cleared };
        })
        .sort((a, b) => b.review - a.review || b.active - a.active || b.cleared - a.cleared),
    [learners]
  );

  const needsGuidance = learnerOps.filter((x) => x.review > 0).slice(0, 4);
  const learningNow = learnerOps.filter((x) => x.active > 0).slice(0, 4);
  const celebrating = learnerOps.filter((x) => x.cleared > 0).slice(0, 3);
  const guidanceRows = guidanceTab === "guidance" ? needsGuidance : learningNow;

  const totalNeedsReview = learnerOps.filter((x) => x.review > 0).length;
  const totalInProgress = learnerOps.filter((x) => x.active > 0).length;
  const notSynced = totalLearners - syncedCount;

  const completionRows = ACTIVITIES.map((a) => {
    const cleared = learners.filter((l) => learnerStatus(l, a.href) === "cleared").length;
    const pct = totalLearners ? cleared / totalLearners : 0;
    return { a, cleared, pct };
  });

  return (
    <div className="page dashboard-page mentor-home">
      <header className="dashboard-command mentor-command" aria-label="Dashboard">
        <div className="mentor-command-main">
          <h1 className="mentor-greeting">
            {greeting()}, {firstName(mentor?.name)}
          </h1>
          <p className="mentor-greeting-sub">
            {totalLearners} learner{totalLearners === 1 ? "" : "s"}
          </p>
        </div>
        <div className="mentor-command-rail">
          <div className="mentor-live-stats" aria-label="Today">
            <div className="mentor-live-stat">
              <span className="mentor-live-value">{totalNeedsReview}</span>
              <span className="mentor-live-label">Review</span>
            </div>
            <div className="mentor-live-stat">
              <span className="mentor-live-value">{totalInProgress}</span>
              <span className="mentor-live-label">Active</span>
            </div>
            <div className="mentor-live-stat accent">
              <span className="mentor-live-value">{Math.round(syncPct * 100)}%</span>
              <span className="mentor-live-label">Synced</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mentor-home-body">
        <section className="mentor-today-bar" aria-label="Today">
          <div className="mentor-today-main">
            <span className="mentor-today-chip">Story · {plan.story.title}</span>
            <span className="mentor-today-chip">
              Sound · {plan.sound.title} {plan.sound.glyph}
            </span>
          </div>
          <Link href="/dashboard/activities/story" className="mentor-today-link">
            Open story
            <ArrowRight size={14} />
          </Link>
        </section>

        <div className="mentor-home-grid">
          <section className="mentor-panel mentor-panel-guidance">
            <div className="mentor-panel-head">
              <h3 className="mentor-panel-title">Learners</h3>
              <Link href="/dashboard/learners" className="mini-link">
                All
              </Link>
            </div>
            <div className="mentor-segments" role="tablist" aria-label="Learner views">
              <button
                type="button"
                role="tab"
                aria-selected={guidanceTab === "guidance"}
                className={`mentor-segment${guidanceTab === "guidance" ? " on" : ""}`}
                onClick={() => setGuidanceTab("guidance")}
              >
                Needs review
                {totalNeedsReview > 0 ? <span className="mentor-segment-count">{totalNeedsReview}</span> : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={guidanceTab === "learning"}
                className={`mentor-segment${guidanceTab === "learning" ? " on" : ""}`}
                onClick={() => setGuidanceTab("learning")}
              >
                In progress
                {totalInProgress > 0 ? <span className="mentor-segment-count">{totalInProgress}</span> : null}
              </button>
            </div>
            <div className="mentor-panel-body">
              {!guidanceRows.length ? (
                <div className="mentor-empty-state">
                  <Users size={22} aria-hidden="true" />
                  <p>{guidanceTab === "guidance" ? "Nothing to review." : "No active sessions."}</p>
                </div>
              ) : (
                <div className="mentor-learner-list">
                  {guidanceRows.map(({ l, review, active, cleared }) => (
                    <Link key={l.id} href={`/dashboard/learners/${l.id}`} className="mentor-learner-row">
                      <img className="mentor-learner-avatar" src={avatarUrl(labelOf(l))} alt="" />
                      <span className="mentor-learner-body">
                        <span className="mentor-learner-name">{labelOf(l)}</span>
                        <span className="mentor-learner-level">{levelLabel(l.child?.level)}</span>
                        <span className="mentor-learner-note">
                          {guidanceTab === "guidance"
                            ? `${review} to review`
                            : `${active} active · ${cleared} done`}
                        </span>
                      </span>
                      <span className="mentor-learner-cta">Open</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mentor-panel mentor-panel-journey">
            <div className="mentor-panel-head">
              <h3 className="mentor-panel-title">Today&apos;s path</h3>
              <Link href="/dashboard/activities?tab=roster" className="mini-link">
                Roster
              </Link>
            </div>
            <div className="mentor-panel-body mentor-journey-body">
              <div className="mentor-journey-track">
                {ACTIVITIES.map((a, idx) => (
                  <Link key={a.href} href={`/dashboard/activities/${a.href}`} className="mentor-journey-step">
                    <span className="mentor-journey-index" style={{ background: fillColor(a.color) }}>
                      {idx + 1}
                    </span>
                    <span className="mentor-journey-label">{a.title}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="mentor-panel-foot">
              <Link href="/dashboard/activities/sentence" className="btn btn-yellow mentor-start-btn">
                Open Daily Buzz
              </Link>
            </div>
          </section>

          <section className="mentor-panel mentor-panel-impact">
            <div className="mentor-panel-head">
              <h3 className="mentor-panel-title">Class sync</h3>
            </div>
            <div className="mentor-panel-body mentor-impact-body">
              <div className="mentor-impact-hero">
                <div className="mentor-impact-ring" style={{ "--pct": syncPct } as CSSProperties}>
                  <span className="mentor-impact-value">{Math.round(syncPct * 100)}%</span>
                  <span className="mentor-impact-caption">Synced</span>
                </div>
                <div className="mentor-impact-stats">
                  <div className="mentor-impact-stat">
                    <strong>{syncedCount}</strong>
                    <span>Synced</span>
                  </div>
                  <div className="mentor-impact-stat">
                    <strong>{notSynced}</strong>
                    <span>Pending</span>
                  </div>
                  <div className="mentor-impact-stat">
                    <strong>{totalLearners}</strong>
                    <span>Total</span>
                  </div>
                </div>
              </div>
              <div className="mentor-progress-list">
                {completionRows.map(({ a, cleared, pct }) => (
                  <div key={a.href} className="mentor-progress-row">
                    <span className="mentor-progress-icon">{a.icon}</span>
                    <div className="mentor-progress-main">
                      <span className="mentor-progress-label">{a.title}</span>
                      <span className="mentor-progress-bar" aria-hidden="true">
                        <span className="mentor-progress-fill" style={{ width: `${Math.round(pct * 100)}%`, background: fillColor(a.color) }} />
                      </span>
                    </div>
                    <span className="mentor-progress-count">{cleared}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mentor-panel mentor-panel-care">
            <div className="mentor-panel-head">
              <h3 className="mentor-panel-title">Quick actions</h3>
            </div>
            <div className="mentor-panel-body">
              <div className="mentor-care-grid">
                <Link href="/dashboard/classes" className="mentor-care-action">
                  <span className="mentor-care-icon live">
                    <Video size={18} />
                  </span>
                  <strong>Live class</strong>
                </Link>
                <Link href="/dashboard/messages" className="mentor-care-action">
                  <span className="mentor-care-icon message">
                    <MessageCircle size={18} />
                  </span>
                  <strong>Messages</strong>
                </Link>
                <Link href="/dashboard/learners" className="mentor-care-action">
                  <span className="mentor-care-icon roster">
                    <Users size={18} />
                  </span>
                  <strong>Learners</strong>
                </Link>
                <Link href="/dashboard/learners?tab=billing" className="mentor-care-action">
                  <span className="mentor-care-icon live">
                    <CreditCard size={18} />
                  </span>
                  <strong>
                    Billing
                    {pendingPayments > 0 ? ` (${pendingPayments})` : ""}
                  </strong>
                </Link>
              </div>
              <div className="mentor-celebrate">
                <div className="mentor-celebrate-head">
                  <span className="mentor-celebrate-title">Recent wins</span>
                  <Link href="/dashboard/learners" className="mini-link">
                    All
                  </Link>
                </div>
                {!celebrating.length ? (
                  <p className="hint mentor-celebrate-empty">No wins yet today.</p>
                ) : (
                  <div className="mentor-celebrate-list">
                    {celebrating.map(({ l, cleared }) => (
                      <Link key={l.id} href={`/dashboard/learners/${l.id}`} className="mentor-celebrate-row">
                        <img className="mentor-celebrate-avatar" src={avatarUrl(labelOf(l))} alt="" />
                        <span className="mentor-celebrate-name">{labelOf(l)}</span>
                        <span className="mentor-celebrate-meta">{cleared} cleared</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
