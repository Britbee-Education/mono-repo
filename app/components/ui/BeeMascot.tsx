import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/constants/theme";

export function BeeMascot({
  size = 140,
  mood = "wave",
  bubble,
}: {
  size?: number;
  mood?: "wave" | "wink" | "cheer";
  bubble?: string;
}) {
  const face = mood === "wink" ? "😉" : "😊";
  return (
    <View style={{ alignItems: "center" }}>
      {bubble ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{bubble}</Text>
        </View>
      ) : null}
      <View style={[styles.body, { width: size, height: size }]}>
        <View style={styles.wings} />
        <View style={styles.bee}>
          <Text style={{ fontSize: size * 0.22 }}>{face}</Text>
          <Text style={styles.glasses}>👓</Text>
          <View style={styles.hoodie}>
            <Text style={styles.badge}>🇬🇧</Text>
          </View>
          {mood === "wave" ? <Text style={styles.hand}>👋</Text> : null}
        </View>
        <Text style={styles.sparkle}>✨</Text>
      </View>
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
  body: { alignItems: "center", justifyContent: "center" },
  wings: {
    position: "absolute",
    width: "70%",
    height: "40%",
    top: "10%",
    backgroundColor: "rgba(173,216,230,0.45)",
    borderRadius: 40,
  },
  bee: {
    width: "72%",
    height: "72%",
    borderRadius: 999,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F4A100",
  },
  glasses: { position: "absolute", top: "28%", fontSize: 18 },
  hoodie: {
    position: "absolute",
    bottom: 8,
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badge: { fontSize: 12 },
  hand: { position: "absolute", right: -8, top: 20, fontSize: 22 },
  sparkle: { position: "absolute", right: 8, top: 8, fontSize: 16 },
});
