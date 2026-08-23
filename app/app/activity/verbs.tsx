import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { SpeakPractice } from "@/components/activity/SpeakPractice";
import { StepNext } from "@/components/activity/Flow";
import { ContinueAfter } from "@/components/activity/ContinueAfter";
import { SceneArt } from "@/components/activity/SceneArt";
import { colors, fonts, radii } from "@/constants/theme";
import { weeklyVerbs, type ActionVerb } from "@/data/verbs";
import { verbArt } from "@/lib/art";
import { prefetchClip } from "@/lib/speech";
import { useProgress } from "@/context/ProgressContext";
import { QuestLock } from "@/components/game/QuestLock";

const ROUND = 3;

export default function VerbsScreen() {
  const { markVerbClear, verbsCleared, ready, track, saveTrack } = useProgress();
  const [round, setRound] = useState<ActionVerb[]>([]);
  const [index, setIndex] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [done, setDone] = useState(false);
  const [booted, setBooted] = useState(false);
  const verb = round[index] || round[0];
  const last = round.length ? index >= round.length - 1 : false;
  const total = round.length || ROUND;

  useEffect(() => {
    if (!ready || booted) return;
    const all = weeklyVerbs();
    const saved = track.verbs;
    if (saved?.ids?.length) {
      const found = saved.ids.map((id) => all.find((v) => v.id === id)).filter(Boolean) as ActionVerb[];
      if (found.length) {
        setRound(found);
        setIndex(Math.min(saved.index, found.length - 1));
        setCleared(saved.cleared);
        setBooted(true);
        return;
      }
    }
    const open = all.filter((v) => !verbsCleared.includes(v.id));
    setRound((open.length ? open : all).slice(0, ROUND));
    setBooted(true);
  }, [ready, booted, track.verbs, verbsCleared]);

  useEffect(() => {
    if (!booted || done || !round.length) return;
    saveTrack({ verbs: { ids: round.map((v) => v.id), index, cleared } });
  }, [booted, done, round, index, cleared, saveTrack]);

  useEffect(() => {
    if (!verb) return;
    prefetchClip(verb.spoken || verb.word, "word");
  }, [verb]);

  function next() {
    markVerbClear(verb.id, last);
    if (!last) {
      setIndex((i) => i + 1);
      setCleared(false);
      return;
    }
    setDone(true);
  }

  return (
    <QuestLock id="verbs">
      <ActivityShell
        eyebrow="Act"
        title="Act it out"
        progress={{ current: done ? total : index + (cleared ? 1 : 0), total }}
      >
        {done ? (
          <ContinueAfter active />
        ) : !verb ? (
          <View style={styles.loadWrap}>
            <Text style={styles.loadText}>Finding your actions…</Text>
          </View>
        ) : (
          <Animated.View key={verb.id} entering={FadeInDown.duration(200).springify()}>
            {/* Action image */}
            <SceneArt
              source={verbArt(verb.id)}
              label={verb.sentence}
              aspectRatio={4 / 3}
              cover
            />

            {/* Progress dots + clear badge */}
            <View style={styles.stepRow}>
              <View style={styles.stepDots}>
                {round.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.stepDot,
                      i < index + (cleared ? 1 : 0) && styles.stepDotDone,
                      i === index && !cleared && styles.stepDotNow,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.stepCount}>Action {index + 1} of {total}</Text>
            </View>

            {/* Verb + instruction */}
            <View style={styles.verbCard}>
              <View style={styles.verbRow}>
                <Text style={styles.verbWord}>{verb.word}</Text>
                {cleared ? (
                  <Animated.View entering={ZoomIn.duration(220)} style={styles.clearBadge}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  </Animated.View>
                ) : null}
              </View>
              <Text style={styles.verbSentence}>"{verb.sentence}"</Text>
              <View style={styles.hintRow}>
                <Ionicons name="body-outline" size={14} color={colors.muted} />
                <Text style={styles.hintText}>Act it out, then say the line</Text>
              </View>
            </View>

            <SpeakPractice
              key={verb.id}
              target={verb.sentence}
              playLabel="Hear it"
              style="sentence"
              onClear={() => setCleared(true)}
            />
            <StepNext ready={cleared} last={last} onNext={next} wait="Act it out, say the line, then tap Next." />
          </Animated.View>
        )}
      </ActivityShell>
    </QuestLock>
  );
}

const styles = StyleSheet.create({
  loadWrap: { flex: 1, alignItems: "center", paddingTop: 60 },
  loadText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stepDots: { flexDirection: "row", gap: 8, alignItems: "center" },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotDone: { backgroundColor: colors.speak },
  stepDotNow: { backgroundColor: colors.yellow, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.navy },
  stepCount: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
  verbCard: {
    backgroundColor: colors.practiceBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "#BECEF8",
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    gap: 6,
  },
  verbRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  verbWord: { fontFamily: fonts.extra, fontSize: 28, color: colors.navy, textTransform: "capitalize" },
  clearBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.speak,
    alignItems: "center",
    justifyContent: "center",
  },
  verbSentence: { fontFamily: fonts.bold, fontSize: 17, color: colors.navy, textAlign: "center", lineHeight: 25 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  hintText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
});
