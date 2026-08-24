import { useCallback, useEffect, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ParentShell } from "@/components/parent/ParentShell";
import { Card } from "@/components/ui/Card";
import { BouncePress } from "@/components/game/BouncePress";
import { useParent } from "@/context/ParentContext";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";
import { useHive } from "@/context/HiveContext";
import { planById } from "@/lib/parent";
import { api } from "@/lib/api";
import { subscriptionLabel } from "@/lib/billing";
import { todayCount, DAILY_QUESTS } from "@/lib/quests";
import { placeLabel } from "@/components/hive/HiveAvatar";
import { colors, fonts } from "@/constants/theme";

function Tile({
  icon,
  title,
  sub,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <BouncePress sound={false} onPress={onPress} style={styles.tile}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={20} color={colors.navy} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.tileHead}>
          <Text style={styles.tileTitle}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.tileSub} numberOfLines={2}>
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </BouncePress>
  );
}

export default function ParentHubScreen() {
  const router = useRouter();
  const { unlocked, planId, paused } = useParent();
  const { user } = useAuth();
  const { points, streak, rank, snapshot } = useProgress();
  const { hive } = useHive();
  const child = user?.child?.childName || "your child";
  const plan = planById(planId);
  const today = todayCount(snapshot);
  const [pendingCount, setPendingCount] = useState(0);
  const [subStatus, setSubStatus] = useState<string | undefined>(user?.parentSettings?.subscriptionStatus);

  const refreshBilling = useCallback(async () => {
    try {
      const summary = await api.billingSummary();
      setPendingCount(summary.pendingPayments.length);
      setSubStatus(summary.subscription.status);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    if (unlocked) void refreshBilling();
  }, [unlocked, refreshBilling]);

  if (!unlocked) return <Redirect href="/parent" />;

  const billingSub =
    pendingCount > 0
      ? `${pendingCount} payment${pendingCount > 1 ? "s" : ""} pending`
      : subStatus && subStatus !== "active" && subStatus !== "trialing"
        ? subscriptionLabel(subStatus)
        : `${plan.name} · ${plan.price}${plan.id === "trial" ? "" : ` ${plan.period}`}`;

  return (
    <ParentShell title="Family hub" home>
      <Card>
        <Text style={styles.kicker}>Child</Text>
        <Text style={styles.name}>{child}</Text>
        <Text style={styles.meta}>
          {rank.title} · {points} Buzz Points · {streak}-day streak
          {hive ? ` · Hive ${placeLabel(hive.me.place)}` : ""}
        </Text>
        <Text style={styles.today}>
          Today {today} of {DAILY_QUESTS} activities
          {paused ? " · Practice paused" : ""}
        </Text>
      </Card>

      <Text style={styles.section}>Parent tools</Text>
      <Tile
        icon="stats-chart-outline"
        title="Progress"
        sub="Streak, Buzz Points, sounds, and today’s path."
        onPress={() => router.push("/parent/progress")}
      />
      <Tile
        icon="card-outline"
        title="Payments & plans"
        sub={billingSub}
        badge={pendingCount > 0 ? String(pendingCount) : undefined}
        onPress={() => router.push("/parent/billing")}
      />
      <Tile
        icon="gift-outline"
        title="Refer & earn"
        sub="Invite friends and classmates’ families — earn Buzz Points and plan discounts."
        onPress={() => router.push("/parent/refer")}
      />
      <Tile
        icon="pulse-outline"
        title="Family activity"
        sub="Practice wins, payments, and subscription updates."
        onPress={() => router.push("/parent/activity")}
      />
      <Tile
        icon="settings-outline"
        title="Parental controls"
        sub="Pause practice, alerts, and child profile."
        onPress={() => router.push("/parent/controls")}
      />
    </ParentShell>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 0.8 },
  name: { fontFamily: fonts.extra, color: colors.navy, fontSize: 22, marginTop: 4 },
  meta: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, marginTop: 6, lineHeight: 18 },
  today: { fontFamily: fonts.bold, color: colors.listen, fontSize: 13, marginTop: 8 },
  section: { marginTop: 22, marginBottom: 8, fontFamily: fonts.bold, color: colors.navy, fontSize: 14 },
  tile: {
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
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  tileTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  tileSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fonts.extra, color: "#B45309", fontSize: 11 },
});
