import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { SpeakPractice } from "@/components/activity/SpeakPractice";
import { StepNext } from "@/components/activity/Flow";
import { ContinueAfter } from "@/components/activity/ContinueAfter";
import { PillButton } from "@/components/ui/PillButton";
import { SceneArt } from "@/components/activity/SceneArt";
import { colors, fonts, radii } from "@/constants/theme";
import { getPhonicsById } from "@/data/phonics";
import { wordArt } from "@/lib/art";
import { speak } from "@/lib/speech";
import { useProgress } from "@/context/ProgressContext";

export default function PhonicsSoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const sound = getPhonicsById(String(id || ""));
  const { markSoundClear, ready, track, saveTrack } = useProgress();
  const words = sound?.examples || [];
  const [index, setIndex] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [done, setDone] = useState(false);
  const [booted, setBooted] = useState(false);
  const current = words[index];
  const last = index === words.length - 1;
  const filledCount = index + (cleared ? 1 : 0);

  useEffect(() => {
    if (!ready || !sound || booted) return;
    const saved = track.phonics;
    if (saved?.soundId === sound.id) {
      setIndex(Math.min(saved.index, Math.max(0, words.length - 1)));
      setCleared(saved.cleared);
    }
    setBooted(true);
  }, [ready, sound, booted, track.phonics, words.length]);

  useEffect(() => {
    if (!booted || !sound || done) return;
    saveTrack({ phonics: { soundId: sound.id, index, cleared } });
  }, [booted, done, sound, index, cleared, saveTrack]);

  if (!sound) {
    return (
      <ActivityShell title="Sound not found" fallback="/activity/phonics">
        <PillButton label="Back to Sounds" onPress={() => router.replace("/activity/phonics")} />
      </ActivityShell>
    );
  }

  function next() {
    if (!last) {
      setIndex((i) => i + 1);
      setCleared(false);
      return;
    }
    markSoundClear(sound!.id, true);
    setDone(true);
  }

  return (
    <ActivityShell
      eyebrow="Sounds"
      title={`${sound.glyph}  ${sound.title}`}
      progress={{ current: done ? words.length : filledCount, total: words.length }}
      fallback="/activity/phonics"
    >
      {done ? (
        <ContinueAfter active />
      ) : current ? (
        <Animated.View entering={FadeInDown.duration(220).springify()}>
          {/* Sound badge + hear button */}
          <View style={styles.topRow}>
            <Pressable onPress={() => speak(sound.spoken, "sound")} style={styles.soundBadge}>
              <Text style={styles.soundGlyph}>{sound.glyph}</Text>
              <View style={styles.hearBadge}>
                <Ionicons name="volume-high" size={12} color={colors.navy} />
              </View>
            </Pressable>
            <View style={styles.stepsWrap}>
              <Text style={styles.stepsLabel}>Word {index + 1} of {words.length}</Text>
              <Text style={styles.positionLabel}>{current.position}</Text>
              {/* dot trail */}
              <View style={styles.dots}>
                {words.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i < filledCount && styles.dotFilled,
                      i === index && !cleared && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Image — aspect-ratio safe */}
          <SceneArt
            source={wordArt(current.word)}
            label={current.word}
            aspectRatio={4 / 3}
          />

          {/* Word display */}
          <View style={styles.wordRow}>
            <Text style={styles.word}>{current.word}</Text>
            {cleared ? (
              <Animated.View entering={ZoomIn.duration(220)} style={styles.checkBadge}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
              </Animated.View>
            ) : null}
          </View>

          <SpeakPractice
            key={current.word}
            target={current.word}
            playLabel="Hear word"
            style="word"
            onClear={() => setCleared(true)}
          />
          <StepNext ready={cleared} last={last} onNext={next} />
        </Animated.View>
      ) : null}
    </ActivityShell>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  soundBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.streakBg,
    borderWidth: 2.5,
    borderColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  soundGlyph: { fontFamily: fonts.extra, fontSize: 30, color: colors.navy },
  hearBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.yellow,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepsWrap: { flex: 1, gap: 4 },
  stepsLabel: { fontFamily: fonts.extra, fontSize: 15, color: colors.navy },
  positionLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  dots: { flexDirection: "row", gap: 6, marginTop: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotFilled: { backgroundColor: colors.speak },
  dotActive: { backgroundColor: colors.yellow, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.navy, marginTop: -2 },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  word: {
    fontFamily: fonts.extra,
    fontSize: 36,
    color: colors.navy,
    textTransform: "capitalize",
    textAlign: "center",
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.speak,
    alignItems: "center",
    justifyContent: "center",
  },
});
