import { useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BouncePress } from "@/components/game/BouncePress";
import { BackButton } from "@/components/ui/BackButton";
import { PillButton } from "@/components/ui/PillButton";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { useAuth } from "@/context/AuthContext";
import { useHive } from "@/context/HiveContext";
import { useLayout } from "@/lib/layout";
import { BACK_SWATCH, DEFAULT_LOOK, EYE_LABEL, GLASS_LABEL, HAT_EMOJI, HAT_LABEL, randomLook, resolveLook, type BeeLook } from "@/lib/look";
import { beeDicebearPngUrl } from "@/lib/dicebear";
import { playSfx } from "@/lib/sfx";
import { colors, fonts } from "@/constants/theme";
import { BEE_BACKS, BEE_EYES, BEE_GLASSES, BEE_HATS } from "@britbee/shared";

function pretty(label: string) {
  return label.replace(/\b\w/g, (m) => m.toUpperCase());
}

function nextInList<T extends string>(list: readonly T[], value: T, dir: 1 | -1) {
  const idx = list.indexOf(value);
  const safe = idx < 0 ? 0 : idx;
  const next = (safe + dir + list.length) % list.length;
  return list[next];
}

export default function AvatarStudioScreen() {
  const { user, updateProfile } = useAuth();
  const { refresh } = useHive();
  const { headerTop, padX, activityMax } = useLayout();

  const saved = resolveLook(user?.child?.avatar as BeeLook | undefined, 4);
  const [look, setLook] = useState<BeeLook>(saved);
  const [busy, setBusy] = useState(false);
  const [faceTab, setFaceTab] = useState<"eyes" | "brows" | "mouth">("eyes");

  async function save() {
    setBusy(true);
    try {
      await updateProfile({ child: { ...user?.child, avatar: look } });
      void refresh();
      playSfx("star");
      Alert.alert("Saved!", "Your avatar is ready for your hive.");
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  const previewSize = 168;
  const imgUri = beeDicebearPngUrl({ look, hue: 4, size: previewSize });
  const selectedEyes = pretty(EYE_LABEL[look.eyes] || look.eyes);
  const selectedBrow = pretty(GLASS_LABEL[look.glasses] || look.glasses);
  const selectedMouth = pretty(HAT_LABEL[look.hat] || look.hat);

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <View style={[styles.head, { paddingTop: headerTop, paddingHorizontal: padX }]}>
        <BackButton fallback="/(main)/account" />
        <Text style={styles.title}>Avatar Studio</Text>
        <BouncePress
          sound="star"
          onPress={() => {
            setLook(randomLook());
            playSfx("tap");
          }}
          style={styles.surprise}
        >
          <Text style={styles.surpriseTxt}>Random Look</Text>
        </BouncePress>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingHorizontal: padX, maxWidth: activityMax, width: "100%", alignSelf: "center" },
        ]}
      >
        <LinearGradient colors={["#15285A", "#1A2B5F", "#243A78"]} style={styles.stage}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerBR} />

          <View style={[styles.previewFrame, { backgroundColor: BACK_SWATCH[look.back] }]}>
            <Image source={{ uri: imgUri }} style={styles.previewImg} resizeMode="cover" />
          </View>

          <View style={styles.stageCopy}>
            <Text style={styles.stageName} numberOfLines={1}>
              {user?.child?.childName?.split(" ")[0] || "Bee"}
            </Text>
            <Text style={styles.stageSub}>Build your bee look, then save your style.</Text>
            <View style={styles.stageTags}>
              <View style={styles.stageTag}><Text style={styles.stageTagTxt}>Eyes: {selectedEyes}</Text></View>
              <View style={styles.stageTag}><Text style={styles.stageTagTxt}>Eyebrows: {selectedBrow}</Text></View>
              <View style={styles.stageTag}><Text style={styles.stageTagTxt}>Mouth: {selectedMouth}</Text></View>
            </View>
          </View>
        </LinearGradient>

        {/* Background picker */}
        <View style={[styles.section, styles.sectionCard]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEmoji}>🎨</Text>
            <Text style={styles.sectionTitle}>Step 1 · Pick a Background</Text>
          </View>
          <View style={styles.palette}>
            {BEE_BACKS.map((id) => {
              const on = look.back === id;
              return (
                <BouncePress
                  key={id}
                  sound={false}
                  onPress={() => setLook((prev) => ({ ...prev, back: id } as BeeLook))}
                  style={[styles.colorChip, on && styles.colorChipOn]}
                >
                  <View style={[styles.colorDot, { backgroundColor: BACK_SWATCH[id] }]} />
                </BouncePress>
              );
            })}
          </View>
        </View>

        {/* Configurator controls */}
        <View style={[styles.section, styles.sectionCard]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEmoji}>😄</Text>
            <Text style={styles.sectionTitle}>Step 2 · Face Configurator</Text>
          </View>
          <View style={styles.faceLayout}>
            {/* Sidebar */}
            <View style={styles.faceSidebar}>
              <BouncePress
                sound={false}
                onPress={() => setFaceTab("eyes")}
                style={[styles.faceTab, faceTab === "eyes" && styles.faceTabOn]}
              >
                <Text style={[styles.faceTabTxt, faceTab === "eyes" && styles.faceTabTxtOn]}>Eyes</Text>
              </BouncePress>
              <BouncePress
                sound={false}
                onPress={() => setFaceTab("brows")}
                style={[styles.faceTab, faceTab === "brows" && styles.faceTabOn]}
              >
                <Text style={[styles.faceTabTxt, faceTab === "brows" && styles.faceTabTxtOn]}>Eyebrows</Text>
              </BouncePress>
              <BouncePress
                sound={false}
                onPress={() => setFaceTab("mouth")}
                style={[styles.faceTab, faceTab === "mouth" && styles.faceTabOn]}
              >
                <Text style={[styles.faceTabTxt, faceTab === "mouth" && styles.faceTabTxtOn]}>Mouth</Text>
              </BouncePress>
            </View>

            {/* Active panel */}
            <View style={styles.facePanel}>
              {faceTab === "eyes" ? (
                <View style={styles.configRow}>
                  <View style={styles.configHead}>
                    <Text style={styles.subSectionTitle}>Eye expression</Text>
                    <Text style={styles.configValue}>{pretty(EYE_LABEL[look.eyes])}</Text>
                  </View>
                  <View style={styles.configStepper}>
                    <BouncePress
                      sound={false}
                      onPress={() => setLook((prev) => ({ ...prev, eyes: nextInList(BEE_EYES, prev.eyes, -1) } as BeeLook))}
                      style={styles.stepBtn}
                    >
                      <Text style={styles.stepTxt}>{"<"}</Text>
                    </BouncePress>
                    <View style={styles.configPreview}>
                      <Text style={styles.configPreviewTxt}>Expression</Text>
                    </View>
                    <BouncePress
                      sound={false}
                      onPress={() => setLook((prev) => ({ ...prev, eyes: nextInList(BEE_EYES, prev.eyes, 1) } as BeeLook))}
                      style={styles.stepBtn}
                    >
                      <Text style={styles.stepTxt}>{">"}</Text>
                    </BouncePress>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionStrip}>
                    {BEE_EYES.map((id) => {
                      const on = look.eyes === id;
                      return (
                        <BouncePress
                          key={id}
                          sound={false}
                          onPress={() => setLook((prev) => ({ ...prev, eyes: id } as BeeLook))}
                          style={[styles.optionChip, on && styles.optionChipOn]}
                        >
                          <Text style={[styles.optionChipTxt, on && styles.optionChipTxtOn]}>{EYE_LABEL[id]}</Text>
                        </BouncePress>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {faceTab === "brows" ? (
                <View style={styles.configRow}>
                  <View style={styles.configHead}>
                    <Text style={styles.subSectionTitle}>Eyebrow style</Text>
                    <Text style={styles.configValue}>{pretty(GLASS_LABEL[look.glasses])}</Text>
                  </View>
                  <View style={styles.configStepper}>
                    <BouncePress
                      sound={false}
                      onPress={() => setLook((prev) => ({ ...prev, glasses: nextInList(BEE_GLASSES, prev.glasses, -1) } as BeeLook))}
                      style={styles.stepBtn}
                    >
                      <Text style={styles.stepTxt}>{"<"}</Text>
                    </BouncePress>
                    <View style={styles.configPreview}>
                      <Text style={styles.configPreviewTxt}>Style</Text>
                    </View>
                    <BouncePress
                      sound={false}
                      onPress={() => setLook((prev) => ({ ...prev, glasses: nextInList(BEE_GLASSES, prev.glasses, 1) } as BeeLook))}
                      style={styles.stepBtn}
                    >
                      <Text style={styles.stepTxt}>{">"}</Text>
                    </BouncePress>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionStrip}>
                    {BEE_GLASSES.map((id) => {
                      const on = look.glasses === id;
                      return (
                        <BouncePress
                          key={id}
                          sound={false}
                          onPress={() => setLook((prev) => ({ ...prev, glasses: id } as BeeLook))}
                          style={[styles.optionChip, on && styles.optionChipOn]}
                        >
                          <Text style={[styles.optionChipTxt, on && styles.optionChipTxtOn]}>{GLASS_LABEL[id]}</Text>
                        </BouncePress>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {faceTab === "mouth" ? (
                <View style={styles.configRow}>
                  <View style={styles.configHead}>
                    <Text style={styles.subSectionTitle}>Mouth shape</Text>
                    <Text style={styles.configValue}>{pretty(HAT_LABEL[look.hat])}</Text>
                  </View>
                  <View style={styles.configStepper}>
                    <BouncePress
                      sound={false}
                      onPress={() => setLook((prev) => ({ ...prev, hat: nextInList(BEE_HATS, prev.hat, -1) } as BeeLook))}
                      style={styles.stepBtn}
                    >
                      <Text style={styles.stepTxt}>{"<"}</Text>
                    </BouncePress>
                    <View style={styles.configPreview}>
                      <Text style={styles.configPreviewTxt}>{HAT_EMOJI[look.hat] || "🙂"}</Text>
                    </View>
                    <BouncePress
                      sound={false}
                      onPress={() => setLook((prev) => ({ ...prev, hat: nextInList(BEE_HATS, prev.hat, 1) } as BeeLook))}
                      style={styles.stepBtn}
                    >
                      <Text style={styles.stepTxt}>{">"}</Text>
                    </BouncePress>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionStrip}>
                    {BEE_HATS.map((id) => {
                      const on = look.hat === id;
                      return (
                        <BouncePress
                          key={id}
                          sound={false}
                          onPress={() => setLook((prev) => ({ ...prev, hat: id } as BeeLook))}
                          style={[styles.optionChip, on && styles.optionChipOn]}
                        >
                          <Text style={[styles.optionChipTxt, on && styles.optionChipTxtOn]}>{HAT_LABEL[id]}</Text>
                        </BouncePress>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <PillButton label={busy ? "Saving…" : "Step 3 · Save My Look"} onPress={() => void save()} disabled={busy} />
          <Text style={styles.saveHint}>Your new look shows up in your hive profile.</Text>
        </View>

        <BouncePress sound="tap" onPress={() => setLook(DEFAULT_LOOK)} style={styles.reset}>
          <Text style={styles.resetTxt}>Reset</Text>
        </BouncePress>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  head: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 8 },
  title: { flex: 1, fontFamily: fonts.extra, color: colors.navy, fontSize: 20 },
  surprise: { backgroundColor: colors.yellow, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#E0A800" },
  surpriseTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12 },
  body: { paddingBottom: 36 },

  stage: { borderRadius: 28, paddingTop: 24, paddingBottom: 18, alignItems: "center", marginBottom: 16, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.25)" },
  cornerTL: {
    position: "absolute",
    top: -40,
    left: -60,
    width: 140,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(245,196,0,0.35)",
    transform: [{ rotate: "-25deg" }],
  },
  cornerBR: {
    position: "absolute",
    bottom: -60,
    right: -70,
    width: 160,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(140,82,255,0.28)",
    transform: [{ rotate: "22deg" }],
  },

  previewFrame: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
    position: "relative",
  },
  previewImg: { width: 168, height: 168, borderRadius: 84 },
  sparkle: { position: "absolute" },
  sparkleTxt: { fontSize: 22 },

  stageCopy: { marginTop: 10, alignItems: "center", paddingHorizontal: 12 },
  stageName: { fontFamily: fonts.extra, color: colors.white, fontSize: 18 },
  stageSub: { fontFamily: fonts.medium, color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 2, textAlign: "center" },
  stageTags: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  stageTag: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stageTagTxt: { fontFamily: fonts.bold, color: "rgba(255,255,255,0.92)", fontSize: 10 },

  section: { marginTop: 14 },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEE8DC",
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  subSectionTitle: { fontFamily: fonts.bold, color: colors.navy, fontSize: 13, marginBottom: 8, marginTop: 4 },
  configRow: {
    borderWidth: 1,
    borderColor: "#EEE8DC",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#FCFBF8",
  },
  faceLayout: { flexDirection: "row", gap: 12 },
  faceSidebar: {
    width: 110,
    gap: 8,
  },
  faceTab: {
    borderWidth: 1,
    borderColor: "#EEE8DC",
    backgroundColor: "#FCFBF8",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  faceTabOn: { borderColor: colors.yellow, backgroundColor: "#FFF8E1" },
  faceTabTxt: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12, textAlign: "center" },
  faceTabTxtOn: { color: colors.navy },
  facePanel: { flex: 1, minWidth: 0 },
  configHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  configValue: { fontFamily: fonts.extra, fontSize: 12, color: colors.listen },
  configStepper: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCD6C8",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  configPreview: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8E2D6",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  configPreviewTxt: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12 },
  optionStrip: { gap: 8, paddingRight: 6 },
  optionChip: {
    borderWidth: 1,
    borderColor: "#DDD8CC",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  optionChipOn: { borderColor: colors.yellow, backgroundColor: "#FFF8E1" },
  optionChipTxt: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  optionChipTxtOn: { color: colors.navy },

  palette: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorChip: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#EEE8DC",
    alignItems: "center",
    justifyContent: "center",
  },
  colorChipOn: { borderColor: colors.yellow, backgroundColor: "#FFF8E1" },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "rgba(26,43,95,0.12)" },

  saveHint: { marginTop: 6, textAlign: "center", fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
  reset: { alignSelf: "center", marginTop: 12, padding: 8 },
  resetTxt: { fontFamily: fonts.bold, color: colors.listen, fontSize: 13 },
});
