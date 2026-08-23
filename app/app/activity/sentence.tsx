import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { SpeakPractice } from "@/components/activity/SpeakPractice";
import { StepNext } from "@/components/activity/Flow";
import { ContinueAfter } from "@/components/activity/ContinueAfter";
import { SceneArt, WordStrip } from "@/components/activity/SceneArt";
import { colors, fonts, radii } from "@/constants/theme";
import { dailyPhonics } from "@/data/phonics";
import { speakArt, wordArt } from "@/lib/art";
import { useProgress } from "@/context/ProgressContext";
import { speak } from "@/lib/speech";
import { QuestLock } from "@/components/game/QuestLock";

export default function DailySentenceScreen() {
  const sound = dailyPhonics();
  const { markDailyDone, ready, track, saveTrack } = useProgress();
  const [cleared, setCleared] = useState(false);
  const [done, setDone] = useState(false);
  const [booted, setBooted] = useState(false);
  const scene = speakArt(sound.id);

  useEffect(() => {
    if (!ready || booted) return;
    if (track.sentence?.cleared) setCleared(true);
    setBooted(true);
  }, [ready, booted, track.sentence]);

  useEffect(() => {
    if (!booted || done) return;
    saveTrack({ sentence: { started: true, cleared } });
  }, [booted, done, cleared, saveTrack]);

  function finish() {
    markDailyDone(true);
    setDone(true);
  }

  return (
    <QuestLock id="sentence">
      <ActivityShell
        eyebrow="Speak · today's line"
        title="Speak"
        progress={{ current: done || cleared ? 1 : 0, total: 1 }}
      >
        {done ? (
          <ContinueAfter active />
        ) : (
          <Animated.View entering={FadeInDown.duration(220).springify()}>
            {/* Scene image */}
            {scene ? (
              <SceneArt source={scene} label={sound.sentence} cover aspectRatio={16 / 9} />
            ) : (
              <WordStrip
                sources={sound.examples.map((ex) => wordArt(ex.word))}
                labels={sound.examples.map((ex) => ex.word)}
              />
            )}

            {/* Sound focus card */}
            <View style={styles.focusRow}>
              <Pressable
                onPress={() => speak(sound.spoken, "sound")}
                style={styles.phonemeBadge}
              >
                <Text style={styles.phonemeGlyph}>{sound.glyph}</Text>
                <View style={styles.hearMini}>
                  <Ionicons name="volume-high" size={10} color={colors.navy} />
                </View>
              </Pressable>
              <View style={styles.focusText}>
                <Text style={styles.focusLabel}>Today's sound</Text>
                <Text style={styles.focusSound}>{sound.title}</Text>
              </View>
            </View>

            {/* Sentence to speak */}
            <View style={styles.sentenceCard}>
              <Text style={styles.sentenceQuote}>"</Text>
              <Text style={styles.sentence}>{sound.sentence}</Text>
              <Text style={styles.sentenceQuote}>"</Text>
            </View>

            <SpeakPractice
              target={sound.sentence}
              playLabel="Hear it"
              style="sentence"
              onClear={() => setCleared(true)}
            />
            <StepNext ready={cleared} last onNext={finish} wait="Hear it, say the whole line, then tap Finish." />
          </Animated.View>
        )}
      </ActivityShell>
    </QuestLock>
  );
}

const styles = StyleSheet.create({
  focusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.streakBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "#F0DC80",
    padding: 12,
    marginBottom: 14,
  },
  phonemeBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.navy,
  },
  phonemeGlyph: { fontFamily: fonts.extra, fontSize: 26, color: colors.navy },
  hearMini: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  focusText: { flex: 1 },
  focusLabel: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginBottom: 2 },
  focusSound: { fontFamily: fonts.extra, fontSize: 16, color: colors.navy },
  sentenceCard: {
    backgroundColor: colors.practiceBg,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BECEF8",
  },
  sentenceQuote: { fontFamily: fonts.extra, fontSize: 28, color: colors.yellow, lineHeight: 28, alignSelf: "flex-start" },
  sentence: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
    lineHeight: 28,
    textAlign: "center",
    marginVertical: 4,
  },
});
