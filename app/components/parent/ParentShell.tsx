import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BouncePress } from "@/components/game/BouncePress";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { useSafeBack, useAndroidBack } from "@/components/ui/BackButton";
import { useLayout } from "@/lib/layout";
import { colors, fonts } from "@/constants/theme";
import { useParent } from "@/context/ParentContext";

export function ParentShell({
  title,
  children,
  home,
}: {
  title: string;
  children: React.ReactNode;
  home?: boolean;
}) {
  const { lock } = useParent();
  const { headerTop, padX, activityMax } = useLayout();
  const goBack = useSafeBack(home ? "/(main)/account" : "/parent/hub");
  const leave = () => {
    if (home) lock();
    goBack();
  };
  useAndroidBack(leave);

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <View style={[styles.header, { paddingTop: headerTop, paddingHorizontal: padX }]}>
        <BouncePress sound={false} onPress={leave} style={styles.back} accessibilityLabel="Leave Parent Access">
          <Ionicons name="chevron-back" size={24} color={colors.navy} />
        </BouncePress>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>PARENT ACCESS</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={14} color={colors.navy} />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingHorizontal: padX, maxWidth: activityMax, width: "100%", alignSelf: "center" },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F6FB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingBottom: 10,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  kicker: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, letterSpacing: 1.2 },
  title: { fontFamily: fonts.extra, color: colors.navy, fontSize: 18 },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingBottom: 40, paddingTop: 8 },
});
