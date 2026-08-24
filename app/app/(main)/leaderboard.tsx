import { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { EmptyBee } from "@/components/ui/EmptyBee";
import { HiveHonors } from "@/components/hive/HiveHonors";
import { useHive } from "@/context/HiveContext";
import { useProgress } from "@/context/ProgressContext";
import { useLayout } from "@/lib/layout";
import { nextQuest, questUnlocked, needFirst, resumeHref } from "@/lib/quests";
import { colors, fonts } from "@/constants/theme";

export default function LeaderboardScreen() {
  const router = useRouter();
  const { headerTop, padX, activityMax } = useLayout();
  const { hive, refresh } = useHive();
  const { snapshot, track } = useProgress();
  const next = nextQuest(snapshot);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  function climb() {
    const href = resumeHref(next.id, track);
    const locked = !questUnlocked(next.id, snapshot);
    if (locked) {
      router.push("/(main)");
      return;
    }
    router.push(href as never);
  }

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: headerTop, paddingHorizontal: padX, maxWidth: activityMax, width: "100%", alignSelf: "center" },
        ]}
      >
        <Text style={styles.screenTitle}>Leaderboard</Text>
        <Text style={styles.lead}>Bee of the Month, hive race, and your place.</Text>
        {hive?.board?.length ? (
          <HiveHonors hive={hive} onClimb={climb} />
        ) : (
          <EmptyBee
            title="Hive is waking up"
            message="Play today’s activities and the race will fill with bees."
            size={100}
            style={styles.empty}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  body: { paddingBottom: 36 },
  screenTitle: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy, marginBottom: 4 },
  lead: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, marginBottom: 14 },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEE8DC",
    marginTop: 8,
  },
});
