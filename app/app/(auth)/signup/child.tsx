import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AuthInput } from "@/components/ui/AuthInput";
import { PillButton } from "@/components/ui/PillButton";
import { SignupStepper } from "@/components/ui/SignupStepper";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { AuthScroll } from "@/components/ui/AuthScroll";
import { BackButton } from "@/components/ui/BackButton";
import { useOnboarding } from "@/context/OnboardingContext";
import { colors, fonts, radii } from "@/constants/theme";

const LEVELS = [
  { id: "beginner" as const, label: "Beginner", emoji: "🌱", bg: colors.levelGreen },
  { id: "intermediate" as const, label: "Intermediate", emoji: "📊", bg: colors.white },
  { id: "advanced" as const, label: "Advanced", emoji: "🚀", bg: colors.white },
];

export default function SignupChild() {
  const router = useRouter();
  const { draft, update } = useOnboarding();

  return (
    <View style={styles.root}>
      <ScreenDecor dense />
      <AuthScroll>
        <View style={styles.top}>
          <BackButton fallback="/(auth)/password" />
          <BrandLogo size="sm" />
          <View style={{ width: 24 }} />
        </View>
        <SignupStepper step={2} />
        <Text style={styles.title}>Tell Us About Your Child</Text>
        <Text style={styles.sub}>This helps us personalize their learning experience.</Text>

        <Card>
          <AuthInput
            label="Child's Name"
            placeholder="Child's Name"
            icon="person-outline"
            value={draft.childName}
            onChangeText={(childName) => update({ childName })}
          />
          <AuthInput
            label="Date of Birth"
            placeholder="DD / MM / YYYY"
            icon="calendar-outline"
            value={draft.dateOfBirth}
            onChangeText={(dateOfBirth) => update({ dateOfBirth })}
            right={<Ionicons name="chevron-down" size={16} color={colors.muted} />}
          />

          <Text style={styles.label}>Child's Current Level</Text>
          <View style={styles.levels}>
            {LEVELS.map((l) => {
              const on = draft.level === l.id;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => update({ level: l.id })}
                  style={[styles.level, { backgroundColor: on ? colors.levelGreen : colors.white }, on && styles.levelOn]}
                >
                  <Text style={{ fontSize: 18 }}>{l.emoji}</Text>
                  <Text style={styles.levelText}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <AuthInput
            label="Main Learning Goal"
            placeholder="e.g., Speak confidently..."
            icon="locate-outline"
            value={draft.goal}
            onChangeText={(goal) => update({ goal })}
            right={<Ionicons name="chevron-down" size={16} color={colors.muted} />}
          />

          <PillButton label="Continue" onPress={() => router.push("/(auth)/signup/done")} />
          <Pressable onPress={() => router.push("/(auth)/signup/done")} style={{ marginTop: 12 }}>
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>
        </Card>
      </AuthScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: 22, paddingTop: 52, paddingBottom: 40 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy, textAlign: "center", marginTop: 8 },
  sub: { textAlign: "center", color: colors.muted, marginBottom: 14, fontFamily: fonts.regular, fontSize: 13 },
  label: { fontFamily: fonts.extra, color: colors.navy, marginBottom: 8, fontSize: 14 },
  levels: { flexDirection: "row", gap: 8, marginBottom: 4 },
  level: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  levelOn: { borderColor: colors.levelGreenBorder },
  levelText: { fontFamily: fonts.bold, color: colors.navy, fontSize: 11, textAlign: "center" },
  skip: { textAlign: "center", color: colors.linkBlue, fontFamily: fonts.bold },
});
