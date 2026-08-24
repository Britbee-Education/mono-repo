"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Props = {
  userId: string;
};

type ParentReferral = {
  parent: { id: string; name: string; childName?: string };
  code: string;
  wallet?: {
    totalReferrals: number;
    rewardedReferrals: number;
    buzzEarned: number;
    nextDiscountPct: number;
    welcomeDiscountPct: number;
    welcomeUsed: boolean;
  };
  claims: Array<{
    id: string;
    referredId: string;
    referredName: string;
    referredChild?: string;
    status: string;
    referrerBuzz: number;
    referrerDiscountPct: number;
    createdAt: string;
  }>;
};

function when(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export function ParentReferralPanel({ userId }: Props) {
  const [data, setData] = useState<ParentReferral | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/guide/referrals/parents/${userId}`)
      .then((row) => setData(row))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="section" style={{ marginTop: 0 }}>
          Referrals
        </h2>
        <p className="hint">Loading family invites…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="section" style={{ marginTop: 0 }}>
          Referrals
        </h2>
        <p className="hint">{error || "Could not load referrals."}</p>
        <Link href="/dashboard/referrals" className="mini-link">
          Open referrals desk
        </Link>
      </section>
    );
  }

  const w = data.wallet;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h2 className="section" style={{ marginTop: 0, marginBottom: 0 }}>
          Referrals
        </h2>
        <Link href="/dashboard/referrals" className="mini-link">
          All referrals
        </Link>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        Family code <strong>{data.code}</strong>
        {w ? (
          <>
            {" "}
            · {w.totalReferrals} join{w.totalReferrals === 1 ? "" : "s"} · +{w.buzzEarned} Buzz earned ·{" "}
            {w.nextDiscountPct || 0}% next plan discount
            {!w.welcomeUsed && w.welcomeDiscountPct ? ` · ${w.welcomeDiscountPct}% welcome waiting` : ""}
          </>
        ) : null}
      </p>

      {data.claims.length ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {data.claims.map((c) => (
            <li
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 0",
                borderTop: "1px solid #EEF1F6",
                fontSize: 13,
              }}
            >
              <div>
                <Link href={`/dashboard/learners/${c.referredId}`} className="table-link">
                  {c.referredName}
                </Link>
                {c.referredChild ? <div className="mini">{c.referredChild}</div> : null}
                <div className="mini">
                  {when(c.createdAt)} · {c.status} · +{c.referrerBuzz} Buzz · +{c.referrerDiscountPct}%
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint" style={{ marginTop: 10 }}>
          This family has not referred anyone yet.
        </p>
      )}
    </section>
  );
}
