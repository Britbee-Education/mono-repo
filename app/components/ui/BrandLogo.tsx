import { Image, View, StyleSheet } from "react-native";

/**
 * Full BritBee lockup (mascot + wordmark + tagline) from logo.png.
 * Do NOT also render MascotMark / BeeMascot / bee.png on the same screen —
 * that creates a double-bee. Use MascotMark alone for empty/error states.
 */
const logoSource = require("../../assets/logo.png");

const widths = { sm: 132, md: 176, lg: 220 } as const;
/** logo.png is 580×503 */
const ASPECT = 503 / 580;

export function BrandLogo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
  /** @deprecated Tagline is baked into logo.png */
  showTagline?: boolean;
}) {
  const width = widths[size];
  const height = Math.round(width * ASPECT);

  return (
    <View style={styles.wrap}>
      <Image source={logoSource} style={{ width, height }} resizeMode="contain" accessibilityLabel="BritBee" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
});
