import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, Alert, Modal, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BouncePress } from "@/components/game/BouncePress";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { useProgress } from "@/context/ProgressContext";
import { useLayout } from "@/lib/layout";
import { clayWormsDicebearPngUrl, sproutsDicebearPngUrl } from "@/lib/dicebear";
import {
  YARD_SLOT_COUNT,
  yardGardenYield,
  sproutRewardForStreak,
  planetRewardForClassStreak,
} from "@/lib/quests";
import { playSfx } from "@/lib/sfx";
import { colors, fonts } from "@/constants/theme";
import { kidPlantMeta, kidWormMeta } from "@/lib/kidCopy";

export default function HiveGardenScreen() {
  const router = useRouter();
  const { headerTop, padX, activityMax } = useLayout();
  const {
    helloReady,
    readyClassIds,
    harvestReady,
    pendingClaim,
    grantHelloPack,
    grantClassPack,
    harvestYards,
    yards,
    sprouts,
    planets,
    walletSprouts,
    walletWorms,
    plantSprout,
    unplantYard,
    boostYard,
    attendStreak,
    classAttendStreak,
  } = useProgress();

  const [pickYard, setPickYard] = useState<number | null>(null);
  const [pickMode, setPickMode] = useState<"sprout" | "worm" | null>(null);

  const yieldInfo = useMemo(
    () => yardGardenYield({ yards, sprouts, planets }),
    [yards, sprouts, planets]
  );
  const todaySprout = sproutRewardForStreak(Math.max(1, attendStreak || 1));
  const todayWorm = planetRewardForClassStreak(Math.max(1, classAttendStreak || 1));

  const showClaimStrip =
    helloReady || readyClassIds.length > 0 || harvestReady || Boolean(pendingClaim);

  function openPlantPicker(yardIndex: number) {
    if (!walletSprouts.length) {
      Alert.alert("No plants yet", "First tap Get it! on today’s plant. It goes in your bag.");
      return;
    }
    setPickYard(yardIndex);
    setPickMode("sprout");
  }

  function openYardActions(yardIndex: number) {
    const slot = yards.find((y) => y.index === yardIndex);
    if (!slot?.sproutUid) {
      openPlantPicker(yardIndex);
      return;
    }
    Alert.alert("This garden spot", "What do you want to do?", [
      {
        text: "Add a helper worm",
        onPress: () => {
          if (!walletWorms.length) {
            Alert.alert("No helpers yet", "Get a helper from class first. Then come back!");
            return;
          }
          setPickYard(yardIndex);
          setPickMode("worm");
        },
      },
      {
        text: "Take plant out",
        style: "destructive",
        onPress: () => {
          unplantYard(yardIndex);
          playSfx("tap");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function claimHello() {
    playSfx("fanfare");
    grantHelloPack();
  }

  function claimClass(classId: string) {
    playSfx("fanfare");
    grantClassPack(classId);
  }

  function claimHarvest() {
    playSfx("fanfare");
    const ok = harvestYards();
    if (!ok) Alert.alert("Not yet", "Put a plant in a garden spot first. Then pick Buzz!");
  }

  function pickItem(uid: string) {
    if (pickYard == null || !pickMode) return;
    const ok =
      pickMode === "sprout" ? plantSprout(uid, pickYard) : boostYard(uid, pickYard);
    if (ok) playSfx("ok");
    setPickYard(null);
    setPickMode(null);
  }

  const pickerItems = pickMode === "sprout" ? walletSprouts : walletWorms;

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          {
            paddingTop: headerTop,
            paddingHorizontal: padX,
            maxWidth: activityMax,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>My Garden</Text>
        <Text style={styles.lead}>
          1 Get a plant · 2 Put it in a spot · 3 Pick Buzz!
        </Text>

        {showClaimStrip ? (
          <View style={styles.claimStrip}>
            {helloReady ? (
              <View style={styles.claimRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.claimTitle}>Today’s plant</Text>
                  <Text style={styles.claimSub} numberOfLines={1}>
                    {todaySprout.label} · get +{todaySprout.points} Buzz
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>1</Text>
                </View>
                <BouncePress sound={false} onPress={claimHello} style={styles.claimBtn}>
                  <Text style={styles.claimBtnTxt}>Get it!</Text>
                </BouncePress>
              </View>
            ) : null}

            {readyClassIds.map((classId) => (
              <View key={classId} style={styles.claimRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.claimTitle}>Class helper</Text>
                  <Text style={styles.claimSub} numberOfLines={1}>
                    {todayWorm.label} · get +{todayWorm.points} Buzz
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>1</Text>
                </View>
                <BouncePress sound={false} onPress={() => claimClass(classId)} style={styles.claimBtn}>
                  <Text style={styles.claimBtnTxt}>Get it!</Text>
                </BouncePress>
              </View>
            ))}

            {harvestReady ? (
              <View style={styles.claimRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.claimTitle}>Pick Buzz!</Text>
                  <Text style={styles.claimSub} numberOfLines={1}>
                    Your garden made +{yieldInfo.finalPoints} Buzz
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>1</Text>
                </View>
                <BouncePress sound={false} onPress={claimHarvest} style={styles.claimBtn}>
                  <Text style={styles.claimBtnTxt}>Pick!</Text>
                </BouncePress>
              </View>
            ) : null}

            {pendingClaim ? (
              <View style={styles.claimRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.claimTitle}>Gift waiting!</Text>
                  <Text style={styles.claimSub} numberOfLines={1}>
                    {pendingClaim.kid} · tap OPEN on the big card
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>1</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.section}>Garden spots</Text>
        <View style={styles.grid}>
          {Array.from({ length: YARD_SLOT_COUNT }, (_, index) => {
            const slot = yards.find((y) => y.index === index) || { index, wormUids: [] };
            const sprout = sprouts.find((s) => s.uid === slot.sproutUid);
            const worms = (slot.wormUids || [])
              .map((uid) => planets.find((p) => p.uid === uid))
              .filter(Boolean);
            const pts = yieldInfo.slotPoints[index] || 0;
            return (
              <BouncePress
                key={index}
                sound="tap"
                onPress={() => openYardActions(index)}
                style={[styles.slot, sprout && styles.slotPlanted]}
              >
                {sprout ? (
                  <>
                    <Image
                      source={{
                        uri: sproutsDicebearPngUrl({
                          seed: `${sprout.id}|${sprout.claimedAt}`,
                          size: 72,
                        }),
                      }}
                      style={styles.slotImg}
                    />
                    <Text style={styles.slotName} numberOfLines={1}>
                      {sprout.label}
                    </Text>
                    {worms.length ? (
                      <View style={styles.wormRow}>
                        {worms.slice(0, 3).map((w) =>
                          w ? (
                            <Image
                              key={w.uid}
                              source={{
                                uri: clayWormsDicebearPngUrl({
                                  seed: `${w.id}|${w.claimedAt}`,
                                  size: 28,
                                }),
                              }}
                              style={styles.wormMini}
                            />
                          ) : null
                        )}
                      </View>
                    ) : (
                      <Text style={styles.slotHint}>Tap · add helper</Text>
                    )}
                    <Text style={styles.slotPts}>+{pts} Buzz</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="leaf-outline" size={22} color={colors.muted} />
                    <Text style={styles.seedMe}>Tap to plant</Text>
                  </>
                )}
              </BouncePress>
            );
          })}
        </View>

        <View style={styles.harvestCard}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.harvestTitle}>Buzz from your garden</Text>
            <Text style={styles.harvestSub}>
              {yieldInfo.plantedCount
                ? `${yieldInfo.plantedCount} plant${yieldInfo.plantedCount === 1 ? "" : "s"} growing · +${yieldInfo.finalPoints} Buzz`
                : "Put a plant in a spot to grow Buzz"}
            </Text>
          </View>
          <BouncePress
            sound={false}
            onPress={claimHarvest}
            disabled={!harvestReady}
            style={[styles.harvestBtn, !harvestReady && styles.harvestBtnOff]}
          >
            <Text style={[styles.harvestBtnTxt, !harvestReady && styles.dim]}>Pick Buzz!</Text>
          </BouncePress>
        </View>

        <BouncePress sound="tap" onPress={() => router.push("/(main)/account")} style={styles.walletNote}>
          <Ionicons name="wallet-outline" size={16} color={colors.navy} />
          <Text style={styles.walletNoteTxt}>
            Your bag · {walletSprouts.length} plants · {walletWorms.length} helpers
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </BouncePress>
      </ScrollView>

      <Modal visible={pickMode != null} transparent animationType="fade" onRequestClose={() => setPickMode(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickMode(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {pickMode === "sprout" ? "Choose a plant" : "Choose a helper"}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {pickerItems.map((item) => (
                <BouncePress
                  key={item.uid}
                  sound="tap"
                  onPress={() => pickItem(item.uid)}
                  style={styles.pickRow}
                >
                  <Image
                    source={{
                      uri:
                        pickMode === "sprout"
                          ? sproutsDicebearPngUrl({ seed: `${item.id}|${item.claimedAt}`, size: 48 })
                          : clayWormsDicebearPngUrl({ seed: `${item.id}|${item.claimedAt}`, size: 48 }),
                    }}
                    style={styles.pickImg}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.pickName}>{item.label}</Text>
                    <Text style={styles.pickMeta}>
                      {pickMode === "sprout"
                        ? kidPlantMeta({ rarity: item.rarity, seedPower: "seedPower" in item ? item.seedPower : undefined })
                        : kidWormMeta({ rarity: item.rarity, boostPct: "boostPct" in item ? item.boostPct : undefined })}
                    </Text>
                  </View>
                </BouncePress>
              ))}
            </ScrollView>
            <BouncePress sound={false} onPress={() => setPickMode(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Cancel</Text>
            </BouncePress>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  body: { paddingBottom: 36 },
  screenTitle: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy },
  lead: { fontFamily: fonts.medium, color: colors.muted, marginTop: 4, marginBottom: 14, fontSize: 13 },
  claimStrip: {
    gap: 8,
    marginBottom: 16,
    backgroundColor: "#FFFBF2",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F5C400",
    padding: 10,
  },
  claimRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  claimTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 14 },
  claimSub: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, marginTop: 1 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.nameRed,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeTxt: { fontFamily: fonts.extra, color: colors.white, fontSize: 10 },
  claimBtn: {
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  claimBtnTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 13 },
  section: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  slot: {
    width: "47%",
    minHeight: 132,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EEE8DC",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 4,
  },
  slotPlanted: {
    borderStyle: "solid",
    borderColor: "#BFE4C9",
    backgroundColor: "#EAF8EE",
  },
  slotImg: { width: 56, height: 56, borderRadius: 16 },
  slotName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12 },
  slotHint: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10 },
  slotPts: { fontFamily: fonts.extra, color: colors.speak, fontSize: 12 },
  seedMe: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12, marginTop: 4 },
  wormRow: { flexDirection: "row", gap: 4, marginTop: 2 },
  wormMini: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#EAF2FF" },
  harvestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EEE8DC",
    padding: 14,
    marginBottom: 12,
  },
  harvestTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  harvestSub: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12, marginTop: 2 },
  harvestBtn: {
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  harvestBtnOff: { backgroundColor: "#EEE8DC" },
  harvestBtnTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12 },
  walletNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  walletNoteTxt: { flex: 1, fontFamily: fonts.bold, color: colors.navy, fontSize: 12 },
  dim: { color: colors.muted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,31,77,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFDF8",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    paddingBottom: 28,
  },
  modalTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 17, marginBottom: 10 },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE8DC",
  },
  pickImg: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF5EE" },
  pickName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 14 },
  pickMeta: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, marginTop: 1 },
  modalClose: { alignItems: "center", paddingTop: 14 },
  modalCloseTxt: { fontFamily: fonts.bold, color: colors.muted, fontSize: 14 },
});
