import { useEffect, useRef, useState } from "react";
import { Text, StyleSheet, View, Image } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useProgress } from "@/context/ProgressContext";
import { colors, fonts, radii } from "@/constants/theme";

export function BuzzChip() {
  const { points, streak, combo } = useProgress();
  const scale = useSharedValue(1);
  const prev = useRef(points);
  const [gain, setGain] = useState(0);

  useEffect(() => {
    if (points > prev.current) {
      setGain(points - prev.current);
      scale.value = withSequence(
        withSpring(1.15, { damping: 7, stiffness: 340 }),
        withSpring(1, { damping: 11, stiffness: 280 })
      );
      const t = setTimeout(() => setGain(0), 900);
      prev.current = points;
      return () => clearTimeout(t);
    }
    prev.current = points;
  }, [points, scale]);

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const plus = useSharedValue(0);
  useEffect(() => {
    plus.value = gain
      ? withTiming(1, { duration: 150, easing: Easing.out(Easing.back(1.4)) })
      : withTiming(0, { duration: 220 });
  }, [gain, plus]);
  const plusStyle = useAnimatedStyle(() => ({
    opacity: plus.value,
    transform: [{ translateY: (1 - plus.value) * 10 }, { scale: 0.7 + plus.value * 0.3 }],
  }));

  return (
    <Animated.View style={[styles.row, pop]}>
      {/* Combo multiplier */}
      {combo >= 2 ? (
        <View style={styles.combo}>
          <LinearGradient
            colors={["#7C3AED", "#5B21B6"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.comboTxt}>✕{combo}</Text>
        </View>
      ) : null}

      {/* Streak pill */}
      <View style={styles.pill}>
        <LinearGradient
          colors={streak >= 7 ? ["#FF5722", "#E53935"] : streak >= 3 ? ["#FF8F00", "#F57C00"] : ["#FF8A65", "#FF7043"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{streak >= 7 ? "🔥" : streak >= 3 ? "🔥" : "🔥"}</Text>
        </View>
        <Text style={styles.pillNum}>{streak}</Text>
      </View>

      {/* Points pill */}
      <View style={[styles.pill, styles.pillPoints]}>
        <LinearGradient
          colors={["#FFD700", "#F5C400", "#E8B000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.iconWrap}>
          <Image
            source={require("../../assets/bee.png")}
            style={styles.mascotIcon}
            resizeMode="contain"
            accessibilityLabel="Buzz points"
          />
        </View>
        <Text style={[styles.pillNum, styles.pillNumDark]}>{points}</Text>
        {gain ? (
          <Animated.View style={[styles.gainBadge, plusStyle]}>
            <Text style={styles.gainTxt}>+{gain}</Text>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const PILL_H = 34;
const ICON_SIZE = 26;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  combo: {
    height: PILL_H,
    paddingHorizontal: 9,
    borderRadius: PILL_H / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  comboTxt: {
    fontFamily: fonts.extra,
    color: colors.yellow,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    height: PILL_H,
    borderRadius: PILL_H / 2,
    paddingRight: 11,
    paddingLeft: 4,
    overflow: "visible",
    gap: 5,
    // subtle shadow for depth
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillPoints: {
    // extra right padding for potential +gain badge
    paddingRight: 13,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 14 },
  mascotIcon: { width: ICON_SIZE - 4, height: Math.round((ICON_SIZE - 4) * (155 / 232)) },
  pillNum: {
    fontFamily: fonts.extra,
    color: colors.white,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  pillNumDark: {
    color: colors.navy,
  },
  gainBadge: {
    position: "absolute",
    top: -12,
    right: 4,
    backgroundColor: colors.speak,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  gainTxt: {
    fontFamily: fonts.extra,
    color: colors.white,
    fontSize: 11,
  },
});
