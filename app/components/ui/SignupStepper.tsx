import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

const LABELS = ["Create Account", "About Your Child", "You're All Set!"];

export function SignupStepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {[1, 2, 3].map((n, i) => {
          const done = n < step;
          const active = n === step;
          return (
            <View key={n} style={styles.item}>
              {i > 0 ? <View style={[styles.line, n <= step && styles.lineOn]} /> : null}
              <View
                style={[
                  styles.circle,
                  done && styles.circleDone,
                  active && styles.circleActive,
                  !done && !active && styles.circleIdle,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : (
                  <Text style={[styles.num, (active || done) && styles.numOn]}>{n}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {LABELS.map((l, i) => (
          <Text
            key={l}
            style={[styles.label, i + 1 === step ? styles.labelOn : styles.labelOff, { flex: 1 }]}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 12, paddingHorizontal: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  line: {
    position: "absolute",
    left: "-50%",
    right: "50%",
    height: 2,
    backgroundColor: "#D1D5DB",
    top: 14,
  },
  lineOn: { backgroundColor: colors.navy },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  circleDone: { backgroundColor: colors.navy },
  circleActive: { backgroundColor: colors.yellow },
  circleIdle: { backgroundColor: "#E5E7EB" },
  num: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12 },
  numOn: { color: colors.navy },
  labels: { flexDirection: "row", marginTop: 8 },
  label: { fontSize: 10, textAlign: "center", fontFamily: fonts.semi },
  labelOn: { color: colors.navy },
  labelOff: { color: "#9CA3AF" },
});
