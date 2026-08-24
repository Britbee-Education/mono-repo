import { Image, type ImageStyle, type StyleProp } from "react-native";

const mascotSource = require("../../assets/bee.png");

/**
 * Official BritBee mascot only (bee.png) — never emoji or hand-drawn bees.
 * Use for empty/error/celebration. Do not stack with BrandLogo (logo already has the bee).
 */
export function MascotMark({
  size = 32,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const height = Math.round(size * (155 / 232));
  return (
    <Image
      source={mascotSource}
      style={[{ width: size, height }, style]}
      resizeMode="contain"
      accessibilityLabel="BritBee"
    />
  );
}
