import { Modal, View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, radii } from "@/constants/theme";
import { planetsDicebearPngUrl, sproutsDicebearPngUrl } from "@/lib/dicebear";
import { NextUnlockLabel } from "@/components/game/NextUnlockLabel";
import {
  DAILY_PACK_SCHEDULE,
  CLASS_PACK_SCHEDULE,
  packDayEntry,
  classPackDayEntry,
  planetRewardForClassStreak,
  sproutRewardForStreak,
  type PackDay,
} from "@/lib/quests";

function ScheduleRow({
  entry,
  isCurrent,
  isPast,
  showSprout,
  showPlanet,
  stepIndex,
}: {
  entry: PackDay;
  isCurrent: boolean;
  isPast: boolean;
  showSprout?: boolean;
  showPlanet?: boolean;
  stepIndex: number;
}) {
  const sprout = showSprout ? sproutRewardForStreak(entry.day) : null;
  const planet = showPlanet ? planetRewardForClassStreak(entry.day) : null;
  const state = isCurrent ? "NOW" : isPast ? "DONE" : "NEXT";
  return (
    <View
      style={[
        styles.row,
        isCurrent && styles.rowCurrent,
        isPast && styles.rowPast,
      ]}
    >
      {isCurrent ? (
        <LinearGradient
          colors={["#FFE566", "#F5C400"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      ) : null}
      <View style={styles.dayCol}>
        <View style={[styles.stepDot, isCurrent && styles.stepDotNow, isPast && styles.stepDotDone]}>
          <Text style={[styles.stepDotTxt, isPast && styles.stepDotTxtDone]}>{stepIndex + 1}</Text>
        </View>
        {isPast ? (
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={12} color={colors.white} />
          </View>
        ) : isCurrent ? (
          <View style={[styles.checkCircle, styles.checkNow]}>
            <Text style={styles.checkNowTxt}>▶</Text>
          </View>
        ) : (
          <View style={[styles.checkCircle, styles.checkFuture]}>
            <Ionicons name="lock-closed" size={10} color={colors.muted} />
          </View>
        )}
        <Text style={[styles.dayLabel, isCurrent && styles.dayLabelNow, isPast && styles.dayLabelPast]} numberOfLines={1}>
          {entry.label}
        </Text>
      </View>
      <View style={styles.pointsCol}>
        {entry.bonus > 0 ? (
          <>
            <Text style={[styles.pts, isCurrent && styles.ptsNow, isPast && styles.ptsPast]}>
              {entry.points}
            </Text>
            <View style={styles.bonusPill}>
              <Text style={styles.bonusTxt}>+{entry.bonus} 🎉</Text>
            </View>
            <Text style={[styles.total, isCurrent && styles.totalNow]}>= {entry.total} Buzz Points</Text>
          </>
        ) : (
            <Text style={[styles.pts, styles.ptsSingle, isCurrent && styles.ptsNow, isPast && styles.ptsPast]}>
            +{entry.total} Buzz Points
          </Text>
        )}
      </View>
      {sprout ? (
        <View style={[styles.sproutRow, !isPast && !isCurrent && styles.sproutFuture]}>
          <Image source={{ uri: sproutsDicebearPngUrl({ seed: sprout.id, size: 44 }) }} style={styles.sproutAvatar} />
          <View style={{ minWidth: 0 }}>
            <Text style={styles.sproutMiniName} numberOfLines={1}>{sprout.label}</Text>
            <Text style={styles.sproutMiniTxt}>{sprout.rarity}</Text>
          </View>
        </View>
      ) : null}
      {planet ? (
        <View style={[styles.sproutRow, !isPast && !isCurrent && styles.sproutFuture]}>
          <Image source={{ uri: planetsDicebearPngUrl({ seed: planet.id, size: 44 }) }} style={styles.sproutAvatar} />
          <View style={{ minWidth: 0 }}>
            <Text style={styles.sproutMiniName} numberOfLines={1}>{planet.label}</Text>
            <Text style={styles.sproutMiniTxt}>{planet.rarity}</Text>
          </View>
        </View>
      ) : null}
      {entry.milestone ? (
        <View style={styles.milestoneChip}>
          <Text style={styles.milestoneTxt} numberOfLines={1}>{entry.milestone}</Text>
        </View>
      ) : null}
      <View style={[styles.statePill, isCurrent && styles.statePillNow, isPast && styles.statePillDone]}>
        <Text style={[styles.statePillTxt, isCurrent && styles.statePillTxtNow]}>{state}</Text>
      </View>
    </View>
  );
}

export function PackScheduleModal({
  visible,
  onClose,
  kind,
  streak,
  sprouts = [],
  planets = [],
  claimedToday = false,
}: {
  visible: boolean;
  onClose: () => void;
  kind: "daily" | "class";
  streak: number;
  sprouts?: { id: string; label: string; points: number; claimedAt: string }[];
  planets?: { id: string; label: string; points: number; claimedAt: string }[];
  claimedToday?: boolean;
}) {
  const schedule = kind === "daily" ? DAILY_PACK_SCHEDULE : CLASS_PACK_SCHEDULE;
  const currentEntry = kind === "daily" ? packDayEntry(streak) : classPackDayEntry(streak);

  const title = kind === "daily" ? "Daily Sprouts" : "Class Bonus";
  const subtitle =
    kind === "daily"
      ? "Come back each day to grow a new sprout buddy. Miss a day and your streak starts again."
      : "Join classes often to unlock electric planet buddies. Miss one and your streak starts again.";
  const streakLabel =
    kind === "daily"
      ? streak > 0 ? `You're on day ${streak}` : "Show up today to start!"
      : streak > 0 ? `${streak} class days in a row` : "Join a class to start!";
  const recentSprouts = sprouts.slice(-6).reverse();
  const recentPlanets = planets.slice(-6).reverse();
  const todaySprout = sproutRewardForStreak(Math.max(1, streak));
  const todayPlanet = planetRewardForClassStreak(Math.max(1, streak));
  const currentIndex = Math.max(
    0,
    schedule.findIndex((entry) => entry.day === currentEntry.day)
  );
  const progressPct = Math.round(((currentIndex + 1) / Math.max(1, schedule.length)) * 100);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {claimedToday ? (
          <View style={styles.claimedBanner}>
            <Text style={styles.claimedTitle}>Opened today ✓</Text>
            <NextUnlockLabel kind={kind === "daily" ? "sprout" : "pack"} style={styles.claimedSub} />
          </View>
        ) : null}

        {/* Current streak badge */}
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>{streak >= 5 ? "🔥" : streak >= 3 ? "⚡" : "⭐"}</Text>
          <View>
            <Text style={styles.streakLabel}>{streakLabel}</Text>
            <Text style={styles.streakEarn}>
              Today you earn{" "}
              <Text style={styles.streakPts}>+{currentEntry.total} Buzz Points</Text>
            </Text>
            {kind === "daily" ? (
              <Text style={styles.streakSprout}>
                Plus you unlock <Text style={styles.streakPts}>{sproutRewardForStreak(Math.max(1, streak)).label}</Text> ·{" "}
                <Text style={styles.streakPts}>{sproutRewardForStreak(Math.max(1, streak)).rarity}</Text>
              </Text>
            ) : (
              <Text style={styles.streakSprout}>
                Plus you unlock <Text style={styles.streakPts}>{planetRewardForClassStreak(Math.max(1, streak)).label}</Text> ·{" "}
                <Text style={styles.streakPts}>{planetRewardForClassStreak(Math.max(1, streak)).rarity}</Text>
              </Text>
            )}
          </View>
        </View>

        <View style={styles.journeyCard}>
          <View style={styles.journeyHead}>
            <Text style={styles.journeyTitle}>Your Reward Journey</Text>
            <Text style={styles.journeyMeta}>
              Step {currentIndex + 1}/{schedule.length}
            </Text>
          </View>
          <View style={styles.journeyTrack}>
            <View style={[styles.journeyFill, { width: `${Math.max(10, progressPct)}%` }]} />
            <View style={styles.journeyKnob}>
              <Ionicons name="sparkles" size={11} color={colors.navy} />
            </View>
          </View>
          <Text style={styles.journeySub}>
            Keep going to unlock bigger Buzz Points and new {kind === "daily" ? "sprouts" : "planets"}.
          </Text>
        </View>

        {kind === "daily" ? (
          <View style={styles.featureCard}>
            <Text style={styles.featureKicker}>Today’s Featured Sprout</Text>
            <View style={styles.featureAvatarWrap}>
              <Image source={{ uri: sproutsDicebearPngUrl({ seed: todaySprout.id, size: 144 }) }} style={styles.featureAvatar} />
            </View>
            <Text style={styles.featureName}>{todaySprout.label}</Text>
            <Text style={styles.featureMeta}>
              {todaySprout.rarity}
            </Text>
          </View>
        ) : (
          <View style={[styles.featureCard, styles.featureCardPlanet]}>
            <Text style={[styles.featureKicker, styles.featureKickerPlanet]}>Today’s Featured Planet</Text>
            <View style={[styles.featureAvatarWrap, styles.featureAvatarWrapPlanet]}>
              <Image source={{ uri: planetsDicebearPngUrl({ seed: todayPlanet.id, size: 144 }) }} style={styles.featureAvatar} />
            </View>
            <Text style={styles.featureName}>{todayPlanet.label}</Text>
            <Text style={styles.featureMeta}>
              {todayPlanet.rarity}
            </Text>
          </View>
        )}

        {kind === "daily" ? (
          <View style={styles.collectionCard}>
            <View style={styles.collectionHead}>
              <Text style={styles.collectionTitle}>Your Sprout Garden</Text>
              <Text style={styles.collectionMeta}>{sprouts.length} collected</Text>
            </View>
            {recentSprouts.length ? (
              <View style={styles.collectionRow}>
                {recentSprouts.map((s, idx) => (
                  <View key={`${s.id}-${s.claimedAt}-${idx}`} style={[styles.collectionBubble, idx > 0 && { marginLeft: -8 }]}>
                    <Image source={{ uri: sproutsDicebearPngUrl({ seed: `${s.id}|${s.claimedAt}`, size: 40 }) }} style={styles.collectionImg} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.collectionEmpty}>Open today’s Daily Sprout to meet your first plant friend.</Text>
            )}
          </View>
        ) : null}

        {kind === "class" ? (
          <View style={[styles.collectionCard, styles.collectionCardPlanet]}>
            <View style={styles.collectionHead}>
              <Text style={styles.collectionTitle}>Your Planet Vault</Text>
              <Text style={styles.collectionMeta}>{planets.length} collected</Text>
            </View>
            {recentPlanets.length ? (
              <View style={styles.collectionRow}>
                {recentPlanets.map((p, idx) => (
                  <View key={`${p.id}-${p.claimedAt}-${idx}`} style={[styles.collectionBubble, idx > 0 && { marginLeft: -8 }]}>
                    <Image source={{ uri: planetsDicebearPngUrl({ seed: `${p.id}|${p.claimedAt}`, size: 40 }) }} style={styles.collectionImg} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.collectionEmpty}>Join class and open Class Bonus to get your first planet buddy.</Text>
            )}
          </View>
        ) : null}

        {/* Reset note */}
        {streak >= 3 ? (
          <View style={styles.resetNote}>
            <Ionicons name="warning-outline" size={14} color="#C47A00" />
            <Text style={styles.resetTxt}>Take a break and your streak restarts at Day 1.</Text>
          </View>
        ) : null}

        {/* Schedule table */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {schedule.map((entry, idx) => {
            const isCurrent = entry.day === currentEntry.day;
            const isPast = entry.day < currentEntry.day;
            return (
              <ScheduleRow
                key={entry.day}
                entry={entry}
                isCurrent={isCurrent}
                isPast={isPast}
                showSprout={kind === "daily"}
                showPlanet={kind === "class"}
                stepIndex={idx}
              />
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11,31,77,0.52)",
  },
  sheet: {
    backgroundColor: "#FFFDF8",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "86%",
  },
  handle: {
    alignSelf: "center",
    width: 56,
    height: 5,
    borderRadius: 2,
    backgroundColor: "#E7DDBF",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  title: { fontFamily: fonts.extra, color: colors.navy, fontSize: 24 },
  subtitle: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F6F0DE",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    flexShrink: 0,
  },
  claimedBanner: {
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A5D6A7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  claimedTitle: { fontFamily: fonts.extra, color: "#2E7D32", fontSize: 14 },
  claimedSub: { fontFamily: fonts.medium, color: colors.ink, fontSize: 12, marginTop: 3 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF8DC",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#ECCD66",
    padding: 12,
    marginBottom: 10,
  },
  streakEmoji: { fontSize: 30 },
  streakLabel: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16 },
  streakEarn: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, marginTop: 2 },
  streakPts: { fontFamily: fonts.extra, color: "#C47A00" },
  streakSprout: { fontFamily: fonts.medium, color: colors.ink, fontSize: 12, marginTop: 4, lineHeight: 17 },
  journeyCard: {
    backgroundColor: "#F2F6FF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#D8E5FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  journeyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  journeyTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 14 },
  journeyMeta: { fontFamily: fonts.bold, color: "#3D66BA", fontSize: 11 },
  journeyTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: "#E1EBFF",
    borderWidth: 1,
    borderColor: "#C9DBFF",
    overflow: "hidden",
    justifyContent: "center",
  },
  journeyFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#8EB2FF",
  },
  journeyKnob: {
    marginLeft: "auto",
    marginRight: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFE566",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F3C233",
  },
  journeySub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 7 },
  featureCard: {
    alignItems: "center",
    backgroundColor: "#F8F3FF",
    borderWidth: 1.5,
    borderColor: "#E8D9FF",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  featureCardPlanet: {
    backgroundColor: "#EEF4FF",
    borderColor: "#D5E5FF",
  },
  featureKicker: { fontFamily: fonts.bold, color: colors.listen, fontSize: 12 },
  featureKickerPlanet: { color: "#3B6FD8" },
  featureAvatarWrap: {
    marginTop: 8,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E8D9FF",
  },
  featureAvatarWrapPlanet: { borderColor: "#D5E5FF" },
  featureAvatar: { width: 72, height: 72, borderRadius: 36 },
  featureName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16, marginTop: 8 },
  featureMeta: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12, marginTop: 2 },
  collectionCard: {
    backgroundColor: "#EAF8EE",
    borderWidth: 1.5,
    borderColor: "#BFE4C9",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  collectionCardPlanet: {
    backgroundColor: "#EEF4FF",
    borderColor: "#D5E5FF",
  },
  collectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  collectionTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 14 },
  collectionMeta: { fontFamily: fonts.bold, color: colors.speak, fontSize: 11 },
  collectionRow: { flexDirection: "row", alignItems: "center", marginTop: 9, paddingBottom: 2 },
  collectionBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: "#DDF2E3",
    alignItems: "center",
    justifyContent: "center",
  },
  collectionImg: { width: 32, height: 32, borderRadius: 16 },
  collectionEmpty: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 6 },
  resetNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF8E1",
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 14,
  },
  resetTxt: { fontFamily: fonts.medium, color: "#C47A00", fontSize: 12, flex: 1 },
  list: { marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    overflow: "hidden",
    minHeight: 44,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE6D5",
  },
  rowCurrent: { borderWidth: 2, borderColor: colors.yellow, backgroundColor: "#FFF8DF" },
  rowPast: { opacity: 0.82, backgroundColor: "#F8FBF6" },
  dayCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D9DFEC",
    backgroundColor: "#F4F6FB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepDotNow: { backgroundColor: "#FFE566", borderColor: "#F5C400" },
  stepDotDone: { backgroundColor: "#DDF5E3", borderColor: "#9FD5AF" },
  stepDotTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 10 },
  stepDotTxtDone: { color: "#2A7E45" },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.speak,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkNow: { backgroundColor: colors.navy },
  checkNowTxt: { color: colors.yellow, fontSize: 9, fontFamily: fonts.extra },
  checkFuture: { backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.border },
  dayLabel: { fontFamily: fonts.bold, color: colors.navy, fontSize: 13, flexShrink: 1 },
  dayLabelNow: { fontFamily: fonts.extra, color: colors.navy },
  dayLabelPast: { color: colors.muted },
  pointsCol: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  pts: { fontFamily: fonts.extra, color: colors.muted, fontSize: 14 },
  ptsSingle: { color: colors.navy },
  ptsNow: { color: colors.navy },
  ptsPast: { color: colors.muted },
  bonusPill: {
    backgroundColor: colors.yellow,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bonusTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 11 },
  total: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  totalNow: { color: colors.navy },
  sproutRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 2 },
  sproutFuture: { opacity: 0.45 },
  sproutAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#EAF5EE", borderWidth: 1, borderColor: "#CFE9D5" },
  sproutMiniName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 10, maxWidth: 88 },
  sproutMiniTxt: { fontFamily: fonts.extra, color: colors.speak, fontSize: 9 },
  milestoneChip: {
    backgroundColor: "#F2F6FF",
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 1,
    maxWidth: 120,
  },
  milestoneTxt: { fontFamily: fonts.medium, color: colors.navy, fontSize: 10 },
  statePill: {
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#EEF2FA",
    borderWidth: 1,
    borderColor: "#D6DFEF",
  },
  statePillNow: { backgroundColor: "#FFEEC5", borderColor: "#F3C233" },
  statePillDone: { backgroundColor: "#E0F4E7", borderColor: "#A4D5B2" },
  statePillTxt: { fontFamily: fonts.extra, color: colors.muted, fontSize: 9 },
  statePillTxtNow: { color: "#9B6100" },
});
