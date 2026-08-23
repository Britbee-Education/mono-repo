import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BouncePress } from "@/components/game/BouncePress";
import { HiveAvatar } from "@/components/hive/HiveAvatar";
import { useAuth } from "@/context/AuthContext";
import { useHive } from "@/context/HiveContext";
import { useNotify } from "@/context/NotifyContext";
import { useProgress } from "@/context/ProgressContext";
import { useLayout } from "@/lib/layout";
import { colors, fonts, shadow } from "@/constants/theme";

function gradeLabel(level?: string, beeLevel?: number) {
  if (level === "beginner") return "Grade K";
  if (level === "intermediate") return "Grade 1–2";
  if (level === "advanced") return "Grade 3+";
  return `Level ${beeLevel || 1}`;
}

export function MainHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const { hive } = useHive();
  const { unread } = useNotify();
  const { rank } = useProgress();
  const { headerTop, padX } = useLayout();

  const meName = user?.child?.childName?.split(" ")[0] || "friend";
  const badge = unread > 0 ? (unread > 9 ? "9+" : unread) : undefined;

  const placeText = useMemo(() => {
    const p = hive?.me?.place;
    if (typeof p === "number") return `#${p}`;
    return "Hive";
  }, [hive?.me?.place]);

  return (
    <View style={[styles.wrap, { paddingTop: headerTop, paddingHorizontal: Math.max(8, padX - 8) }]}>
      <View style={styles.brand}>
        <Text style={styles.brandBrit}>Brit</Text>
        <Text style={styles.brandBee}>Bee</Text>
      </View>

      <View style={styles.right}>
        <BouncePress sound={false} onPress={() => router.push("/(main)/inbox")} style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={colors.navy} />
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{badge}</Text>
            </View>
          ) : null}
        </BouncePress>

        <BouncePress sound={false} onPress={() => router.push("/(main)/leaderboard")} style={styles.leaderChip}>
          <Ionicons name="trophy" size={18} color={colors.navy} />
          <Text style={styles.leaderTxt}>{placeText}</Text>
        </BouncePress>

        <BouncePress sound={false} onPress={() => router.push("/(main)/account")} style={styles.profilePill}>
          <HiveAvatar name={meName} hue={hive?.me.hue || 0} look={user?.child?.avatar || hive?.me.look} size={30} />
          <View style={styles.profileCopy}>
            <Text style={styles.profileName} numberOfLines={1}>
              {meName}
            </Text>
            <Text style={styles.profileGrade} numberOfLines={1}>
              {gradeLabel(user?.child?.level, rank.level)}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </BouncePress>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#F6F1E8",
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(238,230,214,0.65)",
    ...shadow.card,
  },
  brand: { flexDirection: "row", alignItems: "baseline", gap: 0, flexShrink: 0 },
  brandBrit: { fontFamily: fonts.extra, fontSize: 24, color: colors.navy },
  brandBee: { fontFamily: fonts.extra, fontSize: 24, color: colors.yellow },
  right: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  bell: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.nameRed,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeTxt: { fontFamily: fonts.extra, color: colors.white, fontSize: 9 },
  leaderChip: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(26,43,95,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leaderTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12 },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 8,
    maxWidth: 168,
    minWidth: 0,
  },
  profileCopy: { flexShrink: 1, minWidth: 0 },
  profileName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 13 },
  profileGrade: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, marginTop: -1 },
});

