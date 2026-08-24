import { useCallback, useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ParentShell } from "@/components/parent/ParentShell";
import { Card } from "@/components/ui/Card";
import { EmptyBee } from "@/components/ui/EmptyBee";
import { useParent } from "@/context/ParentContext";
import { api, type ParentActivityItem } from "@/lib/api";
import { activityIcon, relativeTime } from "@/lib/billing";
import { colors, fonts } from "@/constants/theme";

function ActivityRow({ item }: { item: ParentActivityItem }) {
  const icon = activityIcon(item.type);
  const tint =
    item.type === "payment"
      ? colors.listen
      : item.type === "subscription"
        ? colors.speak
        : item.type === "practice"
          ? "#8B5CF6"
          : colors.muted;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title}>{item.title}</Text>
        {item.detail ? (
          <Text style={styles.detail} numberOfLines={2}>
            {item.detail}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          {relativeTime(item.createdAt)}
          {item.childName ? ` · ${item.childName}` : ""}
        </Text>
      </View>
    </View>
  );
}

export default function ParentActivityScreen() {
  const { unlocked } = useParent();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ParentActivityItem[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.billingActivity(50);
      setItems(res.activity);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) void refresh();
  }, [unlocked, refresh]);

  if (!unlocked) return <Redirect href="/parent" />;

  return (
    <ParentShell title="Family activity">
      <Text style={styles.lead}>Practice, payments, and subscription updates for your household.</Text>

      {loading ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />
      ) : items.length ? (
        <Card style={{ padding: 0 }}>
          {items.map((item, i) => (
            <View key={item.id}>
              <ActivityRow item={item} />
              {i < items.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyBee
            title="No activity yet"
            message="When your child practises or you manage billing, updates show here."
            size={88}
          />
        </Card>
      )}
    </ParentShell>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  detail: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, marginTop: 2, lineHeight: 18 },
  meta: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, marginTop: 4 },
  divider: { height: 1, backgroundColor: "#F0F2F6", marginLeft: 66 },
  emptyTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16, marginBottom: 6 },
});
