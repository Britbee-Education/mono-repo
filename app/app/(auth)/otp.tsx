import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PillButton } from "@/components/ui/PillButton";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { AuthScroll } from "@/components/ui/AuthScroll";
import { BackButton } from "@/components/ui/BackButton";
import { useOnboarding } from "@/context/OnboardingContext";
import { useAuth } from "@/context/AuthContext";
import { isApiError } from "@/lib/api";
import { colors, fonts, radii } from "@/constants/theme";

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ purpose?: string }>();
  const purpose = params.purpose === "reset" ? "reset" : "signup";
  const { draft, update } = useOnboarding();
  const { sendOtp, verifyOtp } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function onVerify() {
    try {
      setLoading(true);
      const res = await verifyOtp(draft.phone, otp.trim(), {
        name: draft.name,
        purpose,
        referralCode: draft.referralCode.trim() || undefined,
      });
      if (purpose === "reset") {
        if (!res.resetToken) throw new Error("Could not start password reset");
        update({ resetToken: res.resetToken });
        router.replace("/(auth)/reset");
        return;
      }
      router.replace("/(auth)/password");
    } catch (e: any) {
      if (isApiError(e) && e.code === "ACCOUNT_EXISTS") {
        router.replace(`/(auth)/login?phone=${draft.phone}&reason=exists`);
        return;
      }
      Alert.alert("Invalid OTP", e.message || "Try again");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    try {
      setLoading(true);
      const res = await sendOtp(draft.phone, purpose);
      if (res.devOtp) Alert.alert("Dev OTP", `Use code ${res.devOtp}`);
    } catch (e: any) {
      if (isApiError(e) && e.code === "ACCOUNT_EXISTS") {
        router.replace(`/(auth)/login?phone=${draft.phone}&reason=exists`);
        return;
      }
      Alert.alert("Could not resend", e.message || "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenDecor dense />
      <AuthScroll>
        <BackButton fallback={purpose === "reset" ? "/(auth)/forgot" : "/(auth)/signup"} />
        <BrandLogo />
        <Text style={styles.title}>{purpose === "reset" ? "Reset your password" : "Verify your number"}</Text>
        <Text style={styles.sub}>Enter the 6-digit code sent to +91 {draft.phone}</Text>

        <Card>
          <Text style={styles.fieldLabel}>OTP</Text>
          <View style={styles.phoneField}>
            <Ionicons name="keypad-outline" size={18} color={colors.navy} />
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
            />
          </View>
          <View style={{ height: 14 }} />
          <PillButton label="Verify OTP" loading={loading} onPress={onVerify} />
          <Pressable onPress={onResend} style={{ marginTop: 12 }}>
            <Text style={styles.link}>Resend OTP</Text>
          </Pressable>
        </Card>
      </AuthScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: 22, paddingTop: 52, paddingBottom: 40 },
  title: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy, textAlign: "center", marginTop: 8 },
  sub: { textAlign: "center", color: colors.muted, fontFamily: fonts.regular, marginBottom: 16, fontSize: 13 },
  fieldLabel: { fontFamily: fonts.extra, color: colors.navy, marginBottom: 8, fontSize: 14 },
  phoneField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    height: 52,
  },
  input: { flex: 1, fontFamily: fonts.regular, color: colors.navy, fontSize: 15 },
  link: { color: colors.linkBlue, fontFamily: fonts.bold, textAlign: "center" },
});
