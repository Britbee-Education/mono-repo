import { Modal, View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radii } from "@/constants/theme";
import { LiveCountdownBlocks } from "@/components/game/LiveCountdown";
import { clayWormsDicebearPngUrl, sproutsDicebearPngUrl } from "@/lib/dicebear";
import {
  DAILY_PACK_SCHEDULE,
  CLASS_PACK_SCHEDULE,
  packDayEntry,
  classPackDayEntry,
  planetRewardForClassStreak,
  sproutRewardForStreak,
  gardenYield,
  gardenBedsFromSprouts,
  wormBoostersFromCollection,
  type PackDay,
} from "@/lib/quests";
import { kidRarity } from "@/lib/kidCopy";

const RARITY_COLOR: Record<string, string> = {
  common: "#5B8DEF",
  rare: "#9B5DE5",
  epic: "#F5A623",
};

function DayChip({
  entry,
  current,
  past,
  seed,
  kind,
}: {
  entry: PackDay;
  current: boolean;
  past: boolean;
  seed: string;
  kind: "sprout" | "worm";
}) {
  const uri =
    kind === "sprout"
      ? sproutsDicebearPngUrl({ seed, size: 56 })
      : clayWormsDicebearPngUrl({ seed, size: 56 });
  const pts = entry.total ?? entry.points + (entry.bonus || 0);

  return (
    <View style={[styles.chip, current && styles.chipNow, past && styles.chipPast]}>
      <View style={[styles.chipAvatar, current && styles.chipAvatarNow]}>
        <Image source={{ uri }} style={styles.chipImg} />
        {past ? (
          <View style={styles.chipCheck}>
            <Ionicons name="checkmark" size={10} color={colors.white} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.chipDay, current && styles.chipDayNow]} numberOfLines={1}>
        {entry.label.replace(/^Day\s+/i, "D")}
      </Text>
      <Text style={[styles.chipPts, current && styles.chipPtsNow]}>+{pts}</Text>
    </View>
  );
}

export function PackScheduleModal({
  visible,
  onClose,
  kind,
  streak,
  sprouts = [],
  planets = [],
  claimedToday = false,
}: {
  visible: boolean;
  onClose: () => void;
  kind: "daily" | "class";
  streak: number;
  sprouts?: { id: string; label: string; points: number; claimedAt: string; rarity?: string; seedPower?: number }[];
  planets?: { id: string; label: string; points: number; claimedAt: string; rarity?: string; boostPct?: number }[];
  claimedToday?: boolean;
}) {
  const isDaily = kind === "daily";
  const schedule = isDaily ? DAILY_PACK_SCHEDULE : CLASS_PACK_SCHEDULE;
  const day = Math.max(1, streak || 1);
  const current = isDaily ? packDayEntry(day) : classPackDayEntry(day);
  const featured = isDaily ? sproutRewardForStreak(day) : planetRewardForClassStreak(day);
  const previewSprouts =
    isDaily && !claimedToday ? [...sprouts, featured] : sprouts;
  const previewWorms =
    !isDaily && !claimedToday ? [...planets, featured] : planets;
  const beds = gardenBedsFromSprouts(previewSprouts);
  const boosters = wormBoostersFromCollection(previewWorms);
  const basePts = current.total ?? current.points + (current.bonus || 0);
  const yieldNow = gardenYield({
    basePoints: basePts,
    sprouts: previewSprouts,
    planets: previewWorms,
  });
  const rarityColor = RARITY_COLOR[featured.rarity] || "#5B8DEF";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.topBar}>
            <Text style={styles.title}>{isDaily ? "Today’s Plant" : "Class Helpers"}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={[styles.hero, isDaily ? styles.heroSprout : styles.heroWorm]}>
              <View style={styles.heroRing}>
                <Image
                  source={{
                    uri: isDaily
                      ? sproutsDicebearPngUrl({ seed: featured.id, size: 160 })
                      : clayWormsDicebearPngUrl({ seed: featured.id, size: 160 }),
                  }}
                  style={styles.heroAvatar}
                />
              </View>
              <Text style={styles.heroName}>{featured.label}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.rarityPill, { backgroundColor: rarityColor }]}>
                  <Text style={styles.rarityTxt}>{kidRarity(featured.rarity)}</Text>
                </View>
                <View style={styles.ptsPill}>
                  <Text style={styles.ptsPillTxt}>+{yieldNow.finalPoints} Buzz</Text>
                </View>
              </View>
              <Text style={styles.streakLine}>
                {isDaily
                  ? streak > 0
                    ? `Day ${streak} · keep coming back!`
                    : "Come play today to get your plant"
                  : streak > 0
                    ? `${streak} class days · helpers get better!`
                    : "Go to class to get a helper worm"}
              </Text>
            </View>

            <View style={styles.yieldCard}>
              <Text style={styles.yieldTitle}>Buzz you can get</Text>
              <Text style={styles.pathHint}>
                Plants grow Buzz. Helper worms make even more!
              </Text>
              <View style={[styles.yieldRow, styles.yieldTotal]}>
                <Text style={styles.yieldTotalLabel}>You get</Text>
                <Text style={styles.yieldTotalVal}>{yieldNow.finalPoints} Buzz</Text>
              </View>
              <View style={styles.yieldRow}>
                <Text style={styles.yieldLabel}>From the gift</Text>
                <Text style={styles.yieldVal}>+{yieldNow.basePoints}</Text>
              </View>
              <View style={styles.yieldRow}>
                <Text style={styles.yieldLabel}>From your plants</Text>
                <Text style={styles.yieldVal}>+{yieldNow.seedBonus}</Text>
              </View>
              <View style={styles.yieldRow}>
                <Text style={styles.yieldLabel}>From helper worms</Text>
                <Text style={styles.yieldVal}>{yieldNow.wormBoostPct ? "more Buzz!" : "none yet"}</Text>
              </View>
            </View>

            <View style={styles.timerCard}>
              {claimedToday ? (
                <LiveCountdownBlocks label={isDaily ? "Next plant in" : "Next helper in"} />
              ) : (
                <View style={styles.readyBlock}>
                  <Text style={styles.readyKicker}>Available now</Text>
                  <Text style={styles.readyTitle}>{isDaily ? "Ready to get" : "Ready to get"}</Text>
                  <Text style={styles.readySub}>
                    {isDaily
                      ? "Tap Get it! to put this plant in your bag."
                      : "Tap Get it! to put this helper in your bag."}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Your plants</Text>
                <Text style={styles.sectionMeta}>{beds.length} kinds</Text>
              </View>
              <Text style={styles.pathHint}>
                More plants = more Buzz. Same plant again = even better!
              </Text>
              {beds.length ? (
                <View style={styles.bedGrid}>
                  {beds.map((bed) => (
                    <View key={bed.id} style={styles.bedCard}>
                      <Image
                        source={{ uri: sproutsDicebearPngUrl({ seed: bed.id, size: 64 }) }}
                        style={styles.bedImg}
                      />
                      <Text style={styles.bedName} numberOfLines={1}>
                        {bed.label}
                      </Text>
                      <Text style={styles.bedMeta}>
                        You have {bed.count} · +{bed.yieldBonus} Buzz
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyTxt}>Get today’s plant to start your garden.</Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Your helpers</Text>
                <Text style={styles.sectionMeta}>{boosters.length} kinds</Text>
              </View>
              <Text style={styles.pathHint}>
                Helper worms make your garden grow more Buzz.
              </Text>
              {boosters.length ? (
                <View style={styles.bedGrid}>
                  {boosters.map((w) => (
                    <View key={w.id} style={[styles.bedCard, styles.wormCard]}>
                      <Image
                        source={{ uri: clayWormsDicebearPngUrl({ seed: w.id, size: 64 }) }}
                        style={styles.bedImg}
                      />
                      <Text style={styles.bedName} numberOfLines={1}>
                        {w.label}
                      </Text>
                      <Text style={styles.bedMeta}>
                        You have {w.count} · helps grow
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyTxt}>Go to class to get helper worms.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Keep-going path</Text>
              <Text style={styles.pathHint}>Come back every day. Miss a day and you start over.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pathRow}>
                {schedule.map((entry) => {
                  const reward = isDaily
                    ? sproutRewardForStreak(entry.day)
                    : planetRewardForClassStreak(entry.day);
                  return (
                    <DayChip
                      key={entry.day}
                      entry={entry}
                      current={entry.day === current.day}
                      past={entry.day < current.day}
                      seed={reward.id}
                      kind={isDaily ? "sprout" : "worm"}
                    />
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ height: 28 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 24, 56, 0.55)",
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: "#FFFDF9",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5DCC8",
    marginBottom: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  title: { fontFamily: fonts.extra, color: colors.navy, fontSize: 20 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3EEE2",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  hero: {
    alignItems: "center",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  heroSprout: { backgroundColor: "#EAF7EE" },
  heroWorm: { backgroundColor: "#F3EDE4" },
  heroRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: "#1A2B5F",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroAvatar: { width: 92, height: 92, borderRadius: 46 },
  heroName: {
    marginTop: 12,
    fontFamily: fonts.extra,
    color: colors.navy,
    fontSize: 22,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  rarityPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rarityTxt: {
    fontFamily: fonts.bold,
    color: colors.white,
    fontSize: 11,
    textTransform: "capitalize",
  },
  ptsPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.yellow,
  },
  ptsPillTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12 },
  streakLine: {
    marginTop: 10,
    fontFamily: fonts.medium,
    color: colors.ink,
    fontSize: 13,
    textAlign: "center",
  },
  yieldCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDE6D6",
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  yieldTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15, marginBottom: 2 },
  yieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  yieldLabel: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, flex: 1, paddingRight: 8 },
  yieldVal: { fontFamily: fonts.bold, color: colors.navy, fontSize: 13 },
  yieldTotal: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EBE0",
  },
  yieldTotalLabel: { fontFamily: fonts.extra, color: colors.navy, fontSize: 14 },
  yieldTotalVal: { fontFamily: fonts.extra, color: colors.speak, fontSize: 16 },
  timerCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDE6D6",
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: "center",
  },
  readyBlock: { alignItems: "center", gap: 4 },
  readyKicker: {
    fontFamily: fonts.bold,
    color: colors.speak,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  readyTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 18 },
  readySub: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 2,
  },
  section: { marginBottom: 16 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16 },
  sectionMeta: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12 },
  pathHint: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  bedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bedCard: {
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: "#F4FBF6",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCEFDF",
  },
  wormCard: { backgroundColor: "#F7F2EA", borderColor: "#E8DFD0" },
  bedImg: { width: 48, height: 48, borderRadius: 24 },
  bedName: { marginTop: 6, fontFamily: fonts.bold, color: colors.navy, fontSize: 12, textAlign: "center" },
  bedMeta: { marginTop: 2, fontFamily: fonts.medium, color: colors.muted, fontSize: 11 },
  emptyTxt: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  pathRow: { gap: 8, paddingVertical: 4 },
  chip: { width: 64, alignItems: "center", opacity: 0.55 },
  chipNow: { opacity: 1 },
  chipPast: { opacity: 0.85 },
  chipAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3EEE2",
    alignItems: "center",
    justifyContent: "center",
  },
  chipAvatarNow: { borderWidth: 2, borderColor: colors.yellow, backgroundColor: colors.white },
  chipImg: { width: 40, height: 40, borderRadius: 20 },
  chipCheck: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.speak,
    alignItems: "center",
    justifyContent: "center",
  },
  chipDay: { marginTop: 4, fontFamily: fonts.bold, color: colors.muted, fontSize: 10 },
  chipDayNow: { color: colors.navy },
  chipPts: { fontFamily: fonts.medium, color: colors.muted, fontSize: 10 },
  chipPtsNow: { color: colors.navy, fontFamily: fonts.extra },
});
