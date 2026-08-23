import { View, StyleSheet } from "react-native";
import { colors, radii } from "@/constants/theme";

export function ScreenDecor({ dense = false, quiet = false }: { dense?: boolean; quiet?: boolean }) {
  if (quiet) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.quiet} />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.tl, dense && { width: 140, height: 96 }]} />
      {!dense ? <View style={styles.br} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  quiet: {
    position: "absolute",
    top: -90,
    left: -80,
    width: 180,
    height: 140,
    backgroundColor: colors.yellow,
    opacity: 0.35,
    transform: [{ rotate: "-28deg" }],
    borderRadius: radii.card,
  },
  tl: {
    position: "absolute",
    top: -70,
    left: -90,
    width: 200,
    height: 160,
    backgroundColor: colors.yellow,
    transform: [{ rotate: "-28deg" }],
    borderRadius: radii.card,
  },
  br: {
    position: "absolute",
    bottom: -80,
    right: -70,
    width: 160,
    height: 130,
    backgroundColor: colors.yellow,
    opacity: 0.45,
    transform: [{ rotate: "24deg" }],
    borderRadius: radii.card,
  },
});
