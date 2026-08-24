"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DataListToolbar } from "@/components/DataListToolbar";
import { PageSkeleton } from "@/components/PageSkeleton";
import { downloadJson } from "@/lib/dataTools";
import { useDebouncedValue } from "@/lib/useDebounced";
import { toast } from "@/lib/toast";

type ReferralTotals = {
  codes: number;
  claims: number;
  rewarded: number;
  pending: number;
};

type ReferralLeader = {
  referrerId: string;
  code: string;
  total: number;
  rewarded: number;
  latestAt?: string;
  name: string;
  email?: string;
  phone?: string;
  childName?: string;
};

type ReferralClaimRow = {
  id: string;
  code: string;
  referrerId: string;
  referredId: string;
  referrerName: string;
  referredName: string;
  referredChild?: string;
  status: string;
  referrerBuzz: number;
  referredBuzz: number;
  referrerDiscountPct: number;
  referredDiscountPct: number;
  createdAt: string;
  rewardedAt?: string;
  note?: string;
};

function when(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totals, setTotals] = useState<ReferralTotals | null>(null);
  const [leaders, setLeaders] = useState<ReferralLeader[]>([]);
  const [claims, setClaims] = useState<ReferralClaimRow[]>([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 120);

  useEffect(() => {
    setLoading(true);
    api("/guide/referrals")
      .then((data) => {
        setTotals(data.totals || null);
        setLeaders(data.leaders || []);
        setClaims(data.claims || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredClaims = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    if (!needle) return claims;
    return claims.filter((c) => {
      const hay = [c.referrerName, c.referredName, c.referredChild, c.code, c.status, c.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [claims, debouncedQ]);

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <div className="page wide">
      <h1 className="hello">Referrals</h1>
      <p className="lede" style={{ marginTop: -4, marginBottom: 16 }}>
        Who invited whom, Buzz rewards, and membership discounts across families.
      </p>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="stat-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="eyebrow">Invite codes</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{totals?.codes ?? 0}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="eyebrow">Joins</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{totals?.claims ?? 0}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="eyebrow">Rewarded</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{totals?.rewarded ?? 0}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="eyebrow">Pending</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{totals?.pending ?? 0}</div>
        </div>
      </div>

      <h2 className="section">Top referrers</h2>
      <div className="grid" style={{ marginBottom: 22 }}>
        {leaders.length ? (
          leaders.slice(0, 12).map((row) => (
            <Link key={row.referrerId} href={`/dashboard/learners/${row.referrerId}`} className="slot">
              <div>
                <div className="slot-title">{row.name}</div>
                <div className="slot-sub">
                  {row.childName ? `${row.childName} · ` : ""}
                  Code {row.code || "—"}
                </div>
                <div className="slot-meta" style={{ marginTop: 8 }}>
                  {row.total} join{row.total === 1 ? "" : "s"} · {row.rewarded} rewarded
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="hint">No referrals yet. Families share codes from the app Parent Access → Refer & earn.</p>
        )}
      </div>

      <h2 className="section">All referrals</h2>
      <DataListToolbar
        label={`${filteredClaims.length} referral${filteredClaims.length === 1 ? "" : "s"}`}
        onExport={async () => {
          const data = await api("/guide/referrals");
          downloadJson(`britbee-referrals-${Date.now()}.json`, data);
          toast("Referrals export downloaded.", "success");
        }}
      />
      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by parent, child, code, or status"
      />

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th align="left">When</th>
              <th align="left">Referrer</th>
              <th align="left">Joined</th>
              <th align="left">Code</th>
              <th align="left">Rewards</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map((c) => (
              <tr key={c.id}>
                <td>{when(c.createdAt)}</td>
                <td>
                  <Link href={`/dashboard/learners/${c.referrerId}`} className="table-link">
                    {c.referrerName}
                  </Link>
                </td>
                <td>
                  <Link href={`/dashboard/learners/${c.referredId}`} className="table-link">
                    {c.referredName}
                  </Link>
                  {c.referredChild ? <div className="mini">{c.referredChild}</div> : null}
                </td>
                <td>
                  <code>{c.code}</code>
                </td>
                <td>
                  +{c.referrerBuzz} / +{c.referredBuzz} Buzz
                  <div className="mini">
                    {c.referrerDiscountPct}% / {c.referredDiscountPct}% plan
                  </div>
                </td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredClaims.length ? <p className="hint" style={{ padding: 12 }}>No matching referrals.</p> : null}
      </div>
    </div>
  );
}
