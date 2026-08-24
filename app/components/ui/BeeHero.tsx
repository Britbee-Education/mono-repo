import { View, StyleSheet, Image } from "react-native";
import { MascotMark } from "@/components/ui/MascotMark";

/** Full-width decorative hero — one official mascot only. */
export function BeeHero({
  height = 160,
}: {
  variant?: "wave" | "wink" | "splash";
  height?: number;
}) {
  return (
    <View style={[styles.wrap, { height }]}>
      <Image
        source={require("../../assets/bee.png")}
        style={styles.img}
        resizeMode="contain"
        accessibilityLabel="BritBee"
      />
    </View>
  );
}

/** Compact mascot (alias of MascotMark). */
export function BeeEmoji({ size = 64 }: { size?: number }) {
  return <MascotMark size={size} />;
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "100%", height: "100%" },
});
