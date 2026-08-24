import fs from "fs";
import path from "path";
import { mailBillingEvent, mailPracticeReport } from "./mail/mailer";
import { consumeCheckoutDiscount, peekCheckoutDiscount } from "./referralStore";

export type PlanId = "trial" | "monthly" | "yearly";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired";
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled";
export type PaymentMethod = "upi" | "card" | "netbanking";
export type InvoiceStatus = "open" | "paid" | "void";

export type Subscription = {
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  userId: string;
  planId: PlanId;
  amount: number;
  currency: "INR";
  status: PaymentStatus;
  method?: PaymentMethod;
  invoiceId?: string;
  /** BritBee Pay order reference shown on the gateway screen */
  orderRef?: string;
  /** UPI / GPay transaction ID (UTR) entered by parent */
  transactionId?: string;
  /** Screenshot proof URL under /assets/billing/proofs */
  proofUrl?: string;
  submittedAt?: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  /** Referral discount applied at checkout (percent). */
  discountPct?: number;
  discountLabel?: string;
  /** Amount before referral discount (paise). */
  originalAmount?: number;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
};

export type GatewayConfig = {
  provider: "britbee_pay";
  displayName: string;
  upiVpa: string;
  payeeName: string;
  instructions: string;
  supportNote: string;
};

export type Invoice = {
  id: string;
  userId: string;
  paymentId?: string;
  planId: PlanId;
  amount: number;
  currency: "INR";
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  paidAt?: string;
};

export type ParentActivityType =
  | "practice"
  | "payment"
  | "subscription"
  | "settings"
  | "class"
  | "achievement";

export type ParentActivity = {
  id: string;
  userId: string;
  childIndex?: number;
  childName?: string;
  type: ParentActivityType;
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

type Disk = {
  nextId: number;
  subscriptions: Subscription[];
  payments: Payment[];
  invoices: Invoice[];
  activity: ParentActivity[];
};

const DATA_PATH = path.resolve(__dirname, "../data/billing.json");

const PLANS: Record<PlanId, { amount: number; days: number; label: string }> = {
  trial: { amount: 0, days: 7, label: "Hive Trial" },
  monthly: { amount: 49900, days: 30, label: "Hive Monthly" },
  yearly: { amount: 499900, days: 365, label: "Hive Yearly" },
};

const g = globalThis as unknown as { __britbeeBilling?: Disk; __britbeeBillingLoaded?: boolean };

function empty(): Disk {
  return { nextId: 1, subscriptions: [], payments: [], invoices: [], activity: [] };
}

function loadDisk(): Disk {
  if (g.__britbeeBillingLoaded && g.__britbeeBilling) return g.__britbeeBilling;
  try {
    if (fs.existsSync(DATA_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
      g.__britbeeBilling = parsed?.subscriptions ? parsed : empty();
    } else {
      g.__britbeeBilling = empty();
    }
  } catch {
    g.__britbeeBilling = empty();
  }
  g.__britbeeBillingLoaded = true;
  return g.__britbeeBilling!;
}

function saveDisk() {
  const disk = loadDisk();
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(disk, null, 2));
}

function nextId(disk: Disk) {
  const id = disk.nextId;
  disk.nextId += 1;
  return String(id);
}

function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function planMeta(planId: PlanId) {
  return PLANS[planId] || PLANS.trial;
}

export function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function findSubscription(userId: string) {
  return loadDisk().subscriptions.find((s) => s.userId === userId) || null;
}

function refreshSubscriptionStatus(sub: Subscription): Subscription {
  const now = Date.now();
  const end = new Date(sub.currentPeriodEnd).getTime();
  if (sub.status === "cancelled" || sub.status === "expired") return sub;
  if (sub.cancelAtPeriodEnd && end <= now) {
    sub.status = "cancelled";
    sub.cancelledAt = sub.cancelledAt || new Date().toISOString();
  } else if (sub.status === "past_due") {
    // stays until a successful payment
  } else if (end <= now && sub.planId !== "trial") {
    sub.status = "past_due";
  } else if (sub.planId === "trial" && end <= now) {
    sub.status = "expired";
  } else if (sub.planId === "trial") {
    sub.status = "trialing";
  } else {
    sub.status = "active";
  }
  sub.updatedAt = new Date().toISOString();
  return sub;
}

export function getGatewayConfig(): GatewayConfig {
  const upiVpa = (process.env.BILLING_UPI_VPA || "britbee@oksbi").trim();
  const payeeName = (process.env.BILLING_UPI_NAME || "BritBee Mentors").trim();
  return {
    provider: "britbee_pay",
    displayName: "BritBee Pay",
    upiVpa,
    payeeName,
    instructions: "Scan the QR with GPay / PhonePe / any UPI app, pay the exact amount, then upload your screenshot or enter the UPI transaction ID.",
    supportNote: "A mentor activates your plan after verifying the payment — usually within a few hours.",
  };
}

export function buildUpiIntent(payment: Payment) {
  const gateway = getGatewayConfig();
  const rupees = (payment.amount / 100).toFixed(2);
  const ref = payment.orderRef || `BB${payment.id}`;
  const params = new URLSearchParams({
    pa: gateway.upiVpa,
    pn: gateway.payeeName,
    am: rupees,
    cu: "INR",
    tn: `BritBee ${ref}`,
    tr: ref,
  });
  return `upi://pay?${params.toString()}`;
}

export function gatewaySession(payment: Payment) {
  const gateway = getGatewayConfig();
  const upiIntent = buildUpiIntent(payment);
  const customQr = (process.env.BILLING_UPI_QR_URL || "").trim();
  const qrImageUrl =
    customQr ||
    `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiIntent)}`;
  return {
    gateway,
    payment,
    upiIntent,
    qrImageUrl,
    amountLabel: formatInr(payment.amount),
    planLabel: planMeta(payment.planId).label,
  };
}

export function ensureSubscription(userId: string): Subscription {
  const disk = loadDisk();
  let sub = disk.subscriptions.find((s) => s.userId === userId);
  if (!sub) {
    const now = new Date().toISOString();
    sub = {
      userId,
      planId: "trial",
      status: "trialing",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: isoDaysFromNow(PLANS.trial.days),
      updatedAt: now,
    };
    disk.subscriptions.push(sub);
    saveDisk();
  }
  return refreshSubscriptionStatus(sub);
}

export function logActivity(
  userId: string,
  row: Omit<ParentActivity, "id" | "userId" | "createdAt"> & { createdAt?: string }
) {
  const disk = loadDisk();
  const item: ParentActivity = {
    id: nextId(disk),
    userId,
    childIndex: row.childIndex,
    childName: row.childName,
    type: row.type,
    title: row.title,
    detail: row.detail,
    meta: row.meta,
    createdAt: row.createdAt || new Date().toISOString(),
  };
  disk.activity.unshift(item);
  disk.activity = disk.activity.slice(0, 500);
  saveDisk();

  if (item.type === "practice") {
    mailPracticeReport({
      userId,
      title: item.title,
      detail: item.detail,
      childName: item.childName,
      meta: item.meta,
    });
  } else if (item.type === "payment" || item.type === "subscription" || item.type === "settings") {
    mailBillingEvent({
      userId,
      title: item.title,
      detail: item.detail,
      type: item.type,
    });
  }

  return item;
}

export function listActivity(userId: string, limit = 40) {
  return loadDisk()
    .activity.filter((a) => a.userId === userId)
    .slice(0, limit);
}

export function listPayments(userId: string) {
  return loadDisk()
    .payments.filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listInvoices(userId: string) {
  return loadDisk()
    .invoices.filter((i) => i.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function pendingPayments(userId: string) {
  return listPayments(userId).filter((p) => p.status === "pending" || p.status === "processing");
}

export function getSummary(userId: string) {
  const sub = ensureSubscription(userId);
  const pending = pendingPayments(userId);
  const recentActivity = listActivity(userId, 8);
  const invoices = listInvoices(userId).slice(0, 5);
  return { subscription: sub, pendingPayments: pending, recentActivity, invoices };
}

export function createCheckout(userId: string, planId: PlanId, method: PaymentMethod) {
  if (!["monthly", "yearly"].includes(planId)) {
    throw new Error("Choose Monthly or Yearly to pay.");
  }
  const meta = planMeta(planId);
  const disk = loadDisk();
  const existing = pendingPayments(userId);
  if (existing.length) {
    throw new Error("Finish or cancel your pending payment first.");
  }
  const id = nextId(disk);
  const discount = consumeCheckoutDiscount(userId, meta.amount);
  const payment: Payment = {
    id,
    userId,
    planId,
    amount: discount.finalAmount,
    currency: "INR",
    status: "pending",
    method,
    orderRef: `BB${id.padStart(6, "0")}`,
    discountPct: discount.pct || undefined,
    discountLabel: discount.label,
    originalAmount: discount.pct > 0 ? meta.amount : undefined,
    createdAt: new Date().toISOString(),
  };
  disk.payments.push(payment);
  saveDisk();
  logActivity(userId, {
    type: "payment",
    title: "Payment started",
    detail: discount.pct
      ? `${meta.label} · ${formatInr(discount.finalAmount)} (${discount.label} off ${formatInr(meta.amount)}) via ${method.toUpperCase()}`
      : `${meta.label} · ${formatInr(meta.amount)} via ${method.toUpperCase()}`,
    meta: { paymentId: payment.id, planId, method, discountPct: discount.pct, discountSource: discount.source },
  });
  return payment;
}

export function referralDiscountPreview(userId: string, planId: PlanId) {
  const meta = planMeta(planId);
  const pct = peekCheckoutDiscount(userId);
  const discountPaise = Math.round((meta.amount * pct) / 100);
  return {
    planId,
    originalAmount: meta.amount,
    discountPct: pct,
    discountPaise,
    finalAmount: Math.max(0, meta.amount - discountPaise),
  };
}

function activatePlan(userId: string, planId: PlanId) {
  const disk = loadDisk();
  const now = new Date().toISOString();
  const meta = planMeta(planId);
  let sub = disk.subscriptions.find((s) => s.userId === userId);
  if (!sub) {
    sub = {
      userId,
      planId,
      status: planId === "trial" ? "trialing" : "active",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: isoDaysFromNow(meta.days),
      updatedAt: now,
    };
    disk.subscriptions.push(sub);
  } else {
    sub.planId = planId;
    sub.status = planId === "trial" ? "trialing" : "active";
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = isoDaysFromNow(meta.days);
    sub.cancelAtPeriodEnd = false;
    sub.cancelledAt = undefined;
    sub.updatedAt = now;
  }
  refreshSubscriptionStatus(sub);
  saveDisk();
  return sub!;
}

export function submitPaymentProof(
  userId: string,
  paymentId: string,
  input: { transactionId?: string; proofUrl?: string }
) {
  const disk = loadDisk();
  const payment = disk.payments.find((p) => p.id === paymentId && p.userId === userId);
  if (!payment) throw new Error("Payment not found.");
  if (payment.status === "succeeded") throw new Error("This payment is already activated.");
  if (payment.status === "failed" || payment.status === "cancelled") {
    throw new Error("This payment can no longer be updated.");
  }

  const transactionId = String(input.transactionId || "").trim().replace(/\s+/g, "").toUpperCase();
  const proofUrl = String(input.proofUrl || "").trim();
  if (!transactionId && !proofUrl) {
    throw new Error("Add a UPI transaction ID or upload a payment screenshot.");
  }
  if (transactionId && transactionId.length < 8) {
    throw new Error("Transaction ID looks too short — paste the full UPI / UTR reference.");
  }

  payment.transactionId = transactionId || payment.transactionId;
  payment.proofUrl = proofUrl || payment.proofUrl;
  payment.submittedAt = new Date().toISOString();
  payment.status = "processing";
  payment.failureReason = undefined;
  saveDisk();

  const bits = [
    payment.transactionId ? `Txn ${payment.transactionId}` : null,
    payment.proofUrl ? "screenshot attached" : null,
  ].filter(Boolean);
  logActivity(userId, {
    type: "payment",
    title: "Payment submitted for review",
    detail: `${planMeta(payment.planId).label} · ${formatInr(payment.amount)}${bits.length ? ` · ${bits.join(" · ")}` : ""}`,
    meta: {
      paymentId: payment.id,
      transactionId: payment.transactionId,
      proofUrl: payment.proofUrl,
      awaiting: "mentor",
    },
  });
  return payment;
}

export function confirmPayment(userId: string, paymentId: string) {
  const disk = loadDisk();
  const payment = disk.payments.find((p) => p.id === paymentId && p.userId === userId);
  if (!payment) throw new Error("Payment not found.");
  if (payment.status === "succeeded") return { payment, subscription: ensureSubscription(userId) };
  if (payment.status !== "pending" && payment.status !== "processing") {
    throw new Error("This payment can no longer be completed.");
  }

  payment.status = "processing";
  saveDisk();

  const now = new Date().toISOString();
  const meta = planMeta(payment.planId);
  const sub = activatePlan(userId, payment.planId);

  const invoice: Invoice = {
    id: nextId(disk),
    userId,
    paymentId: payment.id,
    planId: payment.planId,
    amount: payment.amount,
    currency: "INR",
    status: "paid",
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
    createdAt: now,
    paidAt: now,
  };
  disk.invoices.push(invoice);
  payment.status = "succeeded";
  payment.invoiceId = invoice.id;
  payment.completedAt = now;
  saveDisk();

  logActivity(userId, {
    type: "payment",
    title: "Payment received",
    detail: `${meta.label} · ${formatInr(payment.amount)}`,
    meta: { paymentId: payment.id, invoiceId: invoice.id, planId: payment.planId },
  });
  logActivity(userId, {
    type: "subscription",
    title: `${meta.label} active`,
    detail: `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN")}`,
    meta: { planId: payment.planId, periodEnd: sub.currentPeriodEnd },
  });

  return { payment, subscription: sub, invoice };
}

export function failPayment(userId: string, paymentId: string, reason?: string) {
  const disk = loadDisk();
  const payment = disk.payments.find((p) => p.id === paymentId && p.userId === userId);
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "pending" && payment.status !== "processing") {
    throw new Error("Payment already settled.");
  }
  payment.status = "failed";
  payment.failureReason = reason || "Payment declined";
  payment.completedAt = new Date().toISOString();
  saveDisk();
  logActivity(userId, {
    type: "payment",
    title: "Payment failed",
    detail: payment.failureReason,
    meta: { paymentId: payment.id },
  });
  return payment;
}

export function cancelPayment(userId: string, paymentId: string) {
  const disk = loadDisk();
  const payment = disk.payments.find((p) => p.id === paymentId && p.userId === userId);
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "pending") throw new Error("Only pending payments can be cancelled.");
  payment.status = "cancelled";
  payment.completedAt = new Date().toISOString();
  saveDisk();
  logActivity(userId, {
    type: "payment",
    title: "Payment cancelled",
    detail: formatInr(payment.amount),
    meta: { paymentId: payment.id },
  });
  return payment;
}

export function switchTrial(userId: string) {
  const sub = activatePlan(userId, "trial");
  logActivity(userId, {
    type: "subscription",
    title: "Hive Trial active",
    detail: "7-day trial started",
    meta: { planId: "trial" },
  });
  return sub;
}

export function cancelSubscription(userId: string, atPeriodEnd = true) {
  const disk = loadDisk();
  const sub = ensureSubscription(userId);
  if (sub.planId === "trial") throw new Error("Trial ends automatically — no subscription to cancel.");
  sub.cancelAtPeriodEnd = atPeriodEnd;
  sub.cancelledAt = new Date().toISOString();
  if (!atPeriodEnd) sub.status = "cancelled";
  sub.updatedAt = new Date().toISOString();
  const idx = disk.subscriptions.findIndex((s) => s.userId === userId);
  if (idx >= 0) disk.subscriptions[idx] = sub;
  saveDisk();
  logActivity(userId, {
    type: "subscription",
    title: atPeriodEnd ? "Subscription will cancel" : "Subscription cancelled",
    detail: atPeriodEnd
      ? `Access until ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN")}`
      : "Plan ended immediately",
    meta: { planId: sub.planId },
  });
  return sub;
}

export function resumeSubscription(userId: string) {
  const disk = loadDisk();
  const sub = ensureSubscription(userId);
  sub.cancelAtPeriodEnd = false;
  sub.cancelledAt = undefined;
  refreshSubscriptionStatus(sub);
  sub.updatedAt = new Date().toISOString();
  const idx = disk.subscriptions.findIndex((s) => s.userId === userId);
  if (idx >= 0) disk.subscriptions[idx] = sub;
  saveDisk();
  logActivity(userId, {
    type: "subscription",
    title: "Subscription resumed",
    detail: planMeta(sub.planId).label,
    meta: { planId: sub.planId },
  });
  return sub;
}

export function logPracticeActivity(
  userId: string,
  opts: {
    childName?: string;
    childIndex?: number;
    title: string;
    detail?: string;
    meta?: Record<string, unknown>;
  }
) {
  return logActivity(userId, { type: "practice", ...opts });
}

export function listAllPendingPayments() {
  return loadDisk()
    .payments.filter((p) => p.status === "pending" || p.status === "processing")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAllActivity(limit = 60) {
  return loadDisk().activity.slice(0, limit);
}

export function guideOverview() {
  const disk = loadDisk();
  const pending = listAllPendingPayments();
  let active = 0;
  let pastDue = 0;
  let trialing = 0;
  for (const sub of disk.subscriptions) {
    const fresh = refreshSubscriptionStatus({ ...sub });
    if (fresh.status === "active") active += 1;
    if (fresh.status === "past_due") pastDue += 1;
    if (fresh.status === "trialing") trialing += 1;
  }
  return {
    pendingCount: pending.length,
    activeCount: active,
    pastDueCount: pastDue,
    trialingCount: trialing,
    parentCount: disk.subscriptions.length,
    recentActivity: listAllActivity(12),
  };
}

export function getParentBillingDetail(userId: string) {
  seedDemoBilling(userId);
  return {
    ...getSummary(userId),
    payments: listPayments(userId),
    activity: listActivity(userId, 30),
  };
}

export function setPlanByGuide(userId: string, planId: PlanId, guideName: string) {
  const sub = activatePlan(userId, planId);
  logActivity(userId, {
    type: "subscription",
    title: `${planMeta(planId).label} set by mentor`,
    detail: `${guideName} updated the household plan`,
    meta: { planId, guide: guideName, source: "office" },
  });
  return sub;
}

export function confirmPaymentByGuide(userId: string, paymentId: string, guideName: string) {
  const result = confirmPayment(userId, paymentId);
  const disk = loadDisk();
  const payment = disk.payments.find((p) => p.id === paymentId && p.userId === userId);
  if (payment) {
    payment.reviewedBy = guideName;
    payment.reviewedAt = new Date().toISOString();
    payment.reviewNote = "Verified and activated by mentor";
    saveDisk();
  }
  logActivity(userId, {
    type: "payment",
    title: "Plan activated by mentor",
    detail: `${guideName} verified your BritBee Pay payment`,
    meta: { paymentId, guide: guideName, source: "office" },
  });
  return { ...result, payment: payment || result.payment };
}

export function failPaymentByGuide(userId: string, paymentId: string, guideName: string, reason?: string) {
  const payment = failPayment(userId, paymentId, reason || "Could not verify payment proof");
  const disk = loadDisk();
  const row = disk.payments.find((p) => p.id === paymentId && p.userId === userId);
  if (row) {
    row.reviewedBy = guideName;
    row.reviewedAt = new Date().toISOString();
    row.reviewNote = reason || "Could not verify payment proof";
    saveDisk();
  }
  logActivity(userId, {
    type: "payment",
    title: "Payment needs attention",
    detail: `${guideName}: ${reason || "Could not verify payment proof"}`,
    meta: { paymentId, guide: guideName, source: "office" },
  });
  return row || payment;
}

export function createManualCheckout(userId: string, planId: PlanId, method: PaymentMethod, guideName: string) {
  const payment = createCheckout(userId, planId, method);
  logActivity(userId, {
    type: "payment",
    title: "Payment link started by mentor",
    detail: `${guideName} initiated ${planMeta(planId).label}`,
    meta: { paymentId: payment.id, guide: guideName, source: "office" },
  });
  return payment;
}

export function seedDemoBilling(userId: string) {
  const disk = loadDisk();
  if (disk.subscriptions.some((s) => s.userId === userId)) return;
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 3);
  const sub: Subscription = {
    userId,
    planId: "monthly",
    status: "active",
    startedAt: weekAgo.toISOString(),
    currentPeriodStart: weekAgo.toISOString(),
    currentPeriodEnd: isoDaysFromNow(27),
    updatedAt: now.toISOString(),
  };
  disk.subscriptions.push(sub);
  const pay: Payment = {
    id: nextId(disk),
    userId,
    planId: "monthly",
    amount: PLANS.monthly.amount,
    currency: "INR",
    status: "succeeded",
    method: "upi",
    createdAt: weekAgo.toISOString(),
    completedAt: weekAgo.toISOString(),
  };
  disk.payments.push(pay);
  const inv: Invoice = {
    id: nextId(disk),
    userId,
    paymentId: pay.id,
    planId: "monthly",
    amount: pay.amount,
    currency: "INR",
    status: "paid",
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
    createdAt: weekAgo.toISOString(),
    paidAt: weekAgo.toISOString(),
  };
  disk.invoices.push(inv);
  pay.invoiceId = inv.id;
  logActivity(userId, {
    type: "payment",
    title: "Payment received",
    detail: "Hive Monthly · ₹499",
    createdAt: weekAgo.toISOString(),
  });
  logActivity(userId, {
    type: "practice",
    title: "Daily path completed",
    detail: "5 of 5 activities",
    childName: "Arjun Sharma",
    createdAt: new Date(now.getTime() - 3600_000).toISOString(),
  });
  saveDisk();
}
