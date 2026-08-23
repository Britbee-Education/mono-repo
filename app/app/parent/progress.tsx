import { useEffect } from "react";
import { Redirect } from "expo-router";
import { Text, StyleSheet, View } from "react-native";
import { ParentShell } from "@/components/parent/ParentShell";
import { Card } from "@/components/ui/Card";
import { useParent } from "@/context/ParentContext";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";
import { useHive } from "@/context/HiveContext";
import { api } from "@/lib/api";
import { QUESTS, questDoneToday, todayCount, DAILY_QUESTS, ACTIVITY_BUZZ } from "@/lib/quests";
import { placeLabel } from "@/components/hive/HiveAvatar";
import { colors, fonts } from "@/constants/theme";

export default function ParentProgressScreen() {
  const { unlocked } = useParent();
  const { user } = useAuth();
  const { points, streak, rank, snapshot, clearedSounds } = useProgress();
  const { hive, refresh: refreshHive } = useHive();
  const child = user?.child?.childName || "Your child";

  useEffect(() => {
    if (!unlocked) return;
    void refreshHive();
    void api.progressLoad().catch(() => undefined);
  }, [unlocked, user?.id, user?.activeChildIndex, refreshHive]);

  if (!unlocked) return <Redirect href="/parent" />;

  return (
    <ParentShell title="Progress">
      <Card>
        <Text style={styles.child}>{child}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{streak}</Text>
            <Text style={styles.statLbl}>Streak</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{points}</Text>
            <Text style={styles.statLbl}>Buzz Points</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{rank.level}</Text>
            <Text style={styles.statLbl}>{rank.title}</Text>
          </View>
        </View>
        <Text style={styles.line}>
          Today {todayCount(snapshot)} of {DAILY_QUESTS} activities · {clearedSounds.length} sounds mastered
          {hive ? ` · Hive ${placeLabel(hive.me.place)}` : ""}
        </Text>
      </Card>

      <Text style={styles.section}>Today’s path</Text>
      <Card>
        {QUESTS.map((q) => {
          const done = questDoneToday(q.id, snapshot);
          return (
            <View key={q.id} style={styles.row}>
              <Text style={styles.emoji}>{q.emoji}</Text>
              <Text style={styles.rowName}>{q.kid}</Text>
              <Text style={[styles.rowMeta, done && styles.ok]}>
                {done ? "Done" : `+${ACTIVITY_BUZZ[q.id]} Buzz Points`}
              </Text>
            </View>
          );
        })}
      </Card>
    </ParentShell>
  );
}

const styles = StyleSheet.create({
  child: { fontFamily: fonts.extra, color: colors.navy, fontSize: 20 },
  stats: { flexDirection: "row", gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: "#F4F6FB", borderRadius: 12, padding: 12, alignItems: "center" },
  statNum: { fontFamily: fonts.extra, color: colors.navy, fontSize: 22 },
  statLbl: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, marginTop: 2, textAlign: "center" },
  line: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, marginTop: 12, lineHeight: 18 },
  section: { marginTop: 22, marginBottom: 4, fontFamily: fonts.bold, color: colors.navy, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F2F6" },
  emoji: { fontSize: 18, width: 24, textAlign: "center" },
  rowName: { flex: 1, fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  rowMeta: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12 },
  ok: { color: colors.speak },
});
