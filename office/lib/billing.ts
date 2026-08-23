export type PlanId = "trial" | "monthly" | "yearly";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired";
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled";
export type PaymentMethod = "upi" | "card" | "netbanking";

export type BillingSubscription = {
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

export type BillingPayment = {
  id: string;
  userId: string;
  planId: PlanId;
  amount: number;
  currency: "INR";
  status: PaymentStatus;
  method?: PaymentMethod;
  invoiceId?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
};

export type BillingInvoice = {
  id: string;
  userId: string;
  paymentId?: string;
  planId: PlanId;
  amount: number;
  currency: "INR";
  status: "open" | "paid" | "void";
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  paidAt?: string;
};

export type ParentActivity = {
  id: string;
  userId: string;
  childIndex?: number;
  childName?: string;
  type: string;
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type ParentBillingRow = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  childName?: string;
  subscription: BillingSubscription;
  pendingCount: number;
  pendingPayments: BillingPayment[];
};

export type PendingWithParent = BillingPayment & {
  parent: { id: string; name: string; email?: string; child?: { childName?: string } } | null;
};

export type BillingOverview = {
  pendingCount: number;
  activeCount: number;
  pastDueCount: number;
  trialingCount: number;
  parentCount: number;
  recentActivity: ParentActivity[];
};

const PLAN_LABELS: Record<PlanId, string> = {
  trial: "Hive Trial",
  monthly: "Hive Monthly",
  yearly: "Hive Yearly",
};

export function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function planLabel(planId: PlanId) {
  return PLAN_LABELS[planId] || planId;
}

export function subscriptionLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Payment due";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function paymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "succeeded":
      return "Paid";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function formatWhen(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function activityEmoji(type: string) {
  switch (type) {
    case "payment":
      return "💳";
    case "subscription":
      return "🔄";
    case "practice":
      return "🐝";
    case "settings":
      return "⚙️";
    case "class":
      return "📹";
    case "achievement":
      return "🏆";
    default:
      return "•";
  }
}
