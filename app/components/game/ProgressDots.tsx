import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { colors } from "@/constants/theme";

/** `current` is the 0-based step the child is on. Earlier steps are filled. */
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        const here = i === current;
        return <View key={i} style={[styles.dot, filled && styles.filled, here && styles.here]} />;
      })}
    </View>
  );
}

function Star({ on }: { on: boolean }) {
  const scale = useSharedValue(on ? 1 : 0.92);
  useEffect(() => {
    if (!on) {
      scale.value = 0.92;
      return;
    }
    scale.value = withSequence(withSpring(1.28, { damping: 8, stiffness: 380 }), withSpring(1, { damping: 12, stiffness: 260 }));
  }, [on, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.star, on && styles.starOn, style]}>
      <View style={[styles.starCore, on && styles.starCoreOn]} />
    </Animated.View>
  );
}

export function StarRow({ filled, total = 3 }: { filled: number; total?: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Star key={i} on={i < filled} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  filled: { backgroundColor: colors.speak },
  here: {
    backgroundColor: colors.yellow,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  star: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  starOn: { borderColor: colors.yellow, backgroundColor: colors.streakBg },
  starCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  starCoreOn: { backgroundColor: colors.yellow },
});
