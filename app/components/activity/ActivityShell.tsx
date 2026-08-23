import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useEffect } from "react";
import { type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { BuzzChip } from "@/components/game/BuzzChip";
import { BouncePress } from "@/components/game/BouncePress";
import { useSafeBack, useAndroidBack } from "@/components/ui/BackButton";
import { colors, fonts } from "@/constants/theme";
import { motion } from "@/lib/motion";
import { useLayout } from "@/lib/layout";
import { useReduceMotion } from "@/components/ui/RiseIn";
import { useParent } from "@/context/ParentContext";
import { PillButton } from "@/components/ui/PillButton";

export function ActivityShell({
  title,
  eyebrow,
  children,
  progress,
  fallback = "/(main)",
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  progress?: { current: number; total: number };
  fallback?: Href;
}) {
  const goBack = useSafeBack(fallback);
  useAndroidBack(goBack);
  const reduce = useReduceMotion();
  const { paused } = useParent();
  const { headerTop, padX, activityMax } = useLayout();
  const pct = progress && progress.total > 0 ? Math.min(1, (progress.current + 0.15) / progress.total) : 0;
  const fill = useSharedValue(pct);
  useEffect(() => {
    fill.value = withTiming(pct, motion.enter);
  }, [fill, pct]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.round(fill.value * 100)}%` }));

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <View style={[styles.header, { paddingTop: headerTop, paddingHorizontal: Math.max(8, padX - 8) }]}>
        <BouncePress
          sound={false}
          onPress={goBack}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.navy} />
        </BouncePress>
        <View style={styles.headText}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <BuzzChip />
      </View>
      {progress ? (
        <View style={[styles.barTrack, { marginHorizontal: padX }]}>
          <Animated.View style={[styles.barFill, bar]} />
          {progress.current > 0 && progress.current < progress.total ? (
            <View style={[styles.barGem, { left: `${Math.round(Math.min(0.99, progress.current / progress.total) * 100)}%` }]} />
          ) : null}
        </View>
      ) : (
        <View style={[styles.hair, { marginHorizontal: padX }]} />
      )}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingHorizontal: padX, maxWidth: activityMax, width: "100%", alignSelf: "center" }]}
        keyboardShouldPersistTaps="handled"
      >
        {paused ? (
          <View style={styles.pausedBox}>
            <Text style={styles.pausedTitle}>Practice is paused</Text>
            <Text style={styles.pausedSub}>A parent turned this off in Parent Access.</Text>
            <PillButton label="Back to hive" onPress={goBack} />
          </View>
        ) : reduce ? (
          children
        ) : (
          <Animated.View entering={FadeIn.duration(180)}>{children}</Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 2,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headText: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: { fontFamily: fonts.extra, fontSize: 19, color: colors.navy },
  hair: { height: 1, backgroundColor: colors.border },
  barTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "visible",
    marginBottom: 2,
  },
  barFill: { height: 6, backgroundColor: colors.yellow, borderRadius: 3 },
  barGem: {
    position: "absolute",
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.yellow,
    borderWidth: 2.5,
    borderColor: colors.navy,
    marginLeft: -6,
  },
  body: { paddingBottom: 48, paddingTop: 16 },
  pausedBox: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#EEF1F6" },
  pausedTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 20, marginBottom: 6 },
  pausedSub: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14, lineHeight: 20, marginBottom: 16 },
});
