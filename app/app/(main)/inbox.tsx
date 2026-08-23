import { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BouncePress } from "@/components/game/BouncePress";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { useNotify } from "@/context/NotifyContext";
import { useLayout } from "@/lib/layout";
import { QUESTS, type QuestId } from "@/lib/quests";
import { colors, fonts } from "@/constants/theme";
import { type InboxItem } from "@/lib/api";

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export default function InboxScreen() {
  const router = useRouter();
  const { headerTop, padX, activityMax } = useLayout();
  const { items, unread, enabled, refresh, markRead } = useNotify();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const open = useCallback(
    async (item: InboxItem) => {
      await markRead(item.id);

      if (item.href) {
        router.push(item.href as any);
        return;
      }

      // Some notifications target an activity path directly.
      const id = item.activityId as QuestId | undefined;
      if (id) {
        const q = QUESTS.find((qq) => qq.id === id);
        if (q) router.push(q.href as any);
      }
    },
    [markRead, router]
  );

  const list = enabled ? items : [];

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          {
            paddingTop: headerTop,
            paddingHorizontal: padX,
            maxWidth: activityMax,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.sub}>
          {!enabled ? "Turn notifications on in Account." : unread > 0 ? `You have unread messages.` : "All caught up!"}
        </Text>

        {!enabled ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Notifications are off</Text>
            <Text style={styles.cardSub}>Go to Account to enable them, then check again.</Text>
          </Card>
        ) : list.length ? (
          <View style={styles.list}>
            {list.map((item) => {
              const isUnread = !item.readAt;
              return (
                <BouncePress
                  key={item.id}
                  sound={false}
                  onPress={() => void open(item)}
                  style={[styles.item, isUnread && styles.itemUnread]}
                >
                  <View style={[styles.icon, isUnread && styles.iconUnread]}>
                    <Ionicons name={isUnread ? "notifications" : "checkmark-circle"} size={18} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.itemTitle, !isUnread && styles.itemTitleRead]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                    <Text style={styles.itemTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                </BouncePress>
              );
            })}
          </View>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>No notifications yet</Text>
            <Text style={styles.cardSub}>When your mentor or pack has an update, it will show here.</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  body: { paddingBottom: 28 },
  title: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy, marginBottom: 6 },
  sub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  card: { marginBottom: 12 },
  cardTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 18 },
  cardSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  list: { gap: 10 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE8DC",
  },
  itemUnread: {
    borderColor: "rgba(229,57,53,0.25)",
    backgroundColor: "#FFF5F4",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(26,43,95,0.06)",
  },
  iconUnread: { backgroundColor: "rgba(229,57,53,0.10)" },
  itemTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15, marginBottom: 2 },
  itemTitleRead: { color: colors.muted },
  itemBody: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, lineHeight: 18 },
  itemTime: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 6 },
});
