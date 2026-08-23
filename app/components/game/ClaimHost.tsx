import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useProgress, type RewardClaim } from "@/context/ProgressContext";
import { DAILY_QUESTS, HELLO_PACK_KEY, QUESTS } from "@/lib/quests";
import { playSfx } from "@/lib/sfx";
import { colors, fonts } from "@/constants/theme";
import { planetsDicebearPngUrl, sproutsDicebearPngUrl } from "@/lib/dicebear";
import { NextUnlockLabel } from "@/components/game/NextUnlockLabel";

const SPARKS = [
  { x: -120, y: -78, size: 11, color: "#F5C400", delay: 0, rot: 12 },
  { x: 126, y: -58, size: 8, color: "#FFE566", delay: 40, rot: -18 },
  { x: -76, y: 96, size: 13, color: "#FF8A65", delay: 80, rot: 28 },
  { x: 92, y: 104, size: 9, color: "#FFFFFF", delay: 30, rot: -8 },
  { x: 8, y: -128, size: 7, color: "#F5C400", delay: 60, rot: 40 },
  { x: -138, y: 8, size: 10, color: "#FFCC00", delay: 20, rot: -30 },
  { x: 144, y: 16, size: 8, color: "#FFFFFF", delay: 90, rot: 16 },
  { x: 32, y: 124, size: 12, color: "#F5C400", delay: 50, rot: -22 },
  { x: -48, y: -108, size: 6, color: "#FF8A65", delay: 110, rot: 6 },
  { x: 54, y: -114, size: 9, color: "#FFE566", delay: 70, rot: -40 },
  { x: -108, y: 64, size: 8, color: "#FFFFFF", delay: 100, rot: 20 },
  { x: 116, y: 74, size: 12, color: "#F5C400", delay: 15, rot: -12 },
];

function Spark({
  x,
  y,
  size,
  color,
  delay,
  rot,
  boom,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  rot: number;
  boom: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withDelay(delay, withTiming(1, { duration: 780, easing: Easing.out(Easing.cubic) }));
  }, [boom, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [
      { translateX: x * t.value },
      { translateY: y * t.value },
      { scale: 1.25 - t.value * 0.55 },
      { rotate: `${rot * t.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.spark,
        { width: size, height: size * 1.35, borderRadius: 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

function LockBreak({ claim }: { claim: RewardClaim }) {
  const lock = useSharedValue(1);
  const open = useSharedValue(0);
  useEffect(() => {
    if (!claim.unlockedKid) return;
    lock.value = 1;
    open.value = 0;
    lock.value = withSequence(
      withTiming(1.14, { duration: 160 }),
      withTiming(1.14, { duration: 90 }),
      withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) })
    );
    open.value = withDelay(380, withSpring(1, { damping: 11, stiffness: 190 }));
  }, [claim.id, claim.unlockedKid, lock, open]);
  const lockStyle = useAnimatedStyle(() => ({
    opacity: lock.value,
    transform: [{ scale: lock.value }, { rotate: `${(1 - lock.value) * 28}deg` }],
  }));
  const openStyle = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [{ scale: interpolate(open.value, [0, 1], [0.45, 1]) }],
  }));
  if (!claim.unlockedKid) return null;
  return (
    <View style={styles.unlockWrap}>
      <Animated.Text style={[styles.lock, lockStyle]}>🔒</Animated.Text>
      <Animated.View style={[styles.unlockCard, openStyle]}>
        <View style={styles.unlockBadge}>
          <Text style={styles.unlockEmoji}>{claim.unlockedEmoji}</Text>
        </View>
        <Text style={styles.unlockTitle}>{claim.unlockedKid} unlocked</Text>
      </Animated.View>
    </View>
  );
}

export function ClaimHost() {
  const { pendingClaim, claimReward } = useProgress();
  const [held, setHeld] = useState<RewardClaim | null>(null);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const pulse = useSharedValue(1);
  const pop = useSharedValue(0);
  const shine = useSharedValue(-1);
  const boomKey = useRef(0);
  const [burstId, setBurstId] = useState(0);

  useEffect(() => {
    if (!pendingClaim) return;
    setHeld(pendingClaim);
    setPhase("in");
    boomKey.current += 1;
    setBurstId(boomKey.current);
    pop.value = 0;
    pop.value = withSpring(1, { damping: 12, stiffness: 220 });
    pulse.value = withRepeat(withSequence(withTiming(1.05, { duration: 460 }), withTiming(1, { duration: 460 })), -1, true);
    shine.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, false);
    playSfx("unlock");
  }, [pendingClaim, pop, pulse, shine]);

  const claim = pendingClaim || (phase === "out" ? held : null);

  useEffect(() => {
    if (!claim) pulse.value = 1;
  }, [claim, pulse]);

  const card = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.78 + pop.value * 0.22 }, { translateY: (1 - pop.value) * 18 }],
  }));
  const btn = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shine.value, [-1, 1], [-90, 240]) }, { rotate: "18deg" }],
  }));

  if (!claim) return null;

  const claimed = phase === "out";

  function onClaim() {
    if (phase === "out" || !claim) return;
    const reward = claim;
    playSfx(reward.streakGain ? "fanfare" : "coin");
    pulse.value = withSpring(1, { damping: 12, stiffness: 240 });
    setPhase("out");
    claimReward();
    setTimeout(() => setHeld(null), 1100);
  }

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <LinearGradient colors={["rgba(11,31,77,0.88)", "rgba(26,43,95,0.82)"]} style={StyleSheet.absoluteFillObject} />
      {SPARKS.map((s, i) => (
        <Spark key={`${burstId}-${i}`} {...s} boom={burstId} />
      ))}
      <Animated.View style={[styles.card, card]}>
        <LinearGradient colors={["#2E458C", "#1A2B5F", "#0B1F4D"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.honeyTop} />
        {claim.kind === "pack" ? (
          <>
            <View style={styles.kickerRow}>
              <Text style={styles.kickerEmoji}>{claim.emoji}</Text>
              <Text style={styles.kicker}>{claim.kid}</Text>
            </View>
            <View style={styles.hexRow}>
              <View style={[styles.hex, styles.hexSide]} />
              <View style={styles.hex} />
              <View style={[styles.hex, styles.hexSide]} />
            </View>
          </>
        ) : (
          <View style={styles.kickerRow}>
            <Text style={styles.kickerEmoji}>{claim.emoji}</Text>
            <Text style={styles.kicker}>{claim.kid} complete</Text>
          </View>
        )}
        {claim.points > 0 ? (
          <View style={styles.prize}>
            <Text style={styles.plus}>+{claim.points}</Text>
            <Text style={styles.buzz}>Buzz Points</Text>
          </View>
        ) : (
          <Text style={styles.plus}>Unlocked</Text>
        )}
        {claim.kind === "pack" ? (
          <Text style={styles.today}>
            {claim.packKey === HELLO_PACK_KEY ? "Daily Sprouts opened today" : "Class Bonus opened today"}
          </Text>
        ) : (
          <>
            <View style={styles.pips}>
              {QUESTS.map((q, i) => (
                <View key={q.id} style={[styles.pip, i < claim.doneCount && styles.pipOn]}>
                  <Text style={styles.pipTxt}>{i < claim.doneCount ? "✓" : q.emoji}</Text>
                </View>
              ))}
            </View>
            {claim.dayComplete ? (
              <NextUnlockLabel kind="activities" style={styles.today} />
            ) : (
              <Text style={styles.today}>{`${claim.doneCount} of ${DAILY_QUESTS} today`}</Text>
            )}
          </>
        )}
        {claim.streakGain ? (
          <View style={styles.streakBox}>
            <LinearGradient colors={["#FF8A65", "#E53935"]} style={styles.streakIcon}>
              <Text style={styles.flame}>🔥</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakNum}>{claim.nextStreak}-day streak</Text>
              <NextUnlockLabel kind="day" style={styles.streakSub} />
            </View>
          </View>
        ) : null}
        {claim.kind === "pack" && claim.sproutReward ? (
          <View style={styles.sproutCard}>
            <Image
              source={{ uri: sproutsDicebearPngUrl({ seed: claim.sproutReward.id, size: 88 }) }}
              style={styles.sproutImg}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sproutTitle}>{claim.sproutReward.label} unlocked!</Text>
              <Text style={styles.sproutSub}>
                {claim.sproutReward.rarity}
              </Text>
            </View>
          </View>
        ) : null}
        {claim.kind === "pack" && claim.planetReward ? (
          <View style={styles.sproutCard}>
            <Image
              source={{ uri: planetsDicebearPngUrl({ seed: claim.planetReward.id, size: 88 }) }}
              style={styles.sproutImg}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sproutTitle}>{claim.planetReward.label} unlocked!</Text>
              <Text style={styles.sproutSub}>
                {claim.planetReward.rarity}
              </Text>
            </View>
          </View>
        ) : null}
        <LockBreak claim={claim} />
        {claim.nextTitle ? <Text style={styles.rank}>New rank · {claim.nextTitle}</Text> : null}
        <Animated.View style={btn}>
          <Pressable onPress={onClaim} style={[styles.claim, claimed && styles.claimed]}>
            <LinearGradient
              colors={claimed ? ["#66BB6A", "#2E7D32"] : ["#FFE566", "#F5C400", "#E0A800"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {!claimed ? <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]} /> : null}
            <Text style={[styles.claimTxt, claimed && styles.claimedTxt]}>
              {claimed ? "Yours!" : claim.kind === "pack" ? "OPEN" : "GET"}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 120,
  },
  card: {
    width: "88%",
    maxWidth: 380,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    overflow: "hidden",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.yellow,
  },
  honeyTop: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 7,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: colors.yellow,
  },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  kickerEmoji: { fontSize: 22 },
  kicker: {
    fontFamily: fonts.extra,
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  prize: { alignItems: "center", marginTop: 8 },
  plus: {
    fontFamily: fonts.extra,
    color: colors.yellow,
    fontSize: 68,
    lineHeight: 74,
  },
  buzz: {
    fontFamily: fonts.extra,
    color: colors.white,
    fontSize: 18,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: -2,
  },
  pips: { flexDirection: "row", gap: 6, marginTop: 16 },
  hexRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  hex: {
    width: 36,
    height: 40,
    backgroundColor: colors.yellow,
    transform: [{ rotate: "90deg" }],
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFE566",
  },
  hexSide: { width: 26, height: 30, opacity: 0.7 },
  pip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  pipOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  pipTxt: { fontSize: 13, fontFamily: fonts.extra, color: colors.navy },
  today: {
    marginTop: 8,
    fontFamily: fonts.bold,
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
  },
  streakBox: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 10,
    borderWidth: 2,
    borderColor: "rgba(245,196,0,0.55)",
    alignSelf: "stretch",
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  flame: { fontSize: 24 },
  streakNum: { fontFamily: fonts.extra, color: colors.yellow, fontSize: 20 },
  streakSub: { fontFamily: fonts.bold, color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  sproutCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 10,
    alignSelf: "stretch",
    borderWidth: 1.5,
    borderColor: "rgba(126,211,33,0.40)",
  },
  sproutImg: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.82)" },
  sproutTitle: { fontFamily: fonts.extra, color: colors.white, fontSize: 16 },
  sproutSub: { fontFamily: fonts.bold, color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 3 },
  unlockWrap: { marginTop: 16, alignItems: "center", minHeight: 92, justifyContent: "center" },
  lock: { position: "absolute", fontSize: 44 },
  unlockCard: { alignItems: "center" },
  unlockBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
  },
  unlockEmoji: { fontSize: 30 },
  unlockTitle: { marginTop: 8, fontFamily: fonts.extra, color: colors.white, fontSize: 20 },
  rank: { marginTop: 10, fontFamily: fonts.bold, color: colors.yellow, fontSize: 15 },
  claim: {
    marginTop: 18,
    height: 64,
    minWidth: 228,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderBottomWidth: 6,
    borderBottomColor: "#C9A000",
  },
  claimed: { borderBottomColor: "#1B5E20" },
  shine: {
    position: "absolute",
    top: -12,
    bottom: -12,
    width: 36,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  claimTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 26, letterSpacing: 2 },
  claimedTxt: { color: colors.white, letterSpacing: 1 },
  spark: { position: "absolute" },
});
