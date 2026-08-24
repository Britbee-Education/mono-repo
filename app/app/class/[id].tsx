import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { BackButton } from "@/components/ui/BackButton";
import { PillButton } from "@/components/ui/PillButton";
import { HiveAvatar } from "@/components/hive/HiveAvatar";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { EmptyBee } from "@/components/ui/EmptyBee";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";
import { useLayout } from "@/lib/layout";
import { api, liveJoinUrl, type KidClass } from "@/lib/api";
import { playSfx } from "@/lib/sfx";
import { CLASS_PACK, classPackKey } from "@/lib/quests";
import { clearClassResume, readClassResume, writeClassResume } from "@/lib/classResume";
import { NextUnlockLabel } from "@/components/game/NextUnlockLabel";
import { colors, fonts } from "@/constants/theme";

function classWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LiveClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { grantClassPack, packsToday } = useProgress();
  const { headerTop, padX, activityMax } = useLayout();
  const [cls, setCls] = useState<KidClass | null>(null);
  const [missing, setMissing] = useState(false);
  const [joined, setJoined] = useState(false);
  const [rewardQueued, setRewardQueued] = useState(false);
  const me = user?.child?.childName?.split(" ")[0] || user?.name || "Bee";
  const userId = user?.id || "";

  const load = useCallback(async () => {
    if (!id) return;
    const row = await api.classById(String(id));
    if (!row) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setCls(row);
    if (row.joinedByMe) {
      setJoined(true);
      setRewardQueued(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 2_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!cls || !userId) return;
    void (async () => {
      const saved = await readClassResume(userId);
      if (!saved || saved.classId !== cls.id) return;
      setJoined(Boolean(saved.joined));
      setRewardQueued(Boolean(saved.rewardQueued));
    })();
  }, [cls, userId]);

  async function join() {
    if (!cls?.roomUrl) return;
    playSfx("buzz");
    const url = liveJoinUrl(cls.roomUrl, me);
    setJoined(true);
    setRewardQueued(true);
    void api.classJoin(cls.id).catch(() => undefined);
    void writeClassResume(userId, { classId: cls.id, joined: true, rewardQueued: true, savedAt: Date.now() });

    if (Platform.OS === "web") {
      const w = globalThis as unknown as {
        open?: (url?: string, target?: string, features?: string) => Window | null;
        location?: { href: string };
      };
      const popup = w.open?.(url, "_blank", "noopener,noreferrer");
      if (!popup && w.location) w.location.href = url;
      return;
    }

    await WebBrowser.openBrowserAsync(url);
  }

  async function collectBonus() {
    if (!cls) return;
    playSfx("fanfare");
    await api.classClaim(cls.id).catch(() => undefined);
    grantClassPack(cls.id);
    setRewardQueued(false);
    await clearClassResume(userId);
  }

  const canClaim =
    Boolean(cls) &&
    cls!.status === "ended" &&
    joined &&
    !packsToday.includes(classPackKey(cls!.id));

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <View style={[styles.head, { paddingTop: headerTop, paddingHorizontal: padX }]}>
        <BackButton fallback="/(main)/classes" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>{cls?.status === "live" ? "Live class" : "Class"}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {cls?.title || "With your mentor"}
          </Text>
        </View>
      </View>

      <View style={[styles.body, { paddingHorizontal: padX, maxWidth: activityMax, width: "100%", alignSelf: "center" }]}>
        {missing ? (
          <EmptyBee
            title="Class not found"
            message="Ask your mentor to send a new live class."
            size={120}
          />
        ) : !cls ? (
          <Text style={styles.sub}>Opening class…</Text>
        ) : (
          <>
            {/* One mascot only — maya avatar already uses bee.png */}
            <HiveAvatar name={cls.guideName} size={88} maya />
            <Text style={styles.heroTitle}>
              {cls.status === "live"
                ? `${cls.guideName} is live`
                : cls.status === "ended"
                  ? "This class ended"
                  : `Class with ${cls.guideName}`}
            </Text>
            <Text style={styles.sub}>
              {cls.status === "live"
                ? `Turn on your camera and say hi. After class you get a helper worm!`
                : cls.status === "ended"
                  ? packsToday.includes(classPackKey(cls.id))
                    ? "Helper worm is in your bag — add it to a plant in My Garden!"
                    : joined
                      ? "Get your helper worm when you’re ready."
                      : "See you at the next one."
                  : `${classWhen(cls.startsAt)} · ${cls.classKind === "individual" ? "1:1 class" : "Group class"} · ${cls.durationMin} min`}
            </Text>
            {cls.body ? <Text style={styles.note}>{cls.body}</Text> : null}
            {joined && cls.status !== "ended" ? (
              <Text style={styles.wait}>Resume anytime. Bonus unlocks when mentor ends the class.</Text>
            ) : null}

            {cls.status === "live" ? (
              <View style={{ marginTop: 18, width: "100%" }}>
                <PillButton
                  label={
                    packsToday.includes(classPackKey(cls.id))
                      ? joined
                        ? `Re-open ${cls.guideName}`
                        : `Join ${cls.guideName}`
                      : joined
                        ? `Resume · helper after class`
                        : `Join · helper after class`
                  }
                  onPress={() => void join()}
                />
                <Text style={styles.wait}>
                  {packsToday.includes(classPackKey(cls.id)) ? (
                    <NextUnlockLabel kind="pack" style={styles.wait} />
                  ) : joined ? (
                    "Opening / resuming meeting…"
                  ) : Platform.OS === "web" ? (
                    "Opens in a new tab (sign in once if asked)."
                  ) : (
                    "Opening meeting…"
                  )}
                </Text>
              </View>
            ) : cls.status === "scheduled" ? (
              <Text style={styles.wait}>Wait here. Join lights up when class starts.</Text>
            ) : canClaim ? (
              <View style={{ marginTop: 18, width: "100%" }}>
                <PillButton label={`Get helper! · +${CLASS_PACK} Buzz`} onPress={() => void collectBonus()} />
                <Text style={styles.wait}>Goes in your bag — add it to a plant in My Garden.</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 10,
  },
  eyebrow: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11 },
  title: { fontFamily: fonts.extra, color: colors.navy, fontSize: 18 },
  frame: { flex: 1, paddingBottom: 16, minHeight: 0 },
  body: { alignItems: "center", paddingTop: 28 },
  heroTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 22, textAlign: "center", marginTop: 8 },
  sub: { fontFamily: fonts.medium, color: colors.muted, textAlign: "center", marginTop: 6, fontSize: 14 },
  note: { fontFamily: fonts.medium, color: colors.ink, textAlign: "center", marginTop: 12, fontSize: 13, lineHeight: 18 },
  wait: { fontFamily: fonts.bold, color: colors.listen, marginTop: 20, textAlign: "center" },
});
