import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { BeeMascot } from "@/components/ui/BeeMascot";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { PillButton } from "@/components/ui/PillButton";
import { colors, fonts } from "@/constants/theme";

export function BeeStateScreen({
  title,
  message,
  bubble,
  mood = "wave",
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  message: string;
  bubble?: string;
  mood?: "wave" | "wink" | "cheer";
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <View style={styles.card}>
        <BeeMascot size={160} mood={mood} bubble={bubble} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.cta}>
          <PillButton label={primaryLabel} onPress={onPrimary} />
        </View>
        {secondaryLabel ? (
          <Text style={styles.link} onPress={onSecondary || (() => router.replace("/"))}>
            {secondaryLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", padding: 20 },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  title: { marginTop: 12, fontFamily: fonts.extra, fontSize: 28, color: colors.navy, textAlign: "center" },
  message: { marginTop: 8, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: "center" },
  cta: { marginTop: 18, width: "100%" },
  link: { marginTop: 14, fontFamily: fonts.bold, color: colors.listen, fontSize: 14 },
});

