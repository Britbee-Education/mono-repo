import { Image, View, StyleSheet } from "react-native";

const logoSource = require("../../assets/logo.png");

const widths = { sm: 132, md: 176, lg: 220 } as const;
const aspect = 187 / 281;

export function BrandLogo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
  // kept for backward compatibility; tagline is part of the logo image
  showTagline?: boolean;
}) {
  const width = widths[size];
  const height = Math.round(width * aspect);

  return (
    <View style={styles.wrap}>
      <Image source={logoSource} style={{ width, height }} resizeMode="contain" accessibilityLabel="BritBee" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
});
