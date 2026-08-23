"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import {
  activityEmoji,
  formatInr,
  formatWhen,
  paymentStatusLabel,
  planLabel,
  relativeTime,
  subscriptionLabel,
  type BillingInvoice,
  type BillingPayment,
  type BillingSubscription,
  type ParentActivity,
  type PaymentMethod,
  type PlanId,
} from "@/lib/billing";

type Props = {
  userId: string;
  parentName?: string;
};

export function ParentBillingPanel({ userId, parentName }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [pending, setPending] = useState<BillingPayment[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [activity, setActivity] = useState<ParentActivity[]>([]);
  const [planPick, setPlanPick] = useState<PlanId>("monthly");
  const [method, setMethod] = useState<PaymentMethod>("upi");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/guide/billing/parents/${userId}`);
      setSubscription(data.subscription);
      setPending(data.pendingPayments || []);
      setPayments(data.payments || []);
      setInvoices(data.invoices || []);
      setActivity(data.activity || []);
      if (data.subscription?.planId) setPlanPick(data.subscription.planId === "yearly" ? "yearly" : "monthly");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load billing.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(path: string, body?: Record<string, unknown>) {
    setBusy(path);
    setError("");
    try {
      await api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      await refresh();
      toast("Billing updated — parent app will reflect this.", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Action failed.";
      setError(msg);
      toast(msg, "error");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="card parent-billing"><p className="hint">Loading billing…</p></div>;

  const sub = subscription;
  const renews = sub ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <section className="parent-billing">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <h2 className="section" style={{ margin: 0 }}>
          Parent billing
        </h2>
        <p className="hint">
          Synced with the parent shell in the kids app{parentName ? ` · ${parentName}` : ""}
        </p>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="parent-billing-kpis">
        <div className="kpi">
          <b>{sub ? planLabel(sub.planId) : "—"}</b>
          <span>Current plan</span>
        </div>
        <div className="kpi">
          <b>{sub ? subscriptionLabel(sub.status) : "—"}</b>
          <span>Status</span>
        </div>
        <div className="kpi">
          <b>{pending.length}</b>
          <span>Pending payments</span>
        </div>
        <div className="kpi">
          <b>{renews}</b>
          <span>{sub?.cancelAtPeriodEnd ? "Access until" : "Renews"}</span>
        </div>
      </div>

      <div className="workspace-split">
        <article className="card">
          <h3 className="eyebrow">Collect payment</h3>
          <p className="hint">Start a checkout on behalf of the parent — they&apos;ll see it in their billing screen.</p>
          <div className="row-actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <label className="field" style={{ flex: 1, minWidth: 140 }}>
              <span>Plan</span>
              <select value={planPick} onChange={(e) => setPlanPick(e.target.value as PlanId)}>
                <option value="monthly">Hive Monthly · {formatInr(49900)}</option>
                <option value="yearly">Hive Yearly · {formatInr(499900)}</option>
              </select>
            </label>
            <label className="field" style={{ flex: 1, minWidth: 120 }}>
              <span>Method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Net banking</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="btn btn-yellow"
            style={{ marginTop: 10, maxWidth: 220 }}
            disabled={Boolean(busy) || pending.length > 0}
            onClick={() => act(`/guide/billing/parents/${userId}/checkout`, { planId: planPick, method })}
          >
            {busy.includes("checkout") ? "Starting…" : "Start payment link"}
          </button>
          {pending.length > 0 ? <p className="mini" style={{ marginTop: 8 }}>Clear the pending payment before starting another.</p> : null}
        </article>

        <article className="card">
          <h3 className="eyebrow">Manage subscription</h3>
          <p className="hint">Grant a plan or adjust cancellation — updates parent settings in the app.</p>
          <div className="row-actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
            {(["trial", "monthly", "yearly"] as PlanId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={`chip-btn${sub?.planId === id ? " on" : ""}`}
                disabled={Boolean(busy)}
                onClick={() => act(`/guide/billing/parents/${userId}/plan`, { planId: id })}
              >
                {planLabel(id)}
              </button>
            ))}
          </div>
          <div className="row-actions" style={{ marginTop: 12 }}>
            {sub?.cancelAtPeriodEnd ? (
              <button
                type="button"
                className="btn btn-navy"
                style={{ height: 38, fontSize: 13 }}
                disabled={Boolean(busy)}
                onClick={() => act(`/guide/billing/parents/${userId}/subscription/resume`)}
              >
                Resume auto-renew
              </button>
            ) : sub && sub.planId !== "trial" ? (
              <button
                type="button"
                className="btn btn-navy"
                style={{ height: 38, fontSize: 13 }}
                disabled={Boolean(busy)}
                onClick={() => act(`/guide/billing/parents/${userId}/subscription/cancel`, { atPeriodEnd: true })}
              >
                Cancel at period end
              </button>
            ) : null}
          </div>
        </article>
      </div>

      {pending.length ? (
        <>
          <h3 className="section">Pending BritBee Pay reviews</h3>
          <p className="hint">Parents pay via mentor GPay QR, then submit a UPI ID or screenshot. Activate only after you verify the transfer.</p>
          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Proof</th>
                  <th>Started</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>{planLabel(p.planId)}</div>
                      <span className="mini">{p.orderRef || p.id} · {p.status}</span>
                    </td>
                    <td>{formatInr(p.amount)}</td>
                    <td>
                      {p.transactionId ? <div><code>{p.transactionId}</code></div> : null}
                      {p.proofUrl ? (
                        <a href={p.proofUrl} target="_blank" rel="noreferrer" className="table-link">
                          View screenshot
                        </a>
                      ) : null}
                      {!p.transactionId && !p.proofUrl ? <span className="mini">Waiting for parent proof</span> : null}
                    </td>
                    <td>{relativeTime(p.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-yellow"
                          style={{ height: 34, fontSize: 12 }}
                          disabled={Boolean(busy) || (!p.transactionId && !p.proofUrl && p.status === "pending")}
                          onClick={() => act(`/guide/billing/parents/${userId}/payments/${p.id}/confirm`)}
                        >
                          Activate plan
                        </button>
                        <button
                          type="button"
                          className="btn btn-navy"
                          style={{ height: 34, fontSize: 12 }}
                          disabled={Boolean(busy)}
                          onClick={() => act(`/guide/billing/parents/${userId}/payments/${p.id}/fail`, { reason: "Could not verify BritBee Pay proof" })}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <div className="workspace-split">
        <div>
          <h3 className="section">Payment history</h3>
          <div className="card">
            {payments.length ? (
              payments.slice(0, 8).map((p) => (
                <div key={p.id} className="billing-row">
                  <div>
                    <strong>{planLabel(p.planId)}</strong>
                    <span className="mini"> · {formatWhen(p.createdAt)}</span>
                  </div>
                  <div className="row-actions">
                    <span className="chip">{paymentStatusLabel(p.status)}</span>
                    <span>{formatInr(p.amount)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="hint">No payments yet.</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="section">Recent invoices</h3>
          <div className="card">
            {invoices.length ? (
              invoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="billing-row">
                  <div>
                    <strong>{planLabel(inv.planId)}</strong>
                    <span className="mini"> · {formatWhen(inv.paidAt || inv.createdAt)}</span>
                  </div>
                  <span>{formatInr(inv.amount)}</span>
                </div>
              ))
            ) : (
              <p className="hint">No invoices yet.</p>
            )}
          </div>
        </div>
      </div>

      <h3 className="section">Parent activity</h3>
      <p className="hint">Same timeline the parent sees under Family activity in the kids app.</p>
      <div className="card">
        {activity.length ? (
          activity.map((a) => (
            <article key={a.id} className="billing-activity">
              <span className="billing-activity-icon" aria-hidden="true">
                {activityEmoji(a.type)}
              </span>
              <div>
                <strong>{a.title}</strong>
                {a.detail ? <p className="mini">{a.detail}</p> : null}
                <time className="mini">
                  {relativeTime(a.createdAt)}
                  {a.childName ? ` · ${a.childName}` : ""}
                </time>
              </div>
            </article>
          ))
        ) : (
          <p className="hint">No activity logged yet.</p>
        )}
      </div>
    </section>
  );
}

type QueueProps = {
  onSelectParent?: (id: string) => void;
};

export function ParentBillingQueue({ onSelectParent }: QueueProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [overview, setOverview] = useState<{ pendingCount: number; activeCount: number; pastDueCount: number; trialingCount: number } | null>(null);
  const [pending, setPending] = useState<
    Array<{
      id: string;
      userId: string;
      planId: PlanId;
      amount: number;
      method?: PaymentMethod;
      createdAt: string;
      parent: { id: string; name: string; child?: { childName?: string } } | null;
    }>
  >([]);
  const [parents, setParents] = useState<
    Array<{
      id: string;
      name: string;
      childName?: string;
      subscription: BillingSubscription;
      pendingCount: number;
    }>
  >([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ov, pend, rows] = await Promise.all([
        api("/guide/billing/overview"),
        api("/guide/billing/pending"),
        api("/guide/billing/parents"),
      ]);
      setOverview(ov.overview);
      setPending(pend.pending || []);
      setParents(rows.parents || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function confirmPayment(userId: string, paymentId: string) {
    setBusy(paymentId);
    setError("");
    try {
      await api(`/guide/billing/parents/${userId}/payments/${paymentId}/confirm`, { method: "POST" });
      await refresh();
      toast("Payment confirmed.", "success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not confirm.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <p className="hint">Loading parent billing…</p>;

  return (
    <div className="parent-billing-queue">
      {error ? <div className="error-box">{error}</div> : null}

      {overview ? (
        <div className="parent-billing-kpis">
          <div className="kpi">
            <b>{overview.pendingCount}</b>
            <span>Pending</span>
          </div>
          <div className="kpi">
            <b>{overview.activeCount}</b>
            <span>Active subs</span>
          </div>
          <div className="kpi">
            <b>{overview.pastDueCount}</b>
            <span>Past due</span>
          </div>
          <div className="kpi">
            <b>{overview.trialingCount}</b>
            <span>On trial</span>
          </div>
        </div>
      ) : null}

      <h3 className="section">Pending BritBee Pay queue</h3>
      <p className="hint">Verify UPI / GPay transfers, then activate — the parent shell updates instantly.</p>
      <div className="table-wrap">
        {pending.length ? (
          <table className="sheet">
            <thead>
              <tr>
                <th>Parent</th>
                <th>Plan</th>
                <th>Proof</th>
                <th>Started</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/dashboard/learners/${p.userId}`} className="table-link">
                      {p.parent?.name || "Parent"}
                    </Link>
                    {p.parent?.child?.childName ? <span className="mini"> · {p.parent.child.childName}</span> : null}
                  </td>
                  <td>
                    {planLabel(p.planId)}
                    <div className="mini">{formatInr(p.amount)}</div>
                  </td>
                  <td>
                    {p.transactionId ? <div><code>{p.transactionId}</code></div> : null}
                    {p.proofUrl ? (
                      <a href={p.proofUrl} target="_blank" rel="noreferrer" className="table-link">
                        Screenshot
                      </a>
                    ) : (
                      <span className="mini">{p.status === "processing" ? "Proof pending review" : "Awaiting parent proof"}</span>
                    )}
                  </td>
                  <td>{relativeTime(p.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-yellow"
                      style={{ height: 34, fontSize: 12 }}
                      disabled={busy === p.id}
                      onClick={() => confirmPayment(p.userId, p.id)}
                    >
                      {busy === p.id ? "…" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="hint">No pending payments — all clear.</p>
        )}
      </div>

      <h3 className="section">Parent households</h3>
      <div className="table-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th>Parent</th>
              <th>Child</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link
                    href={`/dashboard/learners/${p.id}`}
                    className="table-link"
                    onClick={() => onSelectParent?.(p.id)}
                  >
                    {p.name}
                  </Link>
                </td>
                <td>{p.childName || "—"}</td>
                <td>{planLabel(p.subscription.planId)}</td>
                <td>
                  <span className={`chip${p.subscription.status === "past_due" ? " chip-warn" : ""}`}>
                    {subscriptionLabel(p.subscription.status)}
                  </span>
                </td>
                <td>{p.pendingCount || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
