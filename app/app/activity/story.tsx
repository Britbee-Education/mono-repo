import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { SpeakPractice } from "@/components/activity/SpeakPractice";
import { StepNext } from "@/components/activity/Flow";
import { ContinueAfter } from "@/components/activity/ContinueAfter";
import { SceneArt } from "@/components/activity/SceneArt";
import { colors, fonts, radii } from "@/constants/theme";
import { STORY } from "@/data/story";
import { storyArt } from "@/lib/art";
import { useProgress } from "@/context/ProgressContext";
import { QuestLock } from "@/components/game/QuestLock";

export default function StoryScreen() {
  const router = useRouter();
  const { setMissed, markStoryDone, ready, track, saveTrack } = useProgress();
  const [index, setIndex] = useState(0);
  const [bag, setBag] = useState<{ word: string; sound?: string }[]>([]);
  const [said, setSaid] = useState(false);
  const [done, setDone] = useState(false);
  const [booted, setBooted] = useState(false);
  const sentence = STORY.sentences[index];
  const last = index === STORY.sentences.length - 1;
  const total = STORY.sentences.length;

  useEffect(() => {
    if (!ready || booted) return;
    if (track.story?.polish) {
      router.replace("/activity/story-correct");
      return;
    }
    const saved = track.story;
    if (saved) {
      setIndex(Math.min(saved.index, total - 1));
      setSaid(saved.said);
      setBag(saved.bag || []);
    }
    setBooted(true);
  }, [ready, booted, track.story, router, total]);

  useEffect(() => {
    if (!booted || done) return;
    saveTrack({ story: { index, said, bag } });
  }, [booted, done, index, said, bag, saveTrack]);

  function collect(missedWords: string[]) {
    if (!missedWords.length) return;
    setBag((prev) => {
      const next = [...prev];
      for (const w of missedWords) {
        if (next.some((x) => x.word.toLowerCase() === w.toLowerCase())) continue;
        const key = Object.keys(sentence.soundHints).find((k) => k.toLowerCase() === w.toLowerCase());
        next.push({ word: w, sound: key ? sentence.soundHints[key] : undefined });
      }
      return next;
    });
  }

  function next() {
    if (!last) {
      setIndex((i) => i + 1);
      setSaid(false);
      return;
    }
    if (bag.length) {
      setMissed(bag);
      saveTrack({ story: { index, said: true, bag, polish: true, polishIndex: 0 } });
      router.push("/activity/story-correct");
      return;
    }
    markStoryDone(true);
    setDone(true);
  }

  return (
    <QuestLock id="story">
      <ActivityShell
        eyebrow={`Story · ${Math.min(index + 1, total)} of ${total}`}
        title={STORY.title}
        progress={{ current: done ? total : index + (said ? 1 : 0), total }}
      >
        {done ? (
          <ContinueAfter active />
        ) : (
          <Animated.View key={index} entering={FadeInDown.duration(200).springify()}>
            {/* Scene illustration — full width, aspect-ratio safe */}
            <SceneArt
              source={storyArt(index)}
              label={sentence.text}
              cover
              aspectRatio={16 / 9}
            />

            {/* Page counter strip */}
            <View style={styles.pageStrip}>
              <View style={styles.pageDots}>
                {STORY.sentences.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.pageDot,
                      i < index + (said ? 1 : 0) && styles.pageDotDone,
                      i === index && styles.pageDotNow,
                    ]}
                  />
                ))}
              </View>
              {said ? (
                <Animated.View entering={ZoomIn.duration(220)} style={styles.lineClear}>
                  <Ionicons name="checkmark" size={13} color={colors.white} />
                  <Text style={styles.lineClearText}>Line clear</Text>
                </Animated.View>
              ) : null}
            </View>

            {/* Story line */}
            <View style={styles.lineCard}>
              <Text style={styles.lineQuote}>"</Text>
              <Text style={styles.line}>{sentence.text}</Text>
              <Text style={[styles.lineQuote, styles.lineQuoteRight]}>"</Text>
            </View>

            <SpeakPractice
              key={index}
              target={sentence.text}
              playLabel="Hear it"
              style="sentence"
              onResult={(r) => {
                collect(r.missed);
                if (r.ok) setSaid(true);
              }}
              onClear={() => setSaid(true)}
            />
            <StepNext ready={said} last={last} onNext={next} wait="Say this line clearly, then tap Next." />
          </Animated.View>
        )}
      </ActivityShell>
    </QuestLock>
  );
}

const styles = StyleSheet.create({
  pageStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pageDots: { flexDirection: "row", gap: 6, alignItems: "center" },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  pageDotDone: { backgroundColor: colors.speak },
  pageDotNow: { backgroundColor: colors.yellow, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.navy },
  lineClear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.speak,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lineClearText: { fontFamily: fonts.bold, color: colors.white, fontSize: 11 },
  lineCard: {
    backgroundColor: colors.practiceBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "#BECEF8",
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  lineQuote: { fontFamily: fonts.extra, fontSize: 26, color: colors.yellow, lineHeight: 28, alignSelf: "flex-start" },
  lineQuoteRight: { alignSelf: "flex-end" },
  line: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
    lineHeight: 29,
    textAlign: "center",
    marginVertical: 6,
  },
});
