import { useEffect } from "react";
import { View, Text, StyleSheet, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityShell } from "@/components/activity/ActivityShell";
import { BouncePress } from "@/components/game/BouncePress";
import { colors, fonts, radii } from "@/constants/theme";
import { PHONICS, PHONICS_GROUPS, getPhonicsById, type PhonicsSound } from "@/data/phonics";
import { wordArt } from "@/lib/art";
import { prefetchClip, prefetchSpeech, speak } from "@/lib/speech";
import { useProgress } from "@/context/ProgressContext";
import { groupLockHint, groupUnlocked } from "@/lib/quests";
import { playSfx } from "@/lib/sfx";
import { useLayout } from "@/lib/layout";

export default function PhonicsChartScreen() {
  const router = useRouter();
  const { clearedSounds, track } = useProgress();
  const { cols } = useLayout();
  const tileWidth = cols >= 5 ? "18%" : cols >= 4 ? "23%" : "31%";
  const resume = track.phonics ? getPhonicsById(track.phonics.soundId) : null;
  const resumeStep = track.phonics ? track.phonics.index + (track.phonics.cleared ? 1 : 0) : 0;

  useEffect(() => {
    prefetchSpeech();
    PHONICS.forEach((s) => prefetchClip(s.spoken, "sound"));
  }, []);

  function openSound(s: PhonicsSound, locked: boolean) {
    if (locked) {
      playSfx("miss");
      Alert.alert("Keep buzzing", groupLockHint(s.group));
      return;
    }
    speak(s.spoken, "sound");
    router.push(`/activity/phonics/${s.id}`);
  }

  return (
    <ActivityShell eyebrow="Sounds" title="Pick a sound">
      {resume ? (
        <BouncePress
          sound={false}
          onPress={() => router.push(`/activity/phonics/${resume.id}`)}
          style={styles.resume}
        >
          <Text style={styles.resumeTitle} numberOfLines={1}>
            Resume {resume.title}
          </Text>
          <Text style={styles.resumeSub}>
            Word {Math.min(resumeStep + 1, 3)} of 3
          </Text>
        </BouncePress>
      ) : null}
      {PHONICS_GROUPS.map((group) => {
        const open = groupUnlocked(group.id, clearedSounds);
        const cleared = PHONICS.filter((s) => s.group === group.id && clearedSounds.includes(s.id)).length;
        const total = PHONICS.filter((s) => s.group === group.id).length;
        return (
          <View key={group.id} style={{ marginBottom: 18 }}>
            <View style={styles.groupRow}>
              <Text style={styles.group}>{group.label}</Text>
              <Text style={styles.groupMeta}>{open ? `${cleared}/${total}` : "Locked"}</Text>
            </View>
            <View style={styles.grid}>
              {PHONICS.filter((s) => s.group === group.id).map((s) => {
                const mastered = clearedSounds.includes(s.id);
                const thumb = wordArt(s.examples[0]?.word);
                return (
                  <BouncePress
                    key={s.id}
                    onPress={() => openSound(s, !open)}
                    sound={false}
                    style={[
                      styles.tile,
                      { width: tileWidth, flexGrow: cols > 3 ? 0 : 1 },
                      mastered && styles.tileWon,
                      !open && styles.tileLock,
                      resume?.id === s.id && styles.tileNow,
                    ]}
                  >
                    {mastered ? (
                      <View style={styles.star}>
                        <Ionicons name="star" size={11} color={colors.navy} />
                      </View>
                    ) : null}
                    {!open ? (
                      <View style={styles.lock}>
                        <Ionicons name="lock-closed" size={11} color={colors.muted} />
                      </View>
                    ) : null}
                    {thumb ? <Image source={thumb} style={styles.tileArt} /> : null}
                    <Text style={styles.glyph}>{s.glyph}</Text>
                    <Text style={styles.tileTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                  </BouncePress>
                );
              })}
            </View>
          </View>
        );
      })}
    </ActivityShell>
  );
}

const styles = StyleSheet.create({
  groupRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  group: { fontFamily: fonts.bold, color: colors.navy, fontSize: 13 },
  groupMeta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "31%",
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tileArt: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F6F1E8",
  },
  tileWon: { borderColor: colors.yellow, backgroundColor: colors.streakBg },
  tileNow: { borderColor: colors.navy, borderWidth: 2 },
  tileLock: { opacity: 0.48 },
  resume: {
    backgroundColor: colors.streakBg,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.yellow,
    padding: 12,
    marginBottom: 16,
  },
  resumeTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16 },
  resumeSub: { fontFamily: fonts.bold, color: colors.ink, fontSize: 12, marginTop: 2 },
  star: { position: "absolute", top: 6, right: 6 },
  lock: { position: "absolute", top: 6, left: 6 },
  glyph: { fontFamily: fonts.extra, fontSize: 28, color: colors.navy },
  tileTitle: { fontFamily: fonts.semi, color: colors.navy, fontSize: 11, marginTop: 4 },
});
