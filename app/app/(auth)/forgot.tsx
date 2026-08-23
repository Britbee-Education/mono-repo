import { useState } from "react";
import { View, Text, StyleSheet, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PillButton } from "@/components/ui/PillButton";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { AuthScroll } from "@/components/ui/AuthScroll";
import { BackButton } from "@/components/ui/BackButton";
import { useOnboarding } from "@/context/OnboardingContext";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts, radii } from "@/constants/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { draft, update } = useOnboarding();
  const { sendOtp } = useAuth();
  const [loading, setLoading] = useState(false);

  async function onSend() {
    if (!draft.phone || draft.phone.length < 10) {
      Alert.alert("Missing info", "Enter the mobile number on your account.");
      return;
    }
    try {
      setLoading(true);
      const res = await sendOtp(draft.phone, "reset");
      if (res.devOtp) Alert.alert("Dev OTP", `Use code ${res.devOtp}`);
      router.push("/(auth)/otp?purpose=reset");
    } catch (e: any) {
      Alert.alert("Could not send OTP", e.message || "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenDecor dense />
      <AuthScroll>
        <BackButton fallback="/(auth)/login" />
        <BrandLogo />
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.sub}>We'll send a one-time code to verify it's you, then you can set a new password.</Text>

        <Card>
          <Text style={styles.fieldLabel}>Mobile Number</Text>
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
          <View style={{ height: 14 }} />
          <PillButton label="Send OTP" loading={loading} onPress={onSend} />
        </Card>
      </AuthScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: 22, paddingTop: 52, paddingBottom: 40 },
  back: { marginBottom: 8 },
  title: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy, textAlign: "center", marginTop: 8 },
  sub: { textAlign: "center", color: colors.muted, fontFamily: fonts.regular, marginBottom: 16, fontSize: 13, lineHeight: 20 },
  fieldLabel: { fontFamily: fonts.extra, color: colors.navy, marginBottom: 8, fontSize: 14 },
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
});
