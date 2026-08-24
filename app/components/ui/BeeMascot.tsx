import { View, Text, StyleSheet, Image } from "react-native";
import { colors, fonts } from "@/constants/theme";

const mascotSource = require("../../assets/bee.png");

/** Official BritBee mascot (provided art) — never emoji or hand-drawn substitutes. */
export function BeeMascot({
  size = 140,
  mood = "wave",
  bubble,
}: {
  size?: number;
  mood?: "wave" | "wink" | "cheer";
  bubble?: string;
}) {
  const height = Math.round(size * (155 / 232));
  return (
    <View style={{ alignItems: "center" }}>
      {bubble ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{bubble}</Text>
        </View>
      ) : null}
      <Image
        source={mascotSource}
        style={{ width: size, height }}
        resizeMode="contain"
        accessibilityLabel={mood === "cheer" ? "BritBee cheering" : "BritBee"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 13 },
});
