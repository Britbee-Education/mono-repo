import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PillButton } from "@/components/ui/PillButton";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { AuthInput } from "@/components/ui/AuthInput";
import { RiseIn } from "@/components/ui/RiseIn";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { isApiError } from "@/lib/api";
import { colors, fonts, radii, shadow } from "@/constants/theme";
import { motion } from "@/lib/motion";
import { useLayout } from "@/lib/layout";

const features = [
  { icon: "shield-checkmark" as const, color: colors.shieldBlue, title: "Secure", sub: "Your data is always protected." },
  { icon: "flash" as const, color: colors.yellow, title: "Quick", sub: "Get started in just a few taps." },
  { icon: "happy" as const, color: colors.speak, title: "Kid-Friendly", sub: "Made for young learners & parents." },
];

function last10(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; reason?: string }>();
  const { draft, update } = useOnboarding();
  const { loginWithPassword } = useAuth();
  const { headerTop, padX, formMax, split } = useLayout();
  const existingAccount = params.reason === "exists";
  const [phone, setPhone] = useState(last10(String(params.phone || draft.phone || "")));
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const phoneFocus = useSharedValue(0);
  const shake = useSharedValue(0);
  const phoneField = useAnimatedStyle(() => ({
    borderColor: interpolateColor(phoneFocus.value, [0, 1], [colors.border, colors.navy]),
  }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (!error) return;
    shake.value = withSequence(
      withTiming(-7, { duration: 40 }),
      withTiming(7, { duration: 50 }),
      withTiming(-4, { duration: 40 }),
      withTiming(0, { duration: 50 })
    );
  }, [error, shake]);

  useEffect(() => {
    const next = last10(String(params.phone || ""));
    if (next) setPhone(next);
  }, [params.phone]);

  function goForgot() {
    update({ phone: phone.trim() });
    router.push("/(auth)/forgot");
  }

  function goSignup() {
    update({ phone: phone.trim() });
    router.push("/(auth)/signup");
  }

  async function onLogin() {
    if (phone.trim().length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      setErrorCode(undefined);
      return;
    }
    if (!password.trim()) {
      setError("Enter your password.");
      setErrorCode(undefined);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters. If you forgot it, reset it with OTP.");
      setErrorCode("INVALID_PASSWORD");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setErrorCode(undefined);
      await loginWithPassword(phone.trim(), password);
    } catch (e: unknown) {
      const code = isApiError(e) ? e.code : undefined;
      const message = e instanceof Error ? e.message : "Could not log in. Try again.";
      setErrorCode(code);
      if (code === "INVALID_PASSWORD") {
        setError("That password is incorrect.");
        Alert.alert("Wrong password", "The password you entered is incorrect. Try again, or reset it with a one-time OTP.", [
          { text: "Try again" },
          { text: "Reset password", onPress: goForgot },
        ]);
        return;
      }
      if (code === "NO_ACCOUNT") {
        setError("No account found for this number.");
        Alert.alert("No account found", "This mobile number is not registered yet. Create an account to get started.", [
          { text: "Try again" },
          { text: "Create account", onPress: goSignup },
        ]);
        return;
      }
      if (code === "NEEDS_PASSWORD") {
        setError("This account has no password yet. Reset it with OTP to create one.");
        Alert.alert("Password not set", "Finish setting up this account by resetting your password with OTP.", [
          { text: "Cancel" },
          { text: "Reset password", onPress: goForgot },
        ]);
        return;
      }
      setError(message);
      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenDecor />
      <ScrollView
        contentContainerStyle={[
          styles.screen,
          { paddingTop: headerTop, paddingHorizontal: padX },
          split && styles.screenWide,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.col, split ? styles.split : { maxWidth: formMax, alignSelf: "center", width: "100%" }]}>
          <View style={split ? styles.brandCol : undefined}>
            {existingAccount ? (
              <View style={styles.loginBack}>
                <BackButton fallback="/(auth)/signup" />
              </View>
            ) : null}
            <RiseIn>
              <BrandLogo />
            </RiseIn>

            <RiseIn delay={40} style={styles.welcomeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{existingAccount ? "Account already exists" : "Welcome to BritBee!"}</Text>
                <Text style={styles.sub}>
                  {existingAccount
                    ? "This mobile number is already registered. Log in with your password — no OTP is sent."
                    : "Log in with your mobile number and password"}
                </Text>
              </View>
              <View style={styles.shieldWrap}>
                <Ionicons name="shield" size={28} color={colors.shieldBlue} />
                <Ionicons name="lock-closed" size={11} color={colors.white} style={styles.lock} />
              </View>
            </RiseIn>
            {split ? (
              <RiseIn delay={140} style={[styles.features, { marginTop: 28 }]}>
                {features.map((f) => (
                  <View key={f.title} style={styles.feature}>
                    <View style={[styles.featureIcon, { backgroundColor: f.color + "22" }]}>
                      <Ionicons name={f.icon} size={18} color={f.color} />
                    </View>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureSub}>{f.sub}</Text>
                  </View>
                ))}
              </RiseIn>
            ) : null}
          </View>

          <View style={split ? styles.formCol : undefined}>

        {existingAccount ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={18} color={colors.navy} />
            <Text style={styles.noticeText}>
              Use the password you created for this number. If you forgot it, tap Forgot password to get a one-time OTP.
            </Text>
          </View>
        ) : null}

        <RiseIn delay={80}>
        <Animated.View style={shakeStyle}>
        <Card>
          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <Animated.View style={[styles.phoneField, phoneField]}>
            <Pressable style={styles.cc}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.ccText}>+91</Text>
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </Pressable>
            <View style={styles.vline} />
            <TextInput
              style={styles.input}
              placeholder="Enter mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={phone}
              onFocus={() => {
                phoneFocus.value = withTiming(1, motion.quick);
              }}
              onBlur={() => {
                phoneFocus.value = withTiming(0, motion.quick);
              }}
              onChangeText={(value) => {
                setPhone(value);
                if (error) {
                  setError("");
                  setErrorCode(undefined);
                }
              }}
              maxLength={10}
            />
          </Animated.View>

          <View style={{ height: 12 }} />
          <AuthInput
            label="Password"
            placeholder="Enter password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) {
                setError("");
                setErrorCode(undefined);
              }
            }}
            secure
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.nameRed} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {errorCode === "INVALID_PASSWORD" || errorCode === "NEEDS_PASSWORD" ? (
            <Pressable onPress={goForgot} style={styles.resetCta}>
              <Text style={styles.resetCtaText}>Forgot password? Reset with OTP</Text>
            </Pressable>
          ) : errorCode === "NO_ACCOUNT" ? (
            <Pressable onPress={goSignup} style={styles.resetCta}>
              <Text style={styles.resetCtaText}>Create an account with this number</Text>
            </Pressable>
          ) : (
            <Pressable onPress={goForgot} style={styles.forgotBtn}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </Pressable>
          )}

          <PillButton label="Log in" loading={loading} onPress={onLogin} />
        </Card>
        </Animated.View>
        </RiseIn>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <Pressable onPress={() => router.push("/(auth)/signup")} style={styles.createBtn}>
          <Text style={styles.createText}>New here? Create an account</Text>
        </Pressable>

        <View style={styles.helperRow}>
          <View style={styles.helperIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.shieldBlue} />
          </View>
          <Text style={styles.helperText}>
            OTP is only used once to create your account or recover a forgotten password.
          </Text>
        </View>

        {!split ? (
          <RiseIn delay={140} style={styles.features}>
            {features.map((f) => (
              <View key={f.title} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + "22" }]}>
                  <Ionicons name={f.icon} size={18} color={f.color} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            ))}
          </RiseIn>
        ) : null}

        <Text style={styles.legal}>
          By continuing, you agree to our{" "}
          <Text style={styles.legalLink}>Terms of Use</Text> and{" "}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { paddingBottom: 48 },
  screenWide: { flexGrow: 1, justifyContent: "center" },
  col: { width: "100%" },
  split: { flexDirection: "row", gap: 36, alignItems: "flex-start" },
  brandCol: { flex: 1, paddingTop: 8 },
  loginBack: { alignSelf: "flex-start", marginBottom: 4 },
  formCol: { flex: 1.15, maxWidth: 460, width: "100%" },
  welcomeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18, marginBottom: 16 },
  title: { fontFamily: fonts.bold, fontSize: 21, color: colors.navy, letterSpacing: 0.1 },
  sub: { marginTop: 4, fontFamily: fonts.medium, color: colors.muted, fontSize: 13, lineHeight: 20 },
  shieldWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.card,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
  },
  lock: { position: "absolute", top: 20 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF6D6",
    borderRadius: radii.card,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: { flex: 1, fontFamily: fonts.medium, color: colors.navy, fontSize: 13, lineHeight: 18 },
  fieldLabel: { fontFamily: fonts.bold, color: colors.navy, marginBottom: 8, fontSize: 13 },
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
  ccText: { fontFamily: fonts.semi, color: colors.navy },
  vline: { width: 1, height: 22, backgroundColor: colors.border, marginRight: 10 },
  input: { flex: 1, fontFamily: fonts.regular, color: colors.navy, fontSize: 15, outlineStyle: "none", outlineWidth: 0 },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 12, marginTop: -4 },
  forgot: { color: colors.linkBlue, fontFamily: fonts.semi, fontSize: 13 },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FDECEA",
    borderRadius: radii.input,
    padding: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  errorText: { flex: 1, color: colors.nameRed, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  resetCta: { alignItems: "center", marginBottom: 12, marginTop: 2 },
  resetCtaText: { color: colors.linkBlue, fontFamily: fonts.bold, fontSize: 14 },
  orRow: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: 10, color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  createBtn: { alignItems: "center", marginBottom: 16 },
  createText: { color: colors.navy, fontFamily: fonts.bold, fontSize: 14 },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
  },
  helperIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.card,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: {
    flex: 1,
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  features: { flexDirection: "row", gap: 10 },
  feature: { flex: 1, alignItems: "center" },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.icon,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  featureTitle: { fontFamily: fonts.semi, color: colors.navy, fontSize: 12 },
  featureSub: { marginTop: 2, textAlign: "center", color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  legal: { marginTop: 22, textAlign: "center", color: colors.muted, fontFamily: fonts.light, fontSize: 11, lineHeight: 16 },
  legalLink: { color: colors.linkBlue, fontFamily: fonts.bold },
});
