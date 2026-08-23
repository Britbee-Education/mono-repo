import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AuthInput } from "@/components/ui/AuthInput";
import { PillButton } from "@/components/ui/PillButton";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { AuthScroll } from "@/components/ui/AuthScroll";
import { BackButton } from "@/components/ui/BackButton";
import { useOnboarding } from "@/context/OnboardingContext";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts } from "@/constants/theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { draft, update } = useOnboarding();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSave() {
    if (!draft.resetToken) {
      Alert.alert("Session expired", "Request a new OTP to reset your password.");
      router.replace("/(auth)/forgot");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", "Enter the same password twice.");
      return;
    }
    try {
      setLoading(true);
      await resetPassword(draft.phone, draft.resetToken, password);
      update({ resetToken: "", password: "" });
    } catch (e: any) {
      Alert.alert("Could not reset password", e.message || "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenDecor dense />
      <AuthScroll>
        <BackButton fallback="/(auth)/forgot" />
        <BrandLogo />
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.sub}>Use this password to log in next time. OTP won't be needed.</Text>

        <Card>
          <AuthInput
            label="New password"
            placeholder="At least 6 characters"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secure
          />
          <AuthInput
            label="Confirm password"
            placeholder="Re-enter password"
            icon="lock-closed-outline"
            value={confirm}
            onChangeText={setConfirm}
            secure
          />
          <PillButton label="Save password" loading={loading} onPress={onSave} />
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
});
