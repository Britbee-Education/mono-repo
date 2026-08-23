import { Text, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { PillButton } from "@/components/ui/PillButton";
import { useProgress } from "@/context/ProgressContext";
import { useParent } from "@/context/ParentContext";
import { QUESTS, needFirst, questUnlocked, type QuestId } from "@/lib/quests";
import { colors, fonts } from "@/constants/theme";

export function QuestLock({ id, children }: { id: QuestId; children: React.ReactNode }) {
  const { snapshot } = useProgress();
  const { paused } = useParent();
  const router = useRouter();
  if (paused) {
    return (
      <ActivityShell eyebrow="Paused" title="Ask a parent">
        <View style={styles.card}>
          <LinearGradient colors={["#1A2B5F", "#2A3F84"]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.lockWrap}>
            <Text style={styles.lock}>🔒</Text>
          </View>
          <Text style={styles.title}>Practice is paused</Text>
          <Text style={styles.hint}>A parent turned this off in Parent Access.</Text>
        </View>
        <PillButton label="Back to hive" onPress={() => router.replace("/(main)")} />
      </ActivityShell>
    );
  }
  if (questUnlocked(id, snapshot)) return <>{children}</>;
  const quest = QUESTS.find((q) => q.id === id);
  return (
    <ActivityShell eyebrow="Locked" title={quest?.kid || "Keep buzzing"}>
      <View style={styles.card}>
        <LinearGradient colors={["#1A2B5F", "#2A3F84"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.lockWrap}>
          <Text style={styles.lock}>🔒</Text>
        </View>
        <Text style={styles.title}>{quest?.kid} is locked</Text>
        <Text style={styles.hint}>{needFirst(id) || quest?.lockHint}</Text>
        <View style={styles.seal}>
          <Text style={styles.sealTxt}>Do the activity before this one</Text>
        </View>
      </View>
      <PillButton label="Back to path" onPress={() => router.replace("/(main)")} />
    </ActivityShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 18,
  },
  lockWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(245,196,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  lock: { fontSize: 32 },
  title: { fontFamily: fonts.extra, color: colors.white, fontSize: 24, textAlign: "center" },
  hint: {
    fontFamily: fonts.bold,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
    fontSize: 16,
  },
  seal: {
    marginTop: 16,
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sealTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 13 },
});
