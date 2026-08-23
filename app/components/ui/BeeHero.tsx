import { View, Text, StyleSheet, Image } from "react-native";
import { colors, fonts } from "@/constants/theme";

/** Decorative bee hero using design mock as visual reference art */
export function BeeHero({
  variant = "wave",
  height = 160,
}: {
  variant?: "wave" | "wink" | "splash";
  height?: number;
}) {
  // Use welcome mock crop-ish: full mock as decorative hero for brand fidelity
  const source =
    variant === "splash"
      ? require("../../assets/brand/ChatGPT_Image_Aug_12__2026__01_18_26_PM-5fe3af85-2cf7-4db0-8c87-fc6915dbbab1.png")
      : variant === "wink"
        ? require("../../assets/brand/ChatGPT_Image_Aug_12__2026__01_16_56_PM-5d5ac778-38d9-4b66-a97e-f4d2f302e437.png")
        : require("../../assets/brand/ChatGPT_Image_Aug_12__2026__01_14_10_PM-1794ec9d-f953-4335-ac83-2422f31e18e5.png");

  return (
    <View style={[styles.wrap, { height }]}>
      <Image source={source} style={styles.img} resizeMode="contain" />
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.emoji}>🐝</Text>
      </View>
    </View>
  );
}

/** Lightweight inline bee without heavy image when space is tight */
export function BeeEmoji({ size = 64 }: { size?: number }) {
  return (
    <View style={[styles.emojiWrap, { width: size, height: size }]}>
      <Text style={{ fontSize: size * 0.7 }}>🐝</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "100%", height: "100%", opacity: 0.15 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 88 },
  emojiWrap: { alignItems: "center", justifyContent: "center" },
});
