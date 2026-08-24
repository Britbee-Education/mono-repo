"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Learner } from "@/lib/api";
import { DataListToolbar } from "@/components/DataListToolbar";
import { ParentBillingQueue } from "@/components/ParentBillingPanel";
import { PageSkeleton } from "@/components/PageSkeleton";
import { downloadJson } from "@/lib/dataTools";
import { useDebouncedValue } from "@/lib/useDebounced";
import { toast } from "@/lib/toast";
import { InitialsMark } from "@/components/MascotMark";

function last10(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function childName(l: Learner) {
  return l.child?.childName || l.name;
}

type LearnerTab = "learners" | "billing";

function LearnersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: LearnerTab = searchParams.get("tab") === "billing" ? "billing" : "learners";
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 100);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api("/guide/learners").then((data) => setLearners(data.learners || [])),
      api("/guide/billing/overview").then((data) => setPendingCount(data.overview?.pendingCount || 0)),
    ])
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    if (!needle) return learners;
    return learners.filter((l) => {
      const hay = [childName(l), l.name, l.email, l.phone, l.child?.level, l.child?.goal]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [learners, debouncedQ]);

  if (loading && tab === "learners") return <PageSkeleton rows={5} />;

  function setTab(next: LearnerTab) {
    router.replace(next === "billing" ? "/dashboard/learners?tab=billing" : "/dashboard/learners");
  }

  return (
    <div className="page wide">
      <h1 className="hello">Learners</h1>

      <div className="tabs" role="tablist" aria-label="Learners views">
        <button type="button" role="tab" aria-selected={tab === "learners"} className={`tab ${tab === "learners" ? "on" : ""}`} onClick={() => setTab("learners")}>
          All learners
        </button>
        <button type="button" role="tab" aria-selected={tab === "billing"} className={`tab ${tab === "billing" ? "on" : ""}`} onClick={() => setTab("billing")}>
          Parent billing
          {pendingCount > 0 ? <span className="tab-dot">{pendingCount}</span> : null}
        </button>
      </div>

      {tab === "billing" ? (
        <ParentBillingQueue />
      ) : (
        <>
          <DataListToolbar
            label={`${filtered.length} learner${filtered.length === 1 ? "" : "s"}`}
            onExport={async () => {
              const data = await api("/guide/learners");
              downloadJson(`britbee-learners-${Date.now()}.json`, data);
              toast("Learners export downloaded.", "success");
            }}
          />
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by child, parent, or phone" />
          {error ? <div className="error-box">{error}</div> : null}
          <div className="grid">
            {filtered.map((l) => {
              const phone = last10(l.phone);
              return (
                <Link key={l.id} href={`/dashboard/learners/${l.id}`} className="slot">
                  <div className="slot-icon" style={{ background: "#FFF8E1", display: "grid", placeItems: "center" }}>
                    <InitialsMark name={childName(l)} size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3>{childName(l)}</h3>
                    <p>
                      {l.child?.childName ? `Parent: ${l.name}` : l.role}
                      {l.child?.level ? ` · ${l.child.level}` : ""}
                      {phone ? ` · +91 ${phone}` : ""}
                    </p>
                    {l.lastNote ? <p style={{ marginTop: 6, color: "var(--ink)" }}>{l.lastNote}</p> : <p>No session notes yet</p>}
                  </div>
                  {l.child?.level ? <span className="chip">{l.child.level}</span> : null}
                </Link>
              );
            })}
            {!filtered.length && !error ? <p className="hint">No learners match that search.</p> : null}
          </div>
        </>
      )}
    </div>
  );
}

export default function LearnersPage() {
  return (
    <Suspense fallback={<div className="page">Loading…</div>}>
      <LearnersContent />
    </Suspense>
  );
}
