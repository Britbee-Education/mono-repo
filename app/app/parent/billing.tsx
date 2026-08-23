import { useCallback, useEffect, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ParentShell } from "@/components/parent/ParentShell";
import { Card } from "@/components/ui/Card";
import { PillButton } from "@/components/ui/PillButton";
import { BouncePress } from "@/components/game/BouncePress";
import { useParent } from "@/context/ParentContext";
import { useAuth } from "@/context/AuthContext";
import { PLANS, planById, type PlanId } from "@/lib/parent";
import {
  api,
  isApiError,
  type BillingInvoice,
  type BillingPayment,
  type BillingSubscription,
  type PaymentMethod,
} from "@/lib/api";
import { formatInr, subscriptionLabel } from "@/lib/billing";
import { colors, fonts } from "@/constants/theme";

type Tab = "plan" | "pending" | "history" | "invoices";

const METHODS: { id: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "upi", label: "UPI", icon: "phone-portrait-outline" },
  { id: "card", label: "Card", icon: "card-outline" },
  { id: "netbanking", label: "Net banking", icon: "business-outline" },
];

function StatusPill({ status }: { status: string }) {
  const due = status === "past_due" || status === "pending";
  return (
    <View style={[styles.pill, due && styles.pillDue, status === "active" && styles.pillOk]}>
      <Text style={[styles.pillText, due && styles.pillTextDue]}>{subscriptionLabel(status)}</Text>
    </View>
  );
}

export default function ParentBillingScreen() {
  const router = useRouter();
  const { unlocked, planId } = useParent();
  const { setUser } = useAuth();
  const [tab, setTab] = useState<Tab>("plan");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<PlanId>(planId === "trial" ? "monthly" : planId);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [pending, setPending] = useState<BillingPayment[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await api.billingSummary();
      setSubscription(summary.subscription);
      setPending(summary.pendingPayments);
      setInvoices(summary.invoices);
      if (summary.user) setUser(summary.user);
      const hist = await api.billingPayments();
      setPayments(hist.payments);
    } catch (e) {
      if (isApiError(e) && e.status === 403) Alert.alert("Parent only", "Billing is for parent accounts.");
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    if (unlocked) void refresh();
  }, [unlocked, refresh]);

  if (!unlocked) return <Redirect href="/parent" />;

  const current = planById(subscription?.planId || planId);
  const chosen = planById(pick);

  async function startCheckout() {
    if (pick === "trial") {
      setBusy(true);
      try {
        const res = await api.billingSwitchTrial();
        setSubscription(res.subscription);
        if (res.user) setUser(res.user);
        await refresh();
        Alert.alert("Trial on", "Hive Trial is active on this household.");
      } catch (e) {
        Alert.alert("Could not switch", isApiError(e) ? e.message : "Try again.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const { payment } = await api.billingCheckout(pick as "monthly" | "yearly", method);
      setPending([payment]);
      setTab("pending");
    } catch (e) {
      Alert.alert("Checkout failed", isApiError(e) ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending(paymentId: string) {
    setBusy(true);
    try {
      const res = await api.billingConfirmPayment(paymentId);
      if (res.user) setUser(res.user);
      setSubscription(res.subscription);
      await refresh();
      Alert.alert("Payment received", `${planById(res.payment.planId).name} is now active.`);
    } catch (e) {
      Alert.alert("Payment failed", isApiError(e) ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelPending(paymentId: string) {
    setBusy(true);
    try {
      await api.billingCancelPayment(paymentId);
      await refresh();
    } catch (e) {
      Alert.alert("Could not cancel", isApiError(e) ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSub() {
    Alert.alert("Cancel subscription?", "Access continues until the current period ends.", [
      { text: "Keep plan", style: "cancel" },
      {
        text: "Cancel at period end",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              const res = await api.billingCancelSubscription(true);
              setSubscription(res.subscription);
              if (res.user) setUser(res.user);
              await refresh();
            } catch (e) {
              Alert.alert("Could not cancel", isApiError(e) ? e.message : "Try again.");
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  async function resumeSub() {
    setBusy(true);
    try {
      const res = await api.billingResumeSubscription();
      setSubscription(res.subscription);
      if (res.user) setUser(res.user);
      await refresh();
    } catch (e) {
      Alert.alert("Could not resume", isApiError(e) ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ParentShell title="Payments & plans">
      {loading && !subscription ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />
      ) : (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>Current plan</Text>
                <Text style={styles.plan}>{current.name}</Text>
                <Text style={styles.sub}>
                  {current.price}
                  {current.id !== "trial" ? ` ${current.period}` : ` · ${current.period}`}
                </Text>
                {subscription?.currentPeriodEnd ? (
                  <Text style={styles.renew}>
                    {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN")}
                  </Text>
                ) : null}
              </View>
              {subscription ? <StatusPill status={subscription.status} /> : null}
            </View>
            {subscription?.cancelAtPeriodEnd ? (
              <Text style={styles.warn}>Cancellation scheduled — resume anytime before it ends.</Text>
            ) : null}
            {subscription && subscription.planId !== "trial" && !subscription.cancelAtPeriodEnd ? (
              <BouncePress sound={false} onPress={() => void cancelSub()} style={styles.linkBtn}>
                <Text style={styles.linkText}>Cancel subscription</Text>
              </BouncePress>
            ) : null}
            {subscription?.cancelAtPeriodEnd ? (
              <View style={{ marginTop: 10 }}>
                <PillButton label="Resume subscription" variant="outline" loading={busy} onPress={() => void resumeSub()} />
              </View>
            ) : null}
          </Card>

          <View style={styles.tabs}>
            {(["plan", "pending", "history", "invoices"] as Tab[]).map((t) => (
              <BouncePress key={t} sound={false} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
                <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                  {t === "plan" ? "Plans" : t === "pending" ? `Pending${pending.length ? ` (${pending.length})` : ""}` : t === "history" ? "History" : "Invoices"}
                </Text>
              </BouncePress>
            ))}
          </View>

          {tab === "plan" ? (
            <>
              <Text style={styles.section}>Choose plan</Text>
              {PLANS.map((p) => {
                const on = pick === p.id;
                return (
                  <BouncePress key={p.id} sound={false} onPress={() => setPick(p.id)} style={[styles.option, on && styles.optionOn]}>
                    <View style={[styles.radio, on && styles.radioOn]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optName}>{p.name}</Text>
                      <Text style={styles.optSub}>{p.blurb}</Text>
                    </View>
                    <Text style={styles.price}>
                      {p.price}
                      {p.id !== "trial" ? `\n${p.period}` : ""}
                    </Text>
                  </BouncePress>
                );
              })}

              {pick !== "trial" ? (
                <>
                  <Text style={styles.section}>Pay with</Text>
                  <View style={styles.methodRow}>
                    {METHODS.map((m) => (
                      <BouncePress
                        key={m.id}
                        sound={false}
                        onPress={() => setMethod(m.id)}
                        style={[styles.method, method === m.id && styles.methodOn]}
                      >
                        <Ionicons name={m.icon} size={18} color={method === m.id ? colors.navy : colors.muted} />
                        <Text style={[styles.methodText, method === m.id && styles.methodTextOn]}>{m.label}</Text>
                      </BouncePress>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={{ marginTop: 16 }}>
                <PillButton
                  label={
                    pick === subscription?.planId && pick !== "trial"
                      ? "Plan is active"
                      : pick === "trial"
                        ? "Switch to trial"
                        : `Pay ${chosen.price}`
                  }
                  variant="navy"
                  disabled={pick === subscription?.planId && pick !== "trial"}
                  loading={busy}
                  onPress={() => void startCheckout()}
                />
              </View>
            </>
          ) : null}

          {tab === "pending" ? (
            pending.length ? (
              pending.map((p) => (
                <Card key={p.id}>
                  <Text style={styles.optName}>{planById(p.planId).name}</Text>
                  <Text style={styles.sub}>
                    {formatInr(p.amount)} · {p.method?.toUpperCase() || "UPI"} · {p.status}
                  </Text>
                  <Text style={styles.note}>Complete payment in your UPI or banking app, then tap confirm.</Text>
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <PillButton label="Confirm payment" variant="navy" loading={busy} onPress={() => void confirmPending(p.id)} />
                    <PillButton label="Cancel" variant="outline" loading={busy} onPress={() => void cancelPending(p.id)} />
                  </View>
                </Card>
              ))
            ) : (
              <Card>
                <Text style={styles.emptyTitle}>No pending payments</Text>
                <Text style={styles.note}>Start checkout from Plans when you’re ready to upgrade.</Text>
              </Card>
            )
          ) : null}

          {tab === "history" ? (
            payments.length ? (
              payments.map((p) => (
                <View key={p.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optName}>{planById(p.planId).name}</Text>
                    <Text style={styles.optSub}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.price}>{formatInr(p.amount)}</Text>
                    <Text style={[styles.rowMeta, p.status === "succeeded" && styles.ok]}>{p.status}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Card>
                <Text style={styles.emptyTitle}>No payments yet</Text>
              </Card>
            )
          ) : null}

          {tab === "invoices" ? (
            invoices.length ? (
              invoices.map((inv) => (
                <View key={inv.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optName}>Invoice #{inv.id}</Text>
                    <Text style={styles.optSub}>
                      {planById(inv.planId).name} · {new Date(inv.periodStart).toLocaleDateString("en-IN")} –{" "}
                      {new Date(inv.periodEnd).toLocaleDateString("en-IN")}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.price}>{formatInr(inv.amount)}</Text>
                    <Text style={[styles.rowMeta, inv.status === "paid" && styles.ok]}>{inv.status}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Card>
                <Text style={styles.emptyTitle}>No invoices yet</Text>
              </Card>
            )
          ) : null}

          <View style={{ marginTop: 16 }}>
            <PillButton label="Family activity" variant="outline" onPress={() => router.push("/parent/activity")} />
          </View>
        </>
      )}
    </ParentShell>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 0.8 },
  plan: { fontFamily: fonts.extra, color: colors.navy, fontSize: 22, marginTop: 4 },
  sub: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, marginTop: 4 },
  renew: { fontFamily: fonts.bold, color: colors.listen, fontSize: 12, marginTop: 6 },
  warn: { fontFamily: fonts.medium, color: "#B45309", fontSize: 12, marginTop: 10 },
  rowBetween: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#EEF1F6" },
  pillDue: { backgroundColor: "#FEF3C7" },
  pillOk: { backgroundColor: "#DCFCE7" },
  pillText: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11 },
  pillTextDue: { color: "#B45309" },
  linkBtn: { marginTop: 10 },
  linkText: { fontFamily: fonts.bold, color: colors.muted, fontSize: 13, textDecorationLine: "underline" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 18, marginBottom: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: "#EEF1F6" },
  tabOn: { borderColor: colors.navy, backgroundColor: "#F7F9FF" },
  tabText: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12 },
  tabTextOn: { color: colors.navy },
  section: { marginTop: 14, marginBottom: 8, fontFamily: fonts.bold, color: colors.navy, fontSize: 14 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#EEF1F6",
  },
  optionOn: { borderColor: colors.navy, backgroundColor: "#F7F9FF" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.navy, backgroundColor: colors.yellow },
  optName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  optSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  price: { fontFamily: fonts.extra, color: colors.navy, fontSize: 13, textAlign: "right" },
  methodRow: { flexDirection: "row", gap: 8 },
  method: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#EEF1F6",
  },
  methodOn: { borderColor: colors.navy, backgroundColor: "#F7F9FF" },
  methodText: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11 },
  methodTextOn: { color: colors.navy },
  note: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 18 },
  emptyTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEF1F6",
  },
  rowMeta: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  ok: { color: colors.speak },
});
