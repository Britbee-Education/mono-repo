import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PillButton } from "@/components/ui/PillButton";
import { SignupStepper } from "@/components/ui/SignupStepper";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { AuthScroll } from "@/components/ui/AuthScroll";
import { BackButton } from "@/components/ui/BackButton";
import { useOnboarding } from "@/context/OnboardingContext";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts } from "@/constants/theme";

function ageFromDob(dob: string) {
  const parts = dob.split(/[\/\-]/);
  if (parts.length < 3) return "8 Years";
  const [dd, mm, yyyy] = parts.map(Number);
  const birth = new Date(yyyy, (mm || 1) - 1, dd || 1);
  const age = Math.max(1, new Date().getFullYear() - birth.getFullYear());
  return `${age} Years`;
}

export default function SignupDone() {
  const router = useRouter();
  const { draft } = useOnboarding();
  const { updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const rows = [
    { icon: "person-outline" as const, color: colors.linkBlue, label: "Name", value: draft.childName || "Arjun Sharma" },
    { icon: "calendar-outline" as const, color: colors.speak, label: "Age", value: ageFromDob(draft.dateOfBirth) },
    {
      icon: "bar-chart-outline" as const,
      color: colors.yellow,
      label: "Current Level",
      value: draft.level.charAt(0).toUpperCase() + draft.level.slice(1),
    },
    { icon: "locate-outline" as const, color: colors.listen, label: "Learning Goal", value: draft.goal || "Speak confidently" },
  ];

  async function goHome() {
    try {
      setLoading(true);
      await updateProfile({
        name: draft.name || "Parent",
        child: {
          childName: draft.childName,
          dateOfBirth: draft.dateOfBirth,
          level: draft.level,
          goal: draft.goal,
        },
      });
      router.replace("/(main)");
    } catch (e: any) {
      Alert.alert("Signup", e.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenDecor dense />
      <AuthScroll>
        <View style={styles.top}>
          <BackButton fallback="/(auth)/signup/child" />
          <BrandLogo size="sm" />
          <View style={{ width: 24 }} />
        </View>
        <SignupStepper step={3} />
        <Text style={styles.title}>You're All Set! 🎉</Text>
        <Text style={styles.sub}>Let's start your child's English learning adventure.</Text>

        <Card>
          <Text style={styles.cardTitle}>Here's What We've Set Up For Your Child</Text>
          {rows.map((r) => (
            <View key={r.label} style={styles.row}>
              <Ionicons name={r.icon} size={18} color={r.color} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
              <Text style={styles.edit}>Edit</Text>
            </View>
          ))}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <View style={styles.nextRow}>
            <Text style={{ fontSize: 22 }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextTitle}>What's Next?</Text>
              <Text style={styles.nextSub}>
                We'll create a personalized learning path for {draft.childName.split(" ")[0] || "your child"}.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.navy} />
          </View>
        </Card>

        <View style={{ height: 14 }} />
        <PillButton label="Go to Home" loading={loading} onPress={goHome} />
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
  cardTitle: { fontFamily: fonts.extra, color: colors.navy, marginBottom: 10, fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  rowLabel: { fontFamily: fonts.regular, color: colors.muted, fontSize: 11 },
  rowValue: { fontFamily: fonts.bold, color: colors.navy },
  edit: { color: colors.linkBlue, fontFamily: fonts.bold, fontSize: 12 },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  nextTitle: { fontFamily: fonts.extra, color: colors.navy },
  nextSub: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 2 },
});
