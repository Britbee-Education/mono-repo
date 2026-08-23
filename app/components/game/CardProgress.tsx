import { Text, StyleSheet, View } from "react-native";
import { colors, fonts } from "@/constants/theme";

export function CardProgress({
  pct,
  locked,
  done,
}: {
  pct: number;
  locked?: boolean;
  done?: boolean;
}) {
  const show = done ? 100 : Math.max(0, Math.min(100, pct));
  return (
    <View style={styles.row}>
      <View style={[styles.track, locked && styles.trackLock]}>
        <View
          style={[
            styles.fill,
            { width: `${show}%` },
            done && styles.fillDone,
            locked && styles.fillLock,
            !done && !locked && show > 0 && styles.fillOn,
          ]}
        />
      </View>
      <Text style={[styles.pct, done && styles.pctDone, locked && styles.pctLock]}>{show}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEE8DC",
    overflow: "hidden",
  },
  trackLock: { backgroundColor: "#E8E4DA" },
  fill: { height: 8, borderRadius: 4, backgroundColor: "#D5DAE4", minWidth: 0 },
  fillOn: { backgroundColor: colors.yellow },
  fillDone: { backgroundColor: colors.speak },
  fillLock: { backgroundColor: "#D5DAE4" },
  pct: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12, width: 36, textAlign: "right" },
  pctDone: { color: colors.speak },
  pctLock: { color: colors.muted },
});
