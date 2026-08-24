"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Learner } from "@/lib/api";
import { ACTIVITY_CATALOG } from "@/lib/activities";
import { activityStatLine, displayStatus } from "@/lib/progress";
import { sessionPlan } from "@/lib/today";
import { StatusChip } from "@/components/StatusChip";
import { DataListToolbar } from "@/components/DataListToolbar";
import { RosterPanel } from "@/components/RosterPanel";
import { downloadJson } from "@/lib/dataTools";

function labelOf(l: Learner) {
  return l.childLabel || l.child?.childName || l.name;
}

type ActivityTab = "hub" | "roster";

function ActivitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: ActivityTab = searchParams.get("tab") === "roster" ? "roster" : "hub";
  const [learners, setLearners] = useState<Learner[]>([]);
  const [error, setError] = useState("");
  const plan = sessionPlan();

  useEffect(() => {
    api("/guide/board")
      .then((data) => setLearners(data.learners || []))
      .catch((e: Error) => setError(e.message));
  }, []);

  const live = useMemo(() => learners.filter((l) => l.syncedAt).length, [learners]);

  function setTab(next: ActivityTab) {
    router.replace(next === "roster" ? "/dashboard/activities?tab=roster" : "/dashboard/activities");
  }

  return (
    <div className="page wide">
      <div className="page-head">
        <h1 className="hello">Activities</h1>
      </div>

      <div className="tabs activities-tabs" role="tablist" aria-label="Activities views">
        <button type="button" role="tab" aria-selected={tab === "hub"} className={`tab ${tab === "hub" ? "on" : ""}`} onClick={() => setTab("hub")}>
          Quest hub
        </button>
        <button type="button" role="tab" aria-selected={tab === "roster"} className={`tab ${tab === "roster" ? "on" : ""}`} onClick={() => setTab("roster")}>
          Content roster
        </button>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      {tab === "roster" ? (
        <RosterPanel />
      ) : (
        <>
          <div className="page-kpis">
            <div className="kpi">
              <b>{learners.length}</b>
              <span>Learners</span>
            </div>
            <div className="kpi">
              <b>{live}</b>
              <span>App Synced</span>
            </div>
            <div className="kpi">
              <b>{plan.sound.glyph}</b>
              <span>Today&apos;s Daily Buzz</span>
            </div>
          </div>

          <section className="section-block">
            <div className="section-head">
              <h2 className="section-title">Quest path</h2>
            </div>
            <div className="grid">
              {ACTIVITY_CATALOG.map((a) => (
                <Link key={a.id} href={`/dashboard/activities/${a.id}`} className="slot">
                  <div className="slot-icon" style={{ background: a.color }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3>
                      {a.quest}. {a.name}
                    </h3>
                    <p>
                      {a.appTitle} · {a.duration}
                    </p>
                    <p style={{ marginTop: 6, color: "var(--ink)" }}>{a.order}</p>
                  </div>
                  <span className="chip">Open</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="section-block">
            <div className="section-head">
              <h2 className="section-title">By learner</h2>
            </div>
            <DataListToolbar
              label={`${learners.length} learners · activity statuses`}
              onExport={async () => {
                const data = await api("/guide/board");
                downloadJson(`britbee-activities-board-${Date.now()}.json`, data);
              }}
            />
            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th>Child</th>
                    {ACTIVITY_CATALOG.map((a) => (
                      <th key={a.id}>{a.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {learners.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link href={`/dashboard/learners/${l.id}`} className="table-link">
                          {labelOf(l)}
                        </Link>
                        <div className="mini">{l.progress ? `${l.progress.points} Buzz` : "No app sync"}</div>
                      </td>
                      {ACTIVITY_CATALOG.map((a) => {
                        const coach = l.activities?.[a.id] || null;
                        const status = displayStatus(a.id, coach, l.progress || null);
                        return (
                          <td key={a.id}>
                            <StatusChip status={status} />
                            <div className="mini">{activityStatLine(a.id, l.progress || null)}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!learners.length && !error ? (
                    <tr>
                      <td colSpan={6} className="hint">
                        No learners yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function ActivitiesHubPage() {
  return (
    <Suspense fallback={<div className="page wide"><p className="hint">Loading activities…</p></div>}>
      <ActivitiesContent />
    </Suspense>
  );
}
