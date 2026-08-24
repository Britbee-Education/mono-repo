import { Text, StyleSheet, View } from "react-native";
import { PillButton } from "@/components/ui/PillButton";
import { Card } from "@/components/ui/Card";
import { MascotMark } from "@/components/ui/MascotMark";
import { colors, fonts, radii } from "@/constants/theme";

export function StepNext({
  ready,
  last,
  onNext,
  wait = "Hear it, say it, then tap Next.",
}: {
  ready: boolean;
  last?: boolean;
  onNext: () => void;
  wait?: string;
}) {
  return (
    <View style={styles.wrap}>
      {ready ? (
        <PillButton
          label={last ? "✓  Finish" : "Next  →"}
          onPress={onNext}
          variant="navy"
          style={styles.nextBtn}
        />
      ) : (
        <View style={styles.waitWrap}>
          <Text style={styles.wait}>{wait}</Text>
        </View>
      )}
    </View>
  );
}

export function RoundDone({
  title = "You did it!",
  sub,
  primary = "Back to hive",
  onPrimary,
  secondary,
  onSecondary,
}: {
  title?: string;
  sub?: string;
  primary?: string;
  onPrimary: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  return (
    <Card style={styles.done}>
      <MascotMark size={72} />
      <Text style={styles.title}>{title}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      <View style={{ marginTop: 16, alignSelf: "stretch" }}>
        <PillButton label={primary} onPress={onPrimary} />
      </View>
      {secondary && onSecondary ? (
        <View style={{ marginTop: 10, alignSelf: "stretch" }}>
          <PillButton label={secondary} variant="outline" onPress={onSecondary} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  nextBtn: { height: 54 },
  waitWrap: {
    backgroundColor: "#F7F8FA",
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  wait: {
    fontFamily: fonts.medium,
    color: colors.muted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
  },
  done: { alignItems: "center", paddingVertical: 22 },
  bee: { fontSize: 36, marginBottom: 6 },
  title: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy, textAlign: "center" },
  sub: {
    fontFamily: fonts.medium,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    fontSize: 14,
  },
});
