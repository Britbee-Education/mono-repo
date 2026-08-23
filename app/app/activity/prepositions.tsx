import { useEffect, useMemo, useState } from "react";
import { Text, StyleSheet, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { StepNext } from "@/components/activity/Flow";
import { ContinueAfter } from "@/components/activity/ContinueAfter";
import { BouncePress } from "@/components/game/BouncePress";
import { colors, fonts, radii } from "@/constants/theme";
import { PREPOSITIONS, completeCloze } from "@/data/prepositions";
import { useProgress } from "@/context/ProgressContext";
import { speak } from "@/lib/speech";
import { QuestLock } from "@/components/game/QuestLock";

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

const ROUND = 5;

export default function PrepositionsScreen() {
  const deck = useMemo(() => PREPOSITIONS.slice(0, ROUND), []);
  const { markPrepCorrect, hitGame, finishQuest, ready, track, saveTrack } = useProgress();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (!ready || booted) return;
    const saved = track.prepositions;
    if (saved) {
      setIndex(Math.min(saved.index, ROUND - 1));
      setPicked(saved.picked);
    }
    setBooted(true);
  }, [ready, booted, track.prepositions]);

  useEffect(() => {
    if (!booted || done) return;
    const q = deck[index];
    saveTrack({
      prepositions: { index, picked, ready: Boolean(picked && q && picked === q.answer) },
    });
  }, [booted, done, index, picked, deck, saveTrack]);

  const q = deck[index];
  const choices = useMemo(() => shuffle(q.options), [q.id, index]);
  const correct = picked === q.answer;
  const [before, after] = q.cloze.split("___");
  const finished = completeCloze(q.cloze, picked || q.answer);
  const last = index >= deck.length - 1;
  const total = deck.length;

  function choose(option: string) {
    if (picked) return;
    setPicked(option);
    const ok = option === q.answer;
    hitGame(ok);
    speak(completeCloze(q.cloze, option), "sentence");
    if (ok) markPrepCorrect();
  }

  function tryAgain() {
    setPicked(null);
  }

  function next() {
    if (!last) {
      setPicked(null);
      setIndex((i) => i + 1);
      return;
    }
    finishQuest("prepositions");
    setDone(true);
  }

  return (
    <QuestLock id="prepositions">
      <ActivityShell
        eyebrow="Maps"
        title="Where is the bee?"
        progress={{ current: done ? total : index + (correct ? 1 : 0), total }}
      >
        {done ? (
          <ContinueAfter active />
        ) : (
          <Animated.View key={q.id} entering={FadeInDown.duration(200).springify()}>
            {/* Progress trail */}
            <View style={styles.trailRow}>
              {deck.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.trailDot,
                    i < index + (correct ? 1 : 0) && styles.trailDotDone,
                    i === index && styles.trailDotNow,
                  ]}
                />
              ))}
              <Text style={styles.trailCount}>{index + 1} of {total}</Text>
            </View>

            {/* Scene image — full-width, aspect-ratio safe, no crop */}
            <View style={styles.imageCard}>
              <Image
                source={q.image}
                style={styles.sceneImage}
                resizeMode="contain"
                accessibilityLabel={q.prompt}
              />
              <BouncePress
                onPress={() => speak(picked ? finished : q.prompt, "sentence")}
                style={styles.hearBtn}
                sound={false}
              >
                <Ionicons name="volume-high" size={18} color={colors.navy} />
              </BouncePress>
            </View>

            {/* Fill-in sentence */}
            <View style={styles.clozeCard}>
              <View style={styles.clozeRow}>
                <Text style={styles.clozeText}>{before}</Text>
                <View
                  style={[
                    styles.blank,
                    !picked && styles.blankEmpty,
                    picked && correct && styles.blankRight,
                    picked && !correct && styles.blankWrong,
                  ]}
                >
                  {picked && correct ? (
                    <Animated.View entering={ZoomIn.duration(200)} style={styles.blankCheck}>
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    </Animated.View>
                  ) : null}
                  <Text
                    style={[
                      styles.blankText,
                      !picked && styles.blankHint,
                      picked && correct && styles.blankTextRight,
                      picked && !correct && styles.blankTextWrong,
                    ]}
                  >
                    {picked || "___"}
                  </Text>
                </View>
                <Text style={styles.clozeText}>{after}</Text>
              </View>
            </View>

            {/* Choice buttons */}
            <View style={styles.options}>
              {choices.map((opt) => {
                const selected = picked === opt;
                const right = selected && opt === q.answer;
                const wrong = selected && opt !== q.answer;
                const used = Boolean(picked);
                return (
                  <BouncePress
                    key={opt}
                    onPress={() => choose(opt)}
                    disabled={used}
                    sound={false}
                    style={[
                      styles.opt,
                      right && styles.optRight,
                      wrong && styles.optWrong,
                      used && !selected && styles.optOff,
                    ]}
                  >
                    <Text style={[styles.optText, used && !selected && styles.optTextOff]}>{opt}</Text>
                  </BouncePress>
                );
              })}
            </View>

            {picked && !correct ? (
              <View style={styles.wrongResult}>
                <Ionicons name="information-circle-outline" size={16} color={colors.nameRed} />
                <Text style={styles.wrongText}>The bee is <Text style={styles.wrongAnswer}>{q.answer}</Text>.</Text>
                <BouncePress onPress={tryAgain} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Try again</Text>
                </BouncePress>
              </View>
            ) : (
              <StepNext
                ready={correct}
                last={last}
                onNext={next}
                wait="Tap the word that fits."
              />
            )}
          </Animated.View>
        )}
      </ActivityShell>
    </QuestLock>
  );
}

const styles = StyleSheet.create({
  trailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  trailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  trailDotDone: { backgroundColor: colors.speak },
  trailDotNow: {
    backgroundColor: colors.yellow,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  trailCount: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginLeft: "auto" },
  imageCard: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radii.card + 2,
    backgroundColor: colors.practiceBg,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BECEF8",
  },
  sceneImage: { width: "100%", height: "100%" },
  hearBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  clozeCard: {
    backgroundColor: colors.streakBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "#F0DC80",
    padding: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  clozeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  clozeText: { fontFamily: fonts.bold, color: colors.navy, fontSize: 19, lineHeight: 28 },
  blank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 76,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 2,
    justifyContent: "center",
  },
  blankEmpty: {
    borderStyle: "dashed",
    borderColor: colors.yellow,
    backgroundColor: "#FFFDE7",
  },
  blankRight: { borderStyle: "solid", borderColor: colors.speak, backgroundColor: colors.successBg },
  blankWrong: { borderStyle: "solid", borderColor: colors.nameRed, backgroundColor: "#FDECEA" },
  blankCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.speak,
    alignItems: "center",
    justifyContent: "center",
  },
  blankText: { fontFamily: fonts.extra, color: colors.navy, fontSize: 19 },
  blankHint: { color: colors.muted, fontSize: 16, fontFamily: fonts.medium },
  blankTextRight: { color: colors.successText },
  blankTextWrong: { color: colors.nameRed },
  options: { flexDirection: "row", gap: 10, marginBottom: 6 },
  opt: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  optRight: { borderColor: colors.speak, backgroundColor: colors.successBg },
  optWrong: { borderColor: colors.nameRed, backgroundColor: "#FDECEA" },
  optOff: { opacity: 0.35 },
  optText: { fontFamily: fonts.extra, color: colors.navy, fontSize: 18 },
  optTextOff: { color: colors.muted },
  wrongResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FDECEA",
    borderRadius: radii.card,
    padding: 12,
    marginTop: 4,
    flexWrap: "wrap",
  },
  wrongText: { fontFamily: fonts.medium, color: colors.nameRed, fontSize: 14, flex: 1 },
  wrongAnswer: { fontFamily: fonts.extra, color: colors.nameRed },
  retryBtn: {
    backgroundColor: colors.navy,
    borderRadius: radii.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { fontFamily: fonts.bold, color: colors.white, fontSize: 13 },
});
