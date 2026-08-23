import { Text, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useEffect, useRef } from "react";
import { colors, fonts } from "@/constants/theme";
import { QUESTS } from "@/lib/quests";
import { NextUnlockLabel } from "@/components/game/NextUnlockLabel";

export function StatBadge({
  kind,
  value,
  label,
  size = "md",
  onDark = true,
}: {
  kind: "streak" | "buzz";
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
}) {
  const scale = useSharedValue(1);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      scale.value = withSpring(1.06, { damping: 9, stiffness: 280 });
      const t = setTimeout(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 240 });
      }, 160);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const streak = kind === "streak";
  const padY = size === "lg" ? 12 : 10;
  const padX = size === "lg" ? 14 : 12;
  const iconBox = size === "lg" ? 38 : 32;
  const title = label || (streak ? "Streak" : "Points");

  const grad = streak
    ? onDark
      ? ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.10)"]
      : ["#FFF0E7", "#FFD8C9"]
    : onDark
      ? ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.10)"]
      : ["#FFF8D8", "#FFE89B"];

  const bubble = streak
    ? onDark
      ? "rgba(255,176,141,0.95)"
      : "#FFE6DC"
    : onDark
      ? "rgba(255,230,128,0.98)"
      : "#FFF3C4";

  return (
    <Animated.View style={[styles.ticketWrap, pop]}>
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ticket, { paddingVertical: padY, paddingHorizontal: padX }, !onDark && styles.ticketLight]}
      >
        <View style={[styles.gloss, streak ? styles.glossWarm : styles.glossGold]} />
        <View
          style={[
            styles.iconBox,
            {
              width: iconBox,
              height: iconBox,
              borderRadius: iconBox / 2,
              backgroundColor: bubble,
            },
          ]}
        >
          <Text style={{ fontSize: size === "lg" ? 18 : 16 }}>{streak ? "🔥" : "⭐"}</Text>
        </View>
        <View style={styles.copy}>
          <Text
            style={[styles.num, onDark && styles.numDark, !onDark && styles.numLight]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value}
          </Text>
          <Text style={[styles.caption, onDark && styles.captionDark, !onDark && styles.captionLight]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export function RewardRow({
  streak,
  points,
  size = "md",
  onDark = true,
}: {
  streak: number;
  points: number;
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
}) {
  return (
    <View style={styles.row}>
      <StatBadge kind="streak" value={streak} size={size} onDark={onDark} />
      <StatBadge kind="buzz" value={points} size={size} onDark={onDark} />
    </View>
  );
}

export function TodayPips({ done, total = 5, showCountdown }: { done: number; total?: number; showCountdown?: boolean }) {
  const items = QUESTS.slice(0, total);
  return (
    <View style={{ width: "100%" }}>
      <View style={styles.track}>
        {items.map((q, i) => {
          const on = i < done;
          return (
            <View key={q.id} style={styles.trackItem}>
              <View style={[styles.node, on && styles.nodeOn]}>
                <Text style={styles.nodeTxt}>{on ? "✓" : "•"}</Text>
              </View>
              <View style={[styles.dash, on && styles.dashOn]} />
            </View>
          );
        })}
        <View style={[styles.node, styles.gift, done >= total && styles.nodeOn]}>
          <Text style={styles.nodeTxt}>🎁</Text>
        </View>
      </View>
      {showCountdown && done >= total ? (
        <NextUnlockLabel kind="activities" style={styles.countdown} numberOfLines={1} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: 8, width: "100%" },
  ticketWrap: { flex: 1, minWidth: 108 },
  ticket: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    minHeight: 54,
    overflow: "hidden",
    position: "relative",
  },
  ticketLight: { borderWidth: 1, borderColor: "rgba(26,43,95,0.06)" },
  gloss: {
    position: "absolute",
    top: -10,
    left: 10,
    width: "55%",
    height: "65%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  glossWarm: { opacity: 0.26 },
  glossGold: { opacity: 0.22 },
  iconBox: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  copy: { flexShrink: 1, minWidth: 52 },
  num: { fontFamily: fonts.extra, fontSize: 20, lineHeight: 22, color: colors.navy },
  numDark: { color: colors.white },
  numLight: { color: colors.navy },
  caption: { fontFamily: fonts.bold, fontSize: 11, color: "rgba(26,43,95,0.72)", marginTop: 1 },
  captionDark: { color: "rgba(255,255,255,0.82)" },
  captionLight: { color: "rgba(26,43,95,0.72)" },
  track: { flexDirection: "row", alignItems: "center", width: "100%" },
  trackItem: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center" },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nodeOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  gift: { backgroundColor: "rgba(245,196,0,0.22)", borderColor: colors.yellow },
  nodeTxt: { fontSize: 12 },
  dash: {
    flex: 1,
    minWidth: 6,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginHorizontal: 4,
    borderRadius: 1,
  },
  dashOn: { backgroundColor: colors.yellow },
  countdown: {
    marginTop: 8,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  },
});
