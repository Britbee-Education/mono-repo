import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts } from "@/constants/theme";
import { countdownParts } from "@/lib/day";
import { useIstDayCountdown } from "@/lib/useIstDayCountdown";

/** Game-style digit blocks for the daily reward drawer — ticks every second. */
export function LiveCountdownBlocks({
  label = "Next unlock",
  style,
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const ms = useIstDayCountdown();
  const { hours, minutes, seconds } = countdownParts(ms);
  const ready = ms <= 0;

  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{ready ? "Ready now" : label}</Text>
      <View style={styles.row}>
        <Digit value={hours} unit="H" />
        <Text style={styles.colon}>:</Text>
        <Digit value={minutes} unit="M" />
        <Text style={styles.colon}>:</Text>
        <Digit value={seconds} unit="S" pulse />
      </View>
    </View>
  );
}

function Digit({ value, unit, pulse }: { value: number; unit: string; pulse?: boolean }) {
  return (
    <View style={[styles.digit, pulse && styles.digitPulse]}>
      <Text style={styles.digitNum}>{String(value).padStart(2, "0")}</Text>
      <Text style={styles.digitUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  label: {
    fontFamily: fonts.bold,
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  colon: {
    fontFamily: fonts.extra,
    color: colors.navy,
    fontSize: 22,
    marginBottom: 10,
  },
  digit: {
    minWidth: 52,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: "center",
  },
  digitPulse: { backgroundColor: "#243A78" },
  digitNum: {
    fontFamily: fonts.extra,
    color: colors.yellow,
    fontSize: 22,
    letterSpacing: 1,
  },
  digitUnit: {
    fontFamily: fonts.bold,
    color: "rgba(255,255,255,0.55)",
    fontSize: 9,
    marginTop: 1,
  },
});
