import { Pressable, Text, StyleSheet, View, ActivityIndicator, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, fonts, radii } from "@/constants/theme";
import { playSfx } from "@/lib/sfx";
import { motion, pressDown, pressUp } from "@/lib/motion";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "yellow" | "navy" | "outline" | "white" | "purple";
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  loading?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PillButton({
  label,
  onPress,
  variant = "yellow",
  icon,
  trailing,
  loading,
  style,
  disabled,
}: Props) {
  const scale = useSharedValue(1);
  const nudge = useSharedValue(0);
  const bg =
    variant === "yellow"
      ? colors.yellow
      : variant === "navy"
        ? colors.navy
        : variant === "purple"
          ? colors.listen
          : colors.white;
  const color = variant === "navy" || variant === "purple" ? colors.white : colors.navy;
  const border =
    variant === "outline"
      ? { borderWidth: 1.5, borderColor: colors.navy }
      : variant === "white"
        ? { borderWidth: 1, borderColor: colors.border }
        : {};
  const clip = variant === "yellow";
  const off = disabled || loading;
  const press = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: off ? 0.55 : 1,
  }));
  const arrow = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        if (off) return;
        scale.value = pressDown(0.975);
        nudge.value = withTiming(3, motion.tap);
      }}
      onPressOut={() => {
        scale.value = pressUp();
        nudge.value = withTiming(0, motion.quick);
      }}
      onPress={() => {
        if (off) return;
        playSfx("tap");
        onPress?.();
      }}
      disabled={off}
      style={[styles.btn, { backgroundColor: bg }, border, style, press]}
    >
      {variant === "yellow" ? (
        <LinearGradient
          pointerEvents="none"
          colors={["#FFD84C", "#F5C400", "#F0BC00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      {clip ? <View style={styles.clip} /> : null}
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.inner}>
          {icon ? <View style={styles.icon}>{icon}</View> : <View style={styles.spacer} />}
          <Text style={[styles.label, { color }]}>{label}</Text>
          {trailing ? (
            <View style={styles.trail}>{trailing}</View>
          ) : variant === "yellow" ? (
            <Animated.View style={[styles.trail, arrow]}>
              <Ionicons name="arrow-forward" size={18} color={color} />
            </Animated.View>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radii.button,
    justifyContent: "center",
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  clip: {
    position: "absolute",
    top: -16,
    right: -16,
    width: 32,
    height: 32,
    backgroundColor: colors.white,
    transform: [{ rotate: "45deg" }],
  },
  inner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  icon: { width: 28, alignItems: "flex-start" },
  trail: { width: 28, alignItems: "flex-end" },
  spacer: { width: 28 },
  label: { flex: 1, textAlign: "center", fontFamily: fonts.semi, fontSize: 16, letterSpacing: 0.2 },
});
