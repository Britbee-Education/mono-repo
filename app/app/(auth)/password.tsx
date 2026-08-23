import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AuthInput } from "@/components/ui/AuthInput";
import { PillButton } from "@/components/ui/PillButton";
import { SignupStepper } from "@/components/ui/SignupStepper";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { AuthScroll } from "@/components/ui/AuthScroll";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts } from "@/constants/theme";

export default function SetPasswordScreen() {
  const router = useRouter();
  const { setPassword, user, signOut } = useAuth();
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSave() {
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
      await setPassword(password);
      router.replace("/(auth)/signup/child");
    } catch (e: any) {
      Alert.alert("Could not save password", e.message || "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenDecor dense />
      <AuthScroll>
        <View style={styles.top}>
          <BackButton
            fallback="/(auth)/login"
            onPress={async () => {
              if (user) await signOut();
              router.replace("/(auth)/login");
            }}
          />
          <BrandLogo size="sm" />
          <View style={{ width: 24 }} />
        </View>
        <SignupStepper step={1} />
        <Text style={styles.title}>Create a password</Text>
        <Text style={styles.sub}>You'll use this to log in next time — no OTP needed.</Text>

        <Card>
          <AuthInput
            label="Password"
            placeholder="At least 6 characters"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPw}
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
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy, textAlign: "center", marginTop: 8 },
  sub: { textAlign: "center", color: colors.muted, fontFamily: fonts.regular, marginBottom: 14, fontSize: 13 },
});
