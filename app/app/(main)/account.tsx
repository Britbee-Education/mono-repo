import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { ZoomIn } from "react-native-reanimated";
import { PillButton } from "@/components/ui/PillButton";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { Card } from "@/components/ui/Card";
import { BouncePress } from "@/components/game/BouncePress";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";
import { useNotify } from "@/context/NotifyContext";
import { useHive } from "@/context/HiveContext";
import { useLayout } from "@/lib/layout";
import { colors, fonts, radii } from "@/constants/theme";
import { HiveAvatar, placeLabel } from "@/components/hive/HiveAvatar";
import { RewardRow } from "@/components/game/StatBadges";
import { crittersDicebearPngUrl, planetsDicebearPngUrl, sproutsDicebearPngUrl } from "@/lib/dicebear";
import { HELLO_PACK_KEY } from "@/lib/quests";
import { NextUnlockLabel } from "@/components/game/NextUnlockLabel";

/** Lighten a hex color toward white for gradient start */
function lighten(hex: string) {
  try {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, ((n >> 16) & 0xff) + 80);
    const g = Math.min(255, ((n >> 8) & 0xff) + 80);
    const b = Math.min(255, (n & 0xff) + 80);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return hex;
  }
}

function last10(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    points,
    streak,
    rank,
    snapshot,
    clearedSounds,
    grantHelloPack,
    attendStreak,
    classAttendStreak,
    verbsCleared,
    prepCorrect,
    sprouts,
    planets,
    packsToday,
  } = useProgress();
  const { enabled: notify, setEnabled: setNotify } = useNotify();
  const { hive } = useHive();
  const { headerTop, padX, activityMax } = useLayout();
  const phone = last10(user?.phone);
  const seedBase = user?.child?.childName || user?.name || "Bee";

  const badgeDefs = [
    {
      id: "level-scout",
      name: "Level Scout",
      hint: "Keep leveling up to grow your badge.",
      color: colors.listen,
      stars: rank.level >= 6 ? 3 : rank.level >= 4 ? 2 : rank.level >= 2 ? 1 : 0,
      progress: `Level ${rank.level} right now`,
    },
    {
      id: "dedicated",
      name: "Dedicated",
      hint: "Come back every day and hold your streak.",
      color: "#FF8A65",
      stars: streak >= 10 ? 3 : streak >= 5 ? 2 : streak >= 2 ? 1 : 0,
      progress: streak >= 10 ? "Super steady habit" : `${streak}-day streak`,
    },
    {
      id: "daily-hero",
      name: "Daily Hero",
      hint: "Open Daily Sprouts again and again.",
      color: "#F5C400",
      stars: attendStreak >= 10 ? 3 : attendStreak >= 5 ? 2 : attendStreak >= 2 ? 1 : 0,
      progress: attendStreak ? `${attendStreak} Daily Sprouts days` : "Start a daily habit",
    },
    {
      id: "class-champ",
      name: "Class Champ",
      hint: "Join mentor classes consistently.",
      color: "#5B9BFF",
      stars: classAttendStreak >= 7 ? 3 : classAttendStreak >= 3 ? 2 : classAttendStreak >= 1 ? 1 : 0,
      progress: classAttendStreak ? `${classAttendStreak} class days` : "Join your first class",
    },
    {
      id: "chatterbox",
      name: "Chatterbox",
      hint: "Keep speaking and building confidence.",
      color: colors.speak,
      stars: streak >= 7 && snapshot.dailyEver ? 3 : streak >= 3 && snapshot.dailyEver ? 2 : snapshot.dailyEver ? 1 : 0,
      progress: snapshot.dailyEver ? "Speaking habit started" : "Say your daily line",
    },
    {
      id: "Sound Star",
      name: "Sound Star",
      hint: "Clear more sounds to sharpen listening.",
      color: colors.listen,
      stars: clearedSounds.length >= 6 ? 3 : clearedSounds.length >= 3 ? 2 : clearedSounds.length >= 1 ? 1 : 0,
      progress: `${clearedSounds.length} sounds cleared`,
    },
    {
      id: "story-seeker",
      name: "Story Seeker",
      hint: "Read stories often and grow your level.",
      color: colors.yellow,
      stars: snapshot.storyEver && rank.level >= 5 ? 3 : snapshot.storyEver && rank.level >= 3 ? 2 : snapshot.storyEver ? 1 : 0,
      progress: snapshot.storyEver ? "Story trail unlocked" : "Read your first story",
    },
    {
      id: "action-ace",
      name: "Action Ace",
      hint: "Practice action words again and again.",
      color: colors.mission,
      stars: verbsCleared.length >= 3 ? 3 : verbsCleared.length >= 2 ? 2 : verbsCleared.length >= 1 ? 1 : 0,
      progress: `${verbsCleared.length} action words cleared`,
    },
    {
      id: "map-mind",
      name: "Map Mind",
      hint: "Keep solving location and direction tasks.",
      color: colors.shieldBlue,
      stars: prepCorrect >= 5 ? 3 : prepCorrect >= 3 ? 2 : prepCorrect >= 1 ? 1 : 0,
      progress: `${prepCorrect} map answers right`,
    },
  ];
  const earnedCount = badgeDefs.filter((b) => b.stars >= 3).length;
  const unlockedBadges = badgeDefs.filter((b) => b.stars >= 3);
  const [selectedBadgeId, setSelectedBadgeId] = useState(badgeDefs[0]?.id || "level-scout");
  const [showBadgeDetails, setShowBadgeDetails] = useState(false);
  const [openCollection, setOpenCollection] = useState<"badges" | "sprouts" | "planets" | null>(null);
  const selectedBadge = badgeDefs.find((b) => b.id === selectedBadgeId) || badgeDefs[0];
  const rankNow = hive ? placeLabel(hive.me.place) : "—";

  const sproutItems = useMemo(() => {
    const grouped = sprouts.reduce<Record<string, { id: string; label: string; rarity: string; count: number }>>((acc, s) => {
      const key = s.id;
      const prev = acc[key];
      acc[key] = {
        id: s.id,
        label: s.label,
        rarity: s.rarity,
        count: (prev?.count || 0) + 1,
      };
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [sprouts]);

  const planetItems = useMemo(() => {
    const grouped = planets.reduce<Record<string, { id: string; label: string; rarity: string; count: number }>>((acc, p) => {
      const key = p.id;
      const prev = acc[key];
      acc[key] = {
        id: p.id,
        label: p.label,
        rarity: p.rarity,
        count: (prev?.count || 0) + 1,
      };
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [planets]);

  useFocusEffect(
    useCallback(() => {
      grantHelloPack();
    }, [grantHelloPack])
  );

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: headerTop, paddingHorizontal: padX, maxWidth: activityMax, width: "100%", alignSelf: "center" },
        ]}
      >
        <Text style={styles.screenTitle}>Account</Text>

        <Card style={styles.card}>
          <BouncePress sound="tap" onPress={() => router.push("/avatar")} style={styles.avatarWrap}>
            <View style={styles.beeBox}>
              <HiveAvatar
                name={user?.child?.childName || user?.name || "B"}
                hue={hive?.me.hue || 0}
                look={user?.child?.avatar || hive?.me.look}
                size={72}
                ring={hive?.me.dailyDone}
              />
            </View>
          </BouncePress>
          <BouncePress sound={false} onPress={() => router.push("/avatar")} style={styles.avatarHintBtn}>
            <Ionicons name="color-wand-outline" size={14} color={colors.navy} />
            <Text style={styles.avatarHintTxt}>Customize Avatar</Text>
          </BouncePress>
          <Text style={styles.title}>{user?.child?.childName || user?.name || "BritBee explorer"}</Text>
          <Text style={styles.rank}>{rank.title}</Text>
          <Text style={styles.sub}>{phone ? `+91 ${phone}` : user?.email}</Text>
          <View style={{ marginTop: 16 }}>
            <RewardRow streak={streak || 0} points={points} size="lg" onDark={false} />
          </View>
          <View style={styles.extraStats}>
            <View style={styles.extraStatChip}>
              <Ionicons name="rocket" size={14} color={colors.listen} />
              <Text style={styles.extraStatVal}>Level {rank.level}</Text>
            </View>
            <View style={styles.extraStatChip}>
              <Ionicons name="trophy" size={14} color={colors.shieldBlue} />
              <Text style={styles.extraStatVal}>Rank {rankNow}</Text>
            </View>
          </View>
        </Card>

        <>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>Badges</Text>
            <View style={styles.sectionRight}>
              <Text style={styles.sectionCount}>
                {earnedCount} / {badgeDefs.length} earned
              </Text>
              <BouncePress sound={false} onPress={() => setShowBadgeDetails((v) => !v)} style={styles.sectionToggle}>
                <Ionicons name={showBadgeDetails ? "chevron-up" : "chevron-down"} size={14} color={colors.navy} />
                <Text style={styles.sectionToggleTxt}>{showBadgeDetails ? "Hide details" : "Show details"}</Text>
              </BouncePress>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgeRail}
          >
            {badgeDefs.map((badge, idx) => {
              const earned = badge.stars >= 3;
              const started = badge.stars > 0;
              const frameColors = earned
                ? [lighten(badge.color), badge.color]
                : started
                  ? [lighten(badge.color), "rgba(245,196,0,0.22)"]
                  : ["#EEE8DC", "#D7DCE6"];
              const tierKey = badge.stars === 3 ? "tier3" : badge.stars === 2 ? "tier2" : badge.stars === 1 ? "tier1" : "none";
              const critterSeed = `${seedBase}|${badge.id}|${tierKey}|level-${rank.level}`;

              return (
                <Animated.View
                  key={badge.id}
                  entering={started ? ZoomIn.delay(idx * 45).duration(240).springify() : undefined}
                  style={[styles.badgeCompact, selectedBadgeId === badge.id && styles.badgeCompactActive]}
                >
                  <BouncePress sound={false} onPress={() => setSelectedBadgeId(badge.id)} style={styles.badgeButton}>
                    <View style={styles.medalWrap}>
                      <LinearGradient colors={frameColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.medalFrame}>
                        <View style={styles.medalInner}>
                          <Image
                            source={{ uri: crittersDicebearPngUrl({ seed: critterSeed, size: 76 }) }}
                            style={[styles.badgeCritter, !started && styles.badgeCritterLocked]}
                            resizeMode="cover"
                          />
                        </View>
                      </LinearGradient>
                      {earned ? (
                        <View style={[styles.medalStamp, { backgroundColor: "rgba(255,255,255,0.96)" }]}>
                          <Ionicons name="checkmark" size={11} color={badge.color} />
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.badgeKid} numberOfLines={1}>
                      {badge.name}
                    </Text>
                    <View style={styles.starRow}>
                      {[0, 1, 2].map((i) => (
                        <Text key={i} style={[styles.star, i < badge.stars && styles.starOn]}>
                          ★
                        </Text>
                      ))}
                    </View>
                  </BouncePress>
                </Animated.View>
              );
            })}
          </ScrollView>

          {selectedBadge && showBadgeDetails ? (
            <Card style={styles.badgeDetailCard}>
              <LinearGradient
                colors={["#F9F3FF", "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badgeDetailBg}
              >
                <View style={styles.badgeDetailHead}>
                  <View style={styles.badgeDetailBadge}>
                    <Text style={styles.badgeDetailEmoji}>🏅</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.badgeDetailTitle}>{selectedBadge.name}</Text>
                    <Text style={styles.badgeDetailHint}>{selectedBadge.hint}</Text>
                  </View>
                  <Text style={styles.badgeDetailState}>
                    {selectedBadge.stars >= 3 ? "Earned" : `${selectedBadge.stars} / 3`}
                  </Text>
                </View>

                <Text style={styles.badgeDetailProgress}>{selectedBadge.progress}</Text>

                <View style={styles.badgeTrack}>
                  <View style={[styles.badgeTrackFill, { width: `${Math.max(8, (selectedBadge.stars / 3) * 100)}%`, backgroundColor: selectedBadge.color }]} />
                </View>

                <View style={styles.badgeMilestones}>
                  <Text style={styles.badgeMilestone}>⭐ Start</Text>
                  <Text style={styles.badgeMilestone}>⭐⭐ Consistent</Text>
                  <Text style={styles.badgeMilestone}>⭐⭐⭐ Earn trait</Text>
                </View>
              </LinearGradient>
            </Card>
          ) : null}
        </>

        <Text style={styles.section}>Collections</Text>
        <View style={styles.collectionStack}>
          <Card style={styles.collectionCard}>
            <BouncePress sound={false} onPress={() => setOpenCollection((v) => (v === "badges" ? null : "badges"))}>
              <View style={styles.collectionHead}>
                <Text style={styles.collectionTitle}>Unlocked Badges</Text>
                <View style={styles.collectionRight}>
                  <Text style={styles.collectionCount}>{earnedCount}</Text>
                  <Ionicons name={openCollection === "badges" ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
                </View>
              </View>
              {unlockedBadges.length && openCollection !== "badges" ? (
                <View style={styles.collectibleRow}>
                  {unlockedBadges.slice(0, 7).map((b, idx) => (
                    <View key={b.id} style={[styles.collectibleBubble, idx > 0 && styles.collectibleStacked]}>
                      <Image
                        source={{ uri: crittersDicebearPngUrl({ seed: `${seedBase}|${b.id}|tier3|level-${rank.level}`, size: 52 }) }}
                        style={styles.collectibleImg}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.collectionSub}>No badges unlocked yet.</Text>
              )}
            </BouncePress>
            {openCollection === "badges" ? (
              <View style={styles.collectionList}>
                {unlockedBadges.length ? (
                  unlockedBadges.map((b) => (
                    <View key={b.id} style={styles.collectionItem}>
                      <View style={styles.collectionItemLeft}>
                        <View style={styles.collectionItemAvatarWrap}>
                          <Image
                            source={{ uri: crittersDicebearPngUrl({ seed: `${seedBase}|${b.id}|tier3|level-${rank.level}`, size: 42 }) }}
                            style={styles.collectionItemAvatar}
                          />
                        </View>
                        <Text style={styles.collectionItemTitle}>{b.name}</Text>
                      </View>
                      <Text style={styles.collectionItemMeta}>x1</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.collectionSub}>Earn by keeping streaks and leveling up.</Text>
                )}
              </View>
            ) : null}
          </Card>

          <Card style={styles.collectionCard}>
            <BouncePress sound={false} onPress={() => setOpenCollection((v) => (v === "sprouts" ? null : "sprouts"))}>
              <View style={styles.collectionHead}>
                <Text style={styles.collectionTitle}>Daily Sprouts</Text>
                <View style={styles.collectionRight}>
                  <Text style={styles.collectionCount}>{sprouts.length}</Text>
                  <Ionicons name={openCollection === "sprouts" ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
                </View>
              </View>
              {packsToday.includes(HELLO_PACK_KEY) ? (
                <NextUnlockLabel kind="sprout" style={styles.collectionSub} />
              ) : null}
              {sprouts.length && openCollection !== "sprouts" ? (
                <View style={styles.collectibleRow}>
                  {sprouts.slice(-10).reverse().map((s, idx) => (
                    <View key={`${s.id}-${s.claimedAt}-${idx}`} style={[styles.collectibleBubble, idx > 0 && styles.collectibleStacked]}>
                      <Image source={{ uri: sproutsDicebearPngUrl({ seed: `${s.id}|${s.claimedAt}`, size: 52 }) }} style={styles.collectibleImg} />
                    </View>
                  ))}
                </View>
              ) : !packsToday.includes(HELLO_PACK_KEY) ? (
                <Text style={styles.collectionSub}>Open Daily Sprouts to unlock your first sprout buddy.</Text>
              ) : null}
            </BouncePress>
            {openCollection === "sprouts" ? (
              <View style={styles.collectionList}>
                {sproutItems.length ? (
                  sproutItems.map((s) => (
                    <View key={s.id} style={styles.collectionItem}>
                      <View style={styles.collectionItemLeft}>
                        <View style={styles.collectionItemAvatarWrap}>
                          <Image source={{ uri: sproutsDicebearPngUrl({ seed: s.id, size: 42 }) }} style={styles.collectionItemAvatar} />
                        </View>
                        <Text style={styles.collectionItemTitle}>{s.label}</Text>
                      </View>
                      <Text style={styles.collectionItemMeta}>
                        {s.rarity} · x{s.count}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.collectionSub}>No sprouts yet.</Text>
                )}
              </View>
            ) : null}
          </Card>

          <Card style={styles.collectionCard}>
            <BouncePress sound={false} onPress={() => setOpenCollection((v) => (v === "planets" ? null : "planets"))}>
              <View style={styles.collectionHead}>
                <Text style={styles.collectionTitle}>Class Bonus</Text>
                <View style={styles.collectionRight}>
                  <Text style={styles.collectionCount}>{planets.length}</Text>
                  <Ionicons name={openCollection === "planets" ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
                </View>
              </View>
              {planets.length && openCollection !== "planets" ? (
                <View style={styles.collectibleRow}>
                  {planets.slice(-10).reverse().map((p, idx) => (
                    <View key={`${p.id}-${p.claimedAt}-${idx}`} style={[styles.collectibleBubble, styles.planetBubble, idx > 0 && styles.collectibleStacked]}>
                      <Image source={{ uri: planetsDicebearPngUrl({ seed: `${p.id}|${p.claimedAt}`, size: 52 }) }} style={styles.collectibleImg} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.collectionSub}>Join classes to unlock your first electric planet buddy.</Text>
              )}
            </BouncePress>
            {openCollection === "planets" ? (
              <View style={styles.collectionList}>
                {planetItems.length ? (
                  planetItems.map((p) => (
                    <View key={p.id} style={styles.collectionItem}>
                      <View style={styles.collectionItemLeft}>
                        <View style={[styles.collectionItemAvatarWrap, styles.planetItemAvatarWrap]}>
                          <Image source={{ uri: planetsDicebearPngUrl({ seed: p.id, size: 42 }) }} style={styles.collectionItemAvatar} />
                        </View>
                        <Text style={styles.collectionItemTitle}>{p.label}</Text>
                      </View>
                      <Text style={styles.collectionItemMeta}>
                        {p.rarity} · x{p.count}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.collectionSub}>No planets yet.</Text>
                )}
              </View>
            ) : null}
          </Card>
        </View>

        <Text style={styles.section}>Parent Access</Text>
        <BouncePress sound={false} onPress={() => router.push("/parent")} style={styles.parentCard}>
          <View style={styles.parentIcon}>
            <Ionicons name="lock-closed" size={18} color={colors.navy} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.parentTitle}>Parent Access</Text>
            <Text style={styles.parentSub}>Grown-ups only. Progress, payments, plans, and parental controls.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </BouncePress>

        <Text style={styles.section}>Settings</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={18} color={colors.navy} />
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Switch
              value={notify}
              onValueChange={(v) => void setNotify(v)}
              trackColor={{ false: colors.border, true: colors.yellow }}
              thumbColor={colors.white}
            />
          </View>
        </Card>

        <View style={{ marginTop: 16 }}>
          <PillButton label="Sign out" variant="outline" onPress={signOut} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  body: { paddingBottom: 40 },
  screenTitle: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy, marginBottom: 4 },
  card: { marginTop: 12 },
  title: { fontFamily: fonts.extra, fontSize: 20, color: colors.navy, textAlign: "center" },
  avatarWrap: { alignItems: "center", marginBottom: 10 },
  beeBox: { width: 72, height: 72 },
  avatarHintBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F4F7FF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DEE7FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  avatarHintTxt: { fontFamily: fonts.bold, color: colors.navy, fontSize: 12 },
  rank: { fontFamily: fonts.bold, color: colors.listen, textAlign: "center", marginTop: 4 },
  hivePlace: { fontFamily: fonts.bold, color: colors.muted, textAlign: "center", marginTop: 12, fontSize: 13 },
  sub: { color: colors.muted, fontFamily: fonts.regular, textAlign: "center", marginTop: 2 },
  extraStats: { marginTop: 10, flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  extraStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F4F7FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#DEE7FF",
  },
  extraStatVal: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12 },
  section: { fontFamily: fonts.bold, color: colors.navy, fontSize: 14 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 0 },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionCount: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
  sectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F3F5FB",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E3E8F5",
  },
  sectionToggleTxt: { fontFamily: fonts.bold, color: colors.navy, fontSize: 11 },
  badgeRail: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingRight: 8,
  },
  badgeCompact: {
    width: 104,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(26,43,95,0.05)",
  },
  badgeCompactActive: {
    backgroundColor: colors.white,
    borderColor: "rgba(140,82,255,0.18)",
  },
  badgeButton: { alignItems: "center", width: "100%" },
  medalWrap: { position: "relative", marginBottom: 8 },
  medalFrame: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  medalInner: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(26,43,95,0.08)",
    overflow: "hidden",
  },
  badgeCritter: { width: "100%", height: "100%" },
  badgeCritterLocked: { opacity: 0.25, transform: [{ scale: 0.84 }] },
  medalStamp: {
    position: "absolute",
    right: -2,
    top: -2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(26,43,95,0.08)",
  },
  medalStampTxt: { fontFamily: fonts.extra, fontSize: 10, letterSpacing: 0.5 },
  starRow: { flexDirection: "row", gap: 2, marginTop: 3 },
  star: { fontSize: 12, color: "rgba(26,43,95,0.18)" },
  starOn: { color: colors.yellow },
  badgeKid: { fontFamily: fonts.extra, color: colors.navy, fontSize: 11, marginTop: 1, textAlign: "center" },
  badgeMiniProgress: { fontFamily: fonts.bold, color: colors.listen, fontSize: 10, marginTop: 4, textAlign: "center" },
  badgeInstruction: { fontFamily: fonts.medium, color: colors.ink, fontSize: 10, textAlign: "center", marginTop: 4, lineHeight: 13 },
  badgeDetailCard: { marginTop: 10 },
  badgeDetailBg: { borderRadius: 12, padding: 10 },
  badgeDetailHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  badgeDetailBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5E9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDetailEmoji: { fontSize: 18 },
  badgeDetailTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16, flex: 1 },
  badgeDetailState: { fontFamily: fonts.extra, color: colors.listen, fontSize: 12 },
  badgeDetailHint: { fontFamily: fonts.medium, color: colors.ink, fontSize: 12, marginTop: 2, lineHeight: 17 },
  badgeDetailProgress: { fontFamily: fonts.bold, color: colors.navy, fontSize: 13, marginTop: 8, marginBottom: 2 },
  badgeTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: "#ECE9F9",
    overflow: "hidden",
    marginTop: 8,
  },
  badgeTrackFill: {
    height: "100%",
    borderRadius: 999,
  },
  badgeMilestones: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  badgeMilestone: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 11,
    backgroundColor: "#F5F6FB",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  collectionStack: { gap: 10, marginTop: 12, marginBottom: 6 },
  collectionCard: { marginTop: 0 },
  collectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  collectionRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  collectionTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16 },
  collectionCount: { fontFamily: fonts.extra, color: colors.listen, fontSize: 16 },
  collectionSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  collectionList: { marginTop: 8, gap: 6 },
  collectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#F8FAFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  collectionItemLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  collectionItemAvatarWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EAF5EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8EEDD",
  },
  planetItemAvatarWrap: {
    backgroundColor: "#EAF2FF",
    borderColor: "#DCE8FF",
  },
  collectionItemAvatar: { width: 18, height: 18, borderRadius: 9 },
  collectionItemTitle: { fontFamily: fonts.bold, color: colors.navy, fontSize: 12, flex: 1, minWidth: 0 },
  collectionItemMeta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11 },
  collectibleRow: { flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 2, paddingRight: 8 },
  collectibleStacked: { marginLeft: -10 },
  collectibleBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAF5EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
    marginRight: 8,
  },
  planetBubble: { backgroundColor: "#EAF2FF" },
  collectibleImg: { width: 28, height: 28, borderRadius: 14 },
  badgeTapHint: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EEE8DC",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  badgeTapHintTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 13 },
  badgeWrap: {
    width: "47%",
    borderRadius: 20,
    overflow: "hidden",
    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    aspectRatio: 1.55, // compact badge shape (less vertical space)
  },
  badgeWrapLocked: {
    shadowOpacity: 0,
    elevation: 0,
  },
  badgeGrad: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 10,
    overflow: "hidden",
    position: "relative",
    gap: 6,
  },
  badgeShine: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 70,
    height: 120,
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ rotate: "28deg" }],
    borderRadius: 8,
  },
  badgeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  badgeEmoji: { fontSize: 24 },
  masteredStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  masteredTxt: { fontFamily: fonts.extra, fontSize: 8, letterSpacing: 0.7 },
  badgeTitle: { fontFamily: fonts.extra, color: colors.white, fontSize: 12, textAlign: "center" },
  badgeStars: { flexDirection: "row", gap: 2 },
  badgeStar: { fontSize: 10, color: "rgba(255,255,255,0.85)" },
  badgeLocked: {
    backgroundColor: "#F0EDE8",
    borderWidth: 2,
    borderColor: "#E4D9C6",
    borderRadius: 20,
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 10,
    gap: 6,
    borderStyle: "dashed",
  },
  badgeLockIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E4D9C6",
  },
  badgeLockedName: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowLabel: { fontFamily: fonts.semi, color: colors.navy, fontSize: 14 },
  parentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.navy,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  parentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  parentTitle: { fontFamily: fonts.extra, color: colors.white, fontSize: 15 },
  parentSub: { fontFamily: fonts.medium, color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 2 },
});
