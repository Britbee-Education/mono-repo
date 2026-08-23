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
import { useProgress } from "@/context/ProgressContext";
import { wordArt } from "@/lib/art";

export default function StoryCorrectScreen() {
  const { missed, markStoryDone, ready, track, saveTrack } = useProgress();
  const [queue, setQueue] = useState(missed);
  const [index, setIndex] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [done, setDone] = useState(false);
  const [booted, setBooted] = useState(false);
  const total = Math.max(1, queue.length);
  const current = queue[index];
  const last = index >= queue.length - 1;

  useEffect(() => {
    if (!ready || booted) return;
    const bag = track.story?.bag?.length ? track.story.bag : missed;
    setQueue(bag);
    setIndex(Math.min(track.story?.polishIndex || 0, Math.max(0, bag.length - 1)));
    setDone(bag.length === 0);
    setBooted(true);
  }, [ready, booted, track.story, missed]);

  useEffect(() => {
    if (!booted || done) return;
    saveTrack({
      story: {
        index: track.story?.index || 0,
        said: true,
        bag: queue,
        polish: true,
        polishIndex: index,
      },
    });
  }, [booted, done, index, queue, saveTrack, track.story?.index]);

  function wrapUp() {
    markStoryDone(true);
    setDone(true);
  }

  function next() {
    if (!last) {
      setIndex((i) => i + 1);
      setCleared(false);
      return;
    }
    wrapUp();
  }

  return (
    <ActivityShell
      eyebrow={done ? "Story" : `Polish · ${Math.min(index + 1, total)} of ${total}`}
      title={done ? "Story complete" : "Say it again"}
      progress={done || queue.length === 0 ? { current: total, total } : { current: index + (cleared ? 1 : 0), total }}
      fallback="/activity/story"
    >
      {!booted ? null : done || queue.length === 0 ? (
        <ContinueAfter active prepare={wrapUp} />
      ) : (
        <Animated.View key={current?.word} entering={FadeInDown.duration(200).springify()}>
          {/* Progress trail */}
          <View style={styles.trailRow}>
            {queue.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.trailDot,
                  i < index + (cleared ? 1 : 0) && styles.trailDotDone,
                  i === index && !cleared && styles.trailDotNow,
                ]}
              />
            ))}
            <Text style={styles.trailCount}>Word {index + 1} of {total}</Text>
          </View>

          {/* Image */}
          <SceneArt source={wordArt(current.word)} label={current.word} aspectRatio={4 / 3} />

          {/* Word card */}
          <View style={styles.wordCard}>
            <View style={styles.wordRow}>
              <Text style={styles.word}>{current.word}</Text>
              {cleared ? (
                <Animated.View entering={ZoomIn.duration(220)} style={styles.clearBadge}>
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                </Animated.View>
              ) : null}
            </View>
            <View style={styles.hintRow}>
              <Ionicons name="mic-outline" size={13} color={colors.muted} />
              <Text style={styles.hintText}>Say this word clearly</Text>
            </View>
          </View>

          <SpeakPractice
            key={current.word}
            target={current.word}
            playLabel="Hear it"
            style="word"
            onClear={() => setCleared(true)}
          />
          <StepNext ready={cleared} last={last} onNext={next} />
        </Animated.View>
      )}
    </ActivityShell>
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
  wordCard: {
    backgroundColor: colors.practiceBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "#BECEF8",
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    gap: 8,
  },
  wordRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  word: {
    fontFamily: fonts.extra,
    fontSize: 32,
    color: colors.navy,
    textTransform: "capitalize",
    textAlign: "center",
  },
  clearBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.speak,
    alignItems: "center",
    justifyContent: "center",
  },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  hintText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
});
