import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from "react-native";
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
import { isApiError } from "@/lib/api";
import { colors, fonts, radii } from "@/constants/theme";

export default function SignupStep1() {
  const router = useRouter();
  const { draft, update } = useOnboarding();
  const { sendOtp } = useAuth();
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);

  async function next() {
    if (!draft.name || !draft.phone) {
      Alert.alert("Missing info", "Please fill name and mobile number.");
      return;
    }
    if (!agreed) {
      Alert.alert("Please agree to Terms");
      return;
    }
    try {
      setLoading(true);
      const res = await sendOtp(draft.phone, "signup");
      if (res.devOtp) Alert.alert("Dev OTP", `Use code ${res.devOtp}`);
      router.push("/(auth)/otp?purpose=signup");
    } catch (e: any) {
      if (isApiError(e) && e.code === "ACCOUNT_EXISTS") {
        router.replace(`/(auth)/login?phone=${draft.phone}&reason=exists`);
        return;
      }
      Alert.alert("Could not send OTP", e.message || "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenDecor dense />
      <AuthScroll>
        <View style={styles.top}>
          <BackButton fallback="/(auth)/login" />
          <BrandLogo size="sm" />
          <View style={{ width: 24 }} />
        </View>
        <SignupStepper step={1} />
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.sub}>We'll verify your mobile number with an OTP.</Text>

        <Card>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.field}>
            <Ionicons name="person-outline" size={18} color={colors.navy} />
            <TextInput
              style={styles.input}
              placeholder="Parent / Guardian name"
              placeholderTextColor="#9CA3AF"
              value={draft.name}
              onChangeText={(name) => update({ name })}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Mobile Number</Text>
          <View style={styles.phoneField}>
            <View style={styles.cc}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.ccText}>+91</Text>
            </View>
            <View style={styles.vline} />
            <TextInput
              style={styles.input}
              placeholder="Enter mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={draft.phone}
              onChangeText={(phone) => update({ phone })}
              maxLength={10}
            />
          </View>

          <Pressable style={styles.terms} onPress={() => setAgreed((a) => !a)}>
            <View style={[styles.check, agreed && styles.checkOn]}>
              {agreed ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Terms of Use</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </Pressable>

          <PillButton label="Send OTP" loading={loading} onPress={next} />
          <Pressable onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 14 }}>
            <Text style={styles.loginLink}>Already have an account? Log in</Text>
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
  sub: { textAlign: "center", color: colors.muted, fontFamily: fonts.regular, marginBottom: 14, fontSize: 13 },
  fieldLabel: { fontFamily: fonts.extra, color: colors.navy, marginBottom: 8, fontSize: 14 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    height: 52,
  },
  phoneField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    height: 52,
  },
  cc: { flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 8 },
  flag: { fontSize: 16 },
  ccText: { fontFamily: fonts.bold, color: colors.navy },
  vline: { width: 1, height: 22, backgroundColor: colors.border, marginRight: 10 },
  input: { flex: 1, fontFamily: fonts.regular, color: colors.navy, fontSize: 15 },
  terms: { flexDirection: "row", alignItems: "center", marginVertical: 14, gap: 10 },
  check: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  termsText: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  termsLink: { color: colors.linkBlue, fontFamily: fonts.bold },
  loginLink: { textAlign: "center", color: colors.linkBlue, fontFamily: fonts.bold, fontSize: 13 },
});
