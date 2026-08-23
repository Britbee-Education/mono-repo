import { Image, StyleSheet, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import { colors, radii } from "@/constants/theme";

/**
 * SceneArt — image always fully visible, no clipping.
 * `aspectRatio` controls the container shape (default 4:3).
 * `cover` forces the image to fill edge-to-edge (use only for scene photos, not word cards).
 */
export function SceneArt({
  source,
  label,
  compact,
  cover,
  aspectRatio = 4 / 3,
  style,
}: {
  source?: ImageSourcePropType | null;
  label?: string;
  compact?: boolean;
  cover?: boolean;
  aspectRatio?: number;
  style?: ViewStyle;
}) {
  if (!source) return null;
  return (
    <View style={[styles.stage, compact && styles.compact, { aspectRatio }, style]}>
      <Image
        source={source}
        style={styles.img}
        resizeMode={cover ? "cover" : "contain"}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function WordStrip({
  sources,
  labels,
}: {
  sources: (ImageSourcePropType | null | undefined)[];
  labels?: string[];
}) {
  const shown = sources.filter(Boolean) as ImageSourcePropType[];
  if (!shown.length) return null;
  return (
    <View style={styles.strip}>
      {shown.map((src, i) => (
        <View key={i} style={styles.stripCell}>
          <Image source={src} style={styles.stripImg} resizeMode="contain" accessibilityLabel={labels?.[i]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    borderRadius: radii.card + 2,
    backgroundColor: "#F6F1E8",
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEE6D6",
  },
  compact: { aspectRatio: 5 / 3 },
  img: { width: "100%", height: "100%" },
  strip: { flexDirection: "row", gap: 10, marginBottom: 16 },
  stripCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.card,
    overflow: "hidden",
    backgroundColor: "#F6F1E8",
    borderWidth: 1,
    borderColor: "#EEE6D6",
  },
  stripImg: { width: "100%", height: "100%" },
});
