import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ParentShell } from "@/components/parent/ParentShell";
import { Card } from "@/components/ui/Card";
import { PillButton } from "@/components/ui/PillButton";
import { AuthInput } from "@/components/ui/AuthInput";
import { useParent } from "@/context/ParentContext";
import { colors, fonts, radii } from "@/constants/theme";
import { isApiError } from "@/lib/api";

export default function ParentGateScreen() {
  const router = useRouter();
  const { hasPin, unlockWithPassword, unlockWithPin, setPin, ready } = useParent();
  const [mode, setMode] = useState<"pin" | "password">("password");
  const [password, setPassword] = useState("");
  const [pin, setPinValue] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && hasPin) setMode("pin");
  }, [ready, hasPin]);

  async function enterHub() {
    router.replace("/parent/hub");
  }

  async function onPassword() {
    setError("");
    setBusy(true);
    try {
      await unlockWithPassword(password);
      if (!hasPin) {
        if (nextPin.length !== 4) {
          setError("Set a 4-digit PIN for next time.");
          setBusy(false);
          return;
        }
        await setPin(nextPin);
      }
      await enterHub();
    } catch (e) {
      setError(isApiError(e) ? e.message : e instanceof Error ? e.message : "Could not unlock.");
    } finally {
      setBusy(false);
    }
  }

  async function onPin() {
    setError("");
    setBusy(true);
    try {
      await unlockWithPin(pin);
      await enterHub();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wrong PIN.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ParentShell title="Grown-ups only" home>
      <Card>
        <View style={styles.icon}>
          <Ionicons name="shield-checkmark" size={28} color={colors.navy} />
        </View>
        <Text style={styles.lead}>Parent Access is locked so children cannot open payments, plans, or controls.</Text>
        {mode === "pin" && hasPin ? (
          <>
            <Text style={styles.label}>Parent PIN</Text>
            <TextInput
              value={pin}
              onChangeText={(t) => setPinValue(t.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={styles.pin}
              placeholder="••••"
              placeholderTextColor={colors.muted}
            />
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <PillButton label="Unlock" variant="navy" loading={busy} onPress={() => void onPin()} />
            <Text style={styles.switch} onPress={() => setMode("password")}>
              Use parent password instead
            </Text>
          </>
        ) : (
          <>
            <AuthInput
              label="Parent password"
              placeholder="The password for this account"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              secure
            />
            {!hasPin ? (
              <>
                <Text style={styles.label}>Create a 4-digit PIN</Text>
                <TextInput
                  value={nextPin}
                  onChangeText={(t) => setNextPin(t.replace(/\D/g, "").slice(0, 4))}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  style={styles.pin}
                  placeholder="••••"
                  placeholderTextColor={colors.muted}
                />
                <Text style={styles.hint}>Use this PIN next time. Don’t share it with your child.</Text>
              </>
            ) : null}
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <PillButton label="Unlock Parent Access" variant="navy" loading={busy} onPress={() => void onPassword()} />
            {hasPin ? (
              <Text style={styles.switch} onPress={() => setMode("pin")}>
                Use PIN instead
              </Text>
            ) : null}
          </>
        )}
      </Card>
    </ParentShell>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  lead: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  label: { fontFamily: fonts.semi, color: colors.navy, marginBottom: 6, fontSize: 13 },
  pin: {
    letterSpacing: 10,
    fontFamily: fonts.extra,
    fontSize: 28,
    color: colors.navy,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  hint: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginBottom: 12, marginTop: -4 },
  err: { fontFamily: fonts.bold, color: colors.nameRed, fontSize: 13, marginBottom: 10 },
  switch: { fontFamily: fonts.bold, color: colors.linkBlue, textAlign: "center", marginTop: 14, fontSize: 13 },
});
