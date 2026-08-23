import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PillButton } from "@/components/ui/PillButton";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { colors, fonts } from "@/constants/theme";
import { useLayout } from "@/lib/layout";

export default function WelcomeScreen() {
  const router = useRouter();

  const { headerTop, padX, formMax } = useLayout();

  return (
    <View style={styles.screen}>
      <ScreenDecor />
      <View style={[styles.body, { paddingTop: headerTop + 24, paddingHorizontal: padX, maxWidth: formMax + padX * 2, width: "100%", alignSelf: "center" }]}>
        <BrandLogo size="lg" />
        <Text style={styles.headline}>Welcome to BritBee!</Text>
        <Text style={styles.sub}>Log in with your mobile number and password</Text>
        <View style={{ height: 20 }} />
        <PillButton label="Continue" onPress={() => router.push("/(auth)/login")} />
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.orLine} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, justifyContent: "center", paddingBottom: 80 },
  headline: { marginTop: 18, textAlign: "center", fontFamily: fonts.extra, fontSize: 22, color: colors.navy },
  sub: { marginTop: 6, textAlign: "center", color: colors.muted, fontFamily: fonts.regular, fontSize: 14 },
  orRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: 10, color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
});
