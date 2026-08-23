import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { BouncePress } from "@/components/game/BouncePress";
import { HiveAvatar } from "@/components/hive/HiveAvatar";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";
import { useHive } from "@/context/HiveContext";
import { useParent } from "@/context/ParentContext";
import { useNotify } from "@/context/NotifyContext";
import { useLayout } from "@/lib/layout";
import { nextQuest, questDoneToday, questUnlocked, QUESTS, needFirst, DAILY_QUESTS, todayCount, ACTIVITY_BUZZ, activityPercent, resumeHref, HELLO_PACK_KEY, helloPackSize, classPackSize, planetRewardForClassStreak, sproutRewardForStreak } from "@/lib/quests";
import { coverArt } from "@/lib/art";
import { playSfx } from "@/lib/sfx";
import { colors, fonts } from "@/constants/theme";
import { motion } from "@/lib/motion";
import { RewardRow, TodayPips } from "@/components/game/StatBadges";
import { CardProgress } from "@/components/game/CardProgress";
import { PackScheduleModal } from "@/components/game/PackScheduleModal";
import { NextUnlockLabel } from "@/components/game/NextUnlockLabel";
import { formatCountdown } from "@/lib/day";
import { useIstDayCountdown } from "@/lib/useIstDayCountdown";

const beeArt = require("../../assets/bee.png");

const STARS = [
  { top: 18, left: 22, s: 5 },
  { top: 36, left: 70, s: 3 },
  { top: 14, right: 120, s: 4 },
  { top: 48, right: 88, s: 3 },
  { top: 22, right: 40, s: 4 },
  { bottom: 88, left: 40, s: 3 },
  { bottom: 70, right: 56, s: 4 },
];

function gradeLabel(level?: string, beeLevel?: number) {
  if (level === "beginner") return "Grade K";
  if (level === "intermediate") return "Grade 1–2";
  if (level === "advanced") return "Grade 3+";
  return `Level ${beeLevel || 1}`;
}

function BuzzEarn({
  amount,
  earned,
  locked,
  unlockMs,
}: {
  amount: number;
  earned?: boolean;
  locked?: boolean;
  unlockMs?: number;
}) {
  return (
    <View>
      <View style={[styles.buzzChip, earned && styles.buzzWon, locked && styles.buzzLock]}>
        <View style={[styles.buzzStar, earned && styles.buzzStarWon, locked && styles.buzzStarLock]}>
          <Ionicons name="star" size={10} color={locked ? colors.muted : colors.white} />
        </View>
        <Text style={[styles.buzzAmt, earned && styles.buzzAmtWon, locked && styles.dim]}>
          {earned ? `Won +${amount} Buzz Points` : `+${amount} Buzz Points`}
        </Text>
      </View>
      {earned && unlockMs !== undefined ? (
        <Text style={styles.buzzTimer}>Play again in {formatCountdown(unlockMs)}</Text>
      ) : null}
    </View>
  );
}

function friendsLine(
  done: boolean,
  unlocked: boolean,
  room: {
    done: number;
    total: number;
    live: { id?: string; name: string; hue?: number; look?: unknown }[];
    winners?: { id?: string; name: string; hue?: number; look?: unknown }[];
  }
) {
  if (!unlocked) return "";

  const live = room.live || [];
  const winners = room.winners || [];

  const take2 = (list: { name: string }[]) => list.slice(0, 2).filter(Boolean);

  if (done) {
    if (!winners.length) return "You did it first!";
    const [a, b] = take2(winners);
    return b ? `${a.name} and ${b.name} joined you today!` : `${a.name} joined you today!`;
  }

  if (live.length) {
    const [a, b] = take2(live);
    return b ? `${a.name} and ${b.name} are playing right now!` : `${a.name} is playing right now!`;
  }

  if (winners.length) {
    const [a, b] = take2(winners);
    return b ? `${a.name} and ${b.name} already played!` : `${a.name} already played!`;
  }

  return "Be the first bee!";
}

function friendsAvatars(
  done: boolean,
  unlocked: boolean,
  room: {
    live: { id?: string; name: string; hue?: number; look?: unknown }[];
    winners?: { id?: string; name: string; hue?: number; look?: unknown }[];
  }
) {
  if (!unlocked) return null;

  const live = room.live || [];
  const winners = room.winners || [];

  const picks = done ? winners : live.length ? live : winners;
  const items = picks.slice(0, 3);
  if (!items.length) return null;

  return (
    <View style={styles.friendAvatars}>
      {items.map((p, i) => (
        <View key={p.id || p.name} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <HiveAvatar name={p.name} hue={p.hue || 0} look={p.look as any} size={22} />
        </View>
      ))}
    </View>
  );
}

export function HiveRoom() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    snapshot,
    streak,
    points,
    rank,
    track,
    grantHelloPack,
    packsToday,
    attendStreak,
    classAttendStreak,
    sprouts,
    planets,
  } = useProgress();
  const [packModal, setPackModal] = useState<"daily" | "class" | null>(null);
  const { paused } = useParent();
  const { hive, refresh } = useHive();
  const { refresh: refreshInbox, unread } = useNotify();
  const { padX: _padX } = useLayout();
  const meName = user?.child?.childName?.split(" ")[0] || "friend";
  const next = nextQuest(snapshot);
  const todaySprout = sproutRewardForStreak(Math.max(1, attendStreak || 1));
  const todayPlanet = planetRewardForClassStreak(Math.max(1, classAttendStreak || 1));
  const unlockMs = useIstDayCountdown();
  const helloClaimed = packsToday.includes(HELLO_PACK_KEY);
  const classPackClaimed = packsToday.some((k) => k.startsWith("class:"));
  const todaySproutPts = helloPackSize(Math.max(1, attendStreak || 1));
  const todayPlanetPts = classPackSize(Math.max(1, classAttendStreak || 1));
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.04, motion.enter), withTiming(1, motion.enter)), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshInbox();
      grantHelloPack();
    }, [refresh, refreshInbox, grantHelloPack])
  );

  function play(href: string, locked?: boolean, hint?: string) {
    if (paused) {
      playSfx("miss");
      Alert.alert("Paused", "A parent paused practice in Parent Access.");
      return;
    }
    if (locked) {
      playSfx("miss");
      Alert.alert("Wait!", hint || "Do the activity before this one first.");
      return;
    }
    playSfx("buzz");
    router.push(href as any);
  }

  const doneToday = todayCount(snapshot);
  const dayWon = doneToday >= DAILY_QUESTS;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#15285A", "#1A2B5F", "#243A78"]} style={styles.hero}>
            {STARS.map((star, i) => (
              <View
                key={i}
                style={[
                  styles.star,
                  {
                    width: star.s,
                    height: star.s,
                    borderRadius: star.s / 2,
                    top: star.top,
                    left: star.left,
                    right: star.right,
                    bottom: star.bottom,
                  },
                ]}
              />
            ))}
            <View style={styles.bushL} />
            <View style={styles.bushR} />
            <View style={styles.heroRow}>
              <View style={styles.heroMain}>
                <View style={styles.hello}>
                  <BouncePress sound="tap" onPress={() => router.push("/avatar")}>
                    <HiveAvatar name={meName} hue={hive?.me.hue || 0} look={user?.child?.avatar || hive?.me.look} size={36} />
                  </BouncePress>
                  <View style={styles.helloCopy}>
                    <Text style={styles.hi} numberOfLines={1}>
                      Hi {meName}! 👋
                    </Text>
                    {dayWon ? (
                      <NextUnlockLabel kind="activities" style={styles.sub} numberOfLines={1} />
                    ) : (
                      <Text style={styles.sub} numberOfLines={1}>
                        {helloClaimed ? "Play all 5. Earn a streak." : "Open today's Daily Sprouts."}
                      </Text>
                    )}
                  </View>
                </View>
                <RewardRow streak={streak} points={points} />
              </View>
              <Image source={beeArt} style={styles.bee} resizeMode="contain" />
            </View>
            <View style={styles.todayBox}>
              <Text style={styles.todayTitle}>Today’s Buzz Pack</Text>
              {dayWon ? (
                <NextUnlockLabel kind="activities" style={styles.todaySub} />
              ) : (
                <Text style={styles.todaySub}>Complete today’s activities to unlock your 🎁</Text>
              )}
              <TodayPips done={doneToday} showCountdown={dayWon} />
            </View>
          </LinearGradient>

        {hive?.mentor ? (
          <BouncePress
            sound={false}
            onPress={() => {
              const q = QUESTS.find((x) => x.id === hive.mentor!.activityId);
              if (!q) return;
              play(q.href, !questUnlocked(q.id, snapshot), needFirst(q.id) || q.lockHint);
            }}
            style={[styles.banner, styles.bannerMaya]}
          >
            <HiveAvatar name="Maya" size={44} maya />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                Maya says play this
              </Text>
              <Text style={styles.bannerSub} numberOfLines={1}>
                {QUESTS.find((q) => q.id === hive.mentor!.activityId)?.kid || hive.mentor.title}
              </Text>
            </View>
            <Text style={styles.bannerGo}>OK</Text>
          </BouncePress>
        ) : null}

        {paused ? (
          <View style={styles.pauseBanner}>
            <Ionicons name="pause-circle" size={20} color={colors.navy} />
            <Text style={styles.pauseTxt}>A parent paused practice</Text>
          </View>
        ) : null}

        {/* Pack modals */}
        <PackScheduleModal
          visible={packModal === "daily"}
          onClose={() => setPackModal(null)}
          kind="daily"
          streak={attendStreak}
          sprouts={sprouts}
          claimedToday={helloClaimed}
        />
        <PackScheduleModal
          visible={packModal === "class"}
          onClose={() => setPackModal(null)}
          kind="class"
          streak={classAttendStreak}
          sprouts={sprouts}
          planets={planets}
          claimedToday={classPackClaimed}
        />

        <View style={styles.giftRow}>
          <BouncePress
            sound={false}
            onPress={() => setPackModal("daily")}
            style={[styles.sproutsCard, helloClaimed && styles.giftWon]}
          >
            <View style={styles.sproutsTop}>
              <Text style={styles.giftEmoji}>🎁</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.giftTitleRow}>
                  <Text style={styles.giftTitle}>Daily Sprouts</Text>
                  {attendStreak >= 2 ? (
                    <View style={styles.streakMini}>
                      <Text style={styles.streakMiniTxt}>🔥{attendStreak}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.giftSub} numberOfLines={1}>
                  {helloClaimed
                    ? `Next sprout in ${formatCountdown(unlockMs)} · ${sprouts.length} collected`
                    : `Today: ${todaySprout.label} · +${todaySproutPts} Buzz Points`}
                </Text>
              </View>
              <View style={[styles.statusPill, helloClaimed && styles.statusPillDone]}>
                <Text style={styles.statusPillTxt}>{helloClaimed ? "YAY!" : "READY"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.muted} />
            </View>
          </BouncePress>

          <BouncePress
            sound={false}
            onPress={() => setPackModal("class")}
            style={[styles.giftCard, classPackClaimed && styles.giftWon]}
          >
            <Text style={styles.giftEmoji}>📺</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.giftTitleRow}>
                <Text style={styles.giftTitle}>Class Bonus</Text>
                {classAttendStreak >= 2 ? (
                  <View style={[styles.streakMini, styles.streakMiniBlue]}>
                    <Text style={styles.streakMiniTxt}>⚡{classAttendStreak}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.giftSub} numberOfLines={1}>
                {classPackClaimed
                  ? `Next pack in ${formatCountdown(unlockMs)} · ${planets.length} collected`
                  : `Today: ${todayPlanet.label} · +${todayPlanetPts} Buzz Points`}
              </Text>
            </View>
            <View style={[styles.statusPill, classPackClaimed && styles.statusPillDone]}>
              <Text style={styles.statusPillTxt}>{classPackClaimed ? "YAY!" : "READY"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </BouncePress>
        </View>

        <View style={styles.gamesHead}>
          <Ionicons name="sparkles-outline" size={18} color={colors.navy} />
          <Text style={styles.label}>Activities</Text>
        </View>
        <View style={styles.path}>
          {QUESTS.map((q, i) => {
            const unlocked = questUnlocked(q.id, snapshot);
            const done = questDoneToday(q.id, snapshot);
            const pct = activityPercent(q.id, snapshot, track);
            const href = done ? q.href : resumeHref(q.id, track);
            const now = next.id === q.id && !dayWon;
            const last = i === QUESTS.length - 1;
            const mid = unlocked && !done && pct > 0;
            const room = hive?.rooms?.[q.id] || {
              done: 0,
              total: Math.max(1, hive?.board.length || 1),
              live: [],
              winners: [],
            };
            return (
              <View key={q.id} style={styles.step}>
                <View style={styles.rail}>
                  <View style={[styles.num, done && styles.numDone, now && styles.numNow, !unlocked && styles.numLock]}>
                    <Ionicons
                      name={done ? "checkmark" : !unlocked ? "lock-closed" : now ? "play" : "ellipse"}
                      size={done || now ? 12 : 8}
                      color={done ? colors.white : !unlocked ? colors.muted : colors.navy}
                    />
                  </View>
                  {!last ? <View style={[styles.line, (done || now) && styles.lineOn]} /> : null}
                </View>
                <BouncePress
                  sound={unlocked ? "tap" : false}
                  onPress={() => play(href, !unlocked, needFirst(q.id) || q.lockHint)}
                  style={[styles.stepCard, now && unlocked && styles.stepNow, done && styles.stepDone, !unlocked && styles.stepLock]}
                >
                  <View style={[styles.stepIcon, !unlocked && styles.stepIconLock]}>
                    <Image source={coverArt(q.id)} style={styles.stepThumb} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.stepName, !unlocked && styles.dim]} numberOfLines={1}>
                      {q.kid}
                    </Text>
                    <View style={styles.meta}>
                      <BuzzEarn amount={ACTIVITY_BUZZ[q.id]} earned={done} locked={!unlocked} unlockMs={done ? unlockMs : undefined} />
                    </View>
                    {unlocked ? (
                      done ? (
                        <Text style={[styles.stepHint, styles.friendsWon]} numberOfLines={1}>
                          Play again in {formatCountdown(unlockMs)}
                        </Text>
                      ) : mid ? (
                        <Text style={[styles.stepHint, done && styles.friendsWon]} numberOfLines={1}>
                          Keep going · {pct}%
                        </Text>
                      ) : (
                        <View style={styles.stepHintWrap}>
                          {friendsAvatars(done, unlocked, room)}
                          <Text style={[styles.stepHint, done && styles.friendsWon]} numberOfLines={1}>
                            {friendsLine(done, unlocked, room)}
                          </Text>
                        </View>
                      )
                    ) : (
                      <Text style={[styles.stepHint, !unlocked && styles.dim]} numberOfLines={1}>
                        {needFirst(q.id) || q.lockHint}
                      </Text>
                    )}
                    <CardProgress pct={pct} locked={!unlocked} done={done} />
                  </View>
                  {now && unlocked ? (
                    <Animated.View style={[styles.miniTap, pulseStyle]}>
                      <Text style={styles.miniTapTxt}>{mid ? "Resume" : "Play"}</Text>
                      <Ionicons name="play" size={12} color={colors.navy} />
                    </Animated.View>
                  ) : !done ? (
                    <View style={[styles.ghostPlay, unlocked && styles.ghostPlayOn]}>
                      <Ionicons name="play" size={14} color={unlocked ? colors.navy : colors.muted} />
                    </View>
                  ) : null}
                </BouncePress>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F6F1E8",
  },
  brand: { flexDirection: "row", alignItems: "baseline", flexShrink: 0 },
  brandBrit: { fontFamily: fonts.extra, fontSize: 24, color: colors.navy },
  brandBee: { fontFamily: fonts.extra, fontSize: 24, color: colors.yellow },
  topRight: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  bell: { width: 36, height: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.nameRed,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeTxt: { fontFamily: fonts.extra, color: colors.white, fontSize: 9 },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 8,
    maxWidth: 148,
    minWidth: 0,
    flexShrink: 1,
  },
  profileCopy: { flexShrink: 1, minWidth: 0 },
  profileName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 13 },
  profileGrade: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, marginTop: -1 },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 36 },
  hero: {
    borderRadius: 28,
    padding: 14,
    paddingBottom: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  heroMain: { flex: 1, minWidth: 0, gap: 10 },
  star: { position: "absolute", backgroundColor: "rgba(255,220,80,0.7)" },
  bushL: {
    position: "absolute",
    left: -10,
    bottom: -16,
    width: 72,
    height: 40,
    borderRadius: 32,
    backgroundColor: "#7CB342",
    opacity: 0.85,
  },
  bushR: {
    position: "absolute",
    right: -8,
    bottom: -18,
    width: 88,
    height: 46,
    borderRadius: 32,
    backgroundColor: "#8BC34A",
    opacity: 0.9,
  },
  hello: { flexDirection: "row", alignItems: "center", gap: 8 },
  helloCopy: { flex: 1, minWidth: 0 },
  hi: { fontFamily: fonts.extra, color: colors.white, fontSize: 20 },
  sub: { fontFamily: fonts.bold, color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 2 },
  todayBox: { alignItems: "center", marginTop: 12, gap: 4 },
  todayTitle: { fontFamily: fonts.bold, color: "rgba(255,255,255,0.95)", fontSize: 13 },
  todaySub: { fontFamily: fonts.medium, color: "rgba(255,255,255,0.78)", fontSize: 11, textAlign: "center", lineHeight: 16 },
  bee: { width: 86, height: 98, marginTop: -6, flexShrink: 0 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF1EE",
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FFB3AB",
    overflow: "hidden",
  },
  bannerMaya: { backgroundColor: colors.practiceBg, borderColor: "#B7D0FF" },
  bannerTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 17 },
  bannerSub: { fontFamily: fonts.bold, color: colors.ink, fontSize: 13, marginTop: 2 },
  bannerGo: {
    fontFamily: fonts.extra,
    color: colors.navy,
    fontSize: 14,
    backgroundColor: colors.yellow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    flexShrink: 0,
  },
  pauseBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF1EE",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#FFB3AB",
  },
  pauseTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 14 },
  giftRow: { gap: 10, marginBottom: 16 },
  sproutsCard: {
    minWidth: 0,
    backgroundColor: "#EAF8EE",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: "#BFE4C9",
  },
  sproutsTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  giftCard: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#EEE8DC",
  },
  giftWon: { backgroundColor: "#E8F5E9", borderColor: "#A5D6A7" },
  giftEmoji: { fontSize: 22 },
  giftTitleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  giftTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 13 },
  giftSub: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, marginTop: 1 },
  rewardChipRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  rewardChip: {
    backgroundColor: "#F3F5FB",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4E8F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rewardChipGreen: { backgroundColor: "#EAF8EE", borderColor: "#CFE9D5" },
  rewardChipBlue: { backgroundColor: "#EAF2FF", borderColor: "#DCE8FF" },
  rewardChipTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 10 },
  statusPill: {
    backgroundColor: "#F0F3FA",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DFE5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusPillDone: { backgroundColor: "#EAF8EE", borderColor: "#CFE9D5" },
  statusPillTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 10 },
  planetMiniRow: { paddingTop: 6, paddingRight: 8 },
  planetMiniBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EAF2FF",
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  planetMiniImg: { width: 18, height: 18, borderRadius: 9 },
  streakMini: {
    backgroundColor: "#FFF3C4",
    borderRadius: 99,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  streakMiniBlue: { backgroundColor: "#EAF2FF" },
  streakMiniTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 10 },
  sproutRow: { paddingTop: 8, paddingRight: 8 },
  sproutBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF5EE",
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sproutImg: { width: 34, height: 34, borderRadius: 17 },
  emptyPreviewRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 8 },
  emptyPreviewBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EAF5EE",
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPreviewImg: { width: 16, height: 16, borderRadius: 8 },
  sproutEmpty: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11 },
  gamesHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 2 },
  label: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16 },
  path: { marginBottom: 8 },
  step: { flexDirection: "row", alignItems: "stretch", gap: 8, minHeight: 92 },
  rail: { width: 24, alignItems: "center" },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: "#E4D9C6",
    alignItems: "center",
    justifyContent: "center",
  },
  numDone: { backgroundColor: colors.speak, borderColor: colors.speak },
  numNow: { backgroundColor: colors.yellow, borderColor: colors.navy },
  numLock: { backgroundColor: "#EEE8DC" },
  numTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12 },
  numTxtDone: { color: colors.white },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: "#E4D9C6",
    marginVertical: 4,
    borderRadius: 1,
  },
  lineOn: { backgroundColor: colors.yellow },
  stepCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "rgba(26,43,95,0.06)",
    overflow: "hidden",
  },
  stepNow: { borderColor: colors.yellow, borderWidth: 2, backgroundColor: colors.white },
  stepDone: { backgroundColor: "#F3FBF4" },
  stepLock: { opacity: 0.72 },
  stepIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F6F1E8",
    flexShrink: 0,
  },
  stepIconLock: { opacity: 0.55 },
  stepThumb: { width: "100%", height: "100%" },
  stepName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 4, minWidth: 0 },
  buzzChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFE566",
    borderRadius: 10,
    paddingLeft: 3,
    paddingRight: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#F5C400",
    flexShrink: 0,
    maxWidth: "100%",
  },
  buzzWon: { backgroundColor: colors.successBg, borderColor: "#66BB6A" },
  buzzLock: { backgroundColor: "#EEE8DC", borderColor: "#E4D9C6" },
  buzzStar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  buzzStarWon: { backgroundColor: colors.speak },
  buzzStarLock: { backgroundColor: "#E4D9C6" },
  buzzAmt: { fontFamily: fonts.extra, color: "#C47A00", fontSize: 11 },
  buzzAmtWon: { color: colors.successText },
  buzzTimer: { fontFamily: fonts.bold, fontSize: 9, color: colors.muted, marginTop: 3 },
  stepHint: { fontFamily: fonts.bold, color: colors.ink, fontSize: 12, marginTop: 3 },
  friendsWon: { color: colors.speak },
  stepHintWrap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  friendAvatars: { flexDirection: "row", alignItems: "center" },
  miniTap: {
    backgroundColor: colors.yellow,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  miniTapTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 13 },
  doneDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.speak,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ghostPlay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEE8DC",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ghostPlayOn: { backgroundColor: "#FFF3C4" },
  dim: { color: colors.muted },
});
