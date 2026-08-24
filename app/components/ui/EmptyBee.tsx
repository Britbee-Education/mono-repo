import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { MascotMark } from "@/components/ui/MascotMark";
import { colors, fonts } from "@/constants/theme";

/**
 * Single official mascot for empty / missing / quiet states.
 * Never pair with BrandLogo on the same surface — the logo lockup already includes the bee.
 */
export function EmptyBee({
  title,
  message,
  size = 96,
  style,
}: {
  title: string;
  message?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="summary">
      <MascotMark size={size} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 20 },
  title: {
    marginTop: 12,
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
    textAlign: "center",
  },
  message: {
    marginTop: 6,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
  },
});
