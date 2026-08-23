import { useEffect } from "react";
import { Text, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useProgress } from "@/context/ProgressContext";
import { playSfx } from "@/lib/sfx";
import { colors, fonts, radii } from "@/constants/theme";

const SPARKS = [
  { x: -72, y: -48, size: 10, delay: 0 },
  { x: 78, y: -36, size: 8, delay: 40 },
  { x: -40, y: 56, size: 12, delay: 80 },
  { x: 52, y: 62, size: 9, delay: 30 },
  { x: 0, y: -78, size: 7, delay: 60 },
  { x: -90, y: 8, size: 11, delay: 20 },
  { x: 96, y: 12, size: 8, delay: 90 },
  { x: 18, y: 84, size: 10, delay: 50 },
];

function Spark({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ translateX: x * t.value }, { translateY: y * t.value }, { scale: 1.15 - t.value * 0.4 }],
  }));
  return <Animated.View style={[styles.spark, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

export function CelebrationHost() {
  const { cheer, dismissCheer, pendingClaim } = useProgress();
  const show = useSharedValue(0);

  useEffect(() => {
    if (!cheer) {
      show.value = 0;
      return;
    }
    show.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withDelay(900, withTiming(0, { duration: 180 }))
    );
    playSfx(cheer.sfx || (cheer.points >= 5 ? "fanfare" : "coin"));
    const t = setTimeout(dismissCheer, 1220);
    return () => clearTimeout(t);
  }, [cheer, dismissCheer, show]);

  const card = useAnimatedStyle(() => ({
    opacity: show.value,
    transform: [{ scale: 0.82 + show.value * 0.18 }],
  }));

  if (!cheer || pendingClaim) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {SPARKS.map((s, i) => (
        <Spark key={`${cheer.id}-${i}`} {...s} />
      ))}
      <Animated.View style={[styles.card, card]}>
        <Text style={styles.bee}>🐝</Text>
        <Text style={styles.message}>{cheer.message}</Text>
        {cheer.points > 0 ? <Text style={styles.points}>+{cheer.points} Buzz Points</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 80,
  },
  card: {
    minWidth: 180,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: radii.card,
    backgroundColor: colors.navy,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  bee: { fontSize: 36, marginBottom: 4 },
  message: { fontFamily: fonts.extra, color: colors.white, fontSize: 20, textAlign: "center" },
  points: { marginTop: 4, fontFamily: fonts.bold, color: colors.yellow, fontSize: 14 },
  spark: {
    position: "absolute",
    backgroundColor: colors.yellow,
  },
});
