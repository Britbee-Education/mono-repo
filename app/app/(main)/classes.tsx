import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BouncePress } from "@/components/game/BouncePress";
import { HiveAvatar } from "@/components/hive/HiveAvatar";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { EmptyBee } from "@/components/ui/EmptyBee";
import { useNotify } from "@/context/NotifyContext";
import { useProgress } from "@/context/ProgressContext";
import { useLayout } from "@/lib/layout";
import { api, type KidClass } from "@/lib/api";
import { CLASS_PACK, classPackKey } from "@/lib/quests";
import { NextUnlockLabel } from "@/components/game/NextUnlockLabel";
import { playSfx } from "@/lib/sfx";
import { colors, fonts } from "@/constants/theme";

function classWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Time soon";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function startsIn(iso: string) {
  const ms = Date.parse(iso) - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "Starting now";
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `Starts in ${m} min`;
  const h = Math.floor(m / 60);
  return `Starts in ${h}h ${m % 60}m`;
}

export default function ClassesScreen() {
  const router = useRouter();
  const { headerTop, padX, activityMax } = useLayout();
  const { refresh: refreshInbox } = useNotify();
  const { grantClassPack, packsToday } = useProgress();
  const [classes, setClasses] = useState<KidClass[]>([]);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const data = await api.classes();
    setClasses(data.classes || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshInbox();
    }, [load, refreshInbox])
  );

  useEffect(() => {
    const t = setInterval(() => {
      void load();
      setTick((n) => n + 1);
    }, 8_000);
    return () => clearInterval(t);
  }, [load]);

  function openClass(cls: KidClass) {
    playSfx(cls.status === "live" ? "buzz" : "tap");
    router.push(`/class/${cls.id}`);
  }

  function collectBonus(cls: KidClass) {
    playSfx("fanfare");
    void (async () => {
      await api.classClaim(cls.id).catch(() => undefined);
      grantClassPack(cls.id);
      void load();
    })();
  }

  const live = useMemo(() => classes.filter((c) => c.status === "live"), [classes]);
  const upcoming = useMemo(() => classes.filter((c) => c.status === "scheduled"), [classes]);
  const past = useMemo(() => classes.filter((c) => c.status === "ended").slice().reverse().slice(0, 6), [classes]);
  const empty = !classes.length;

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: headerTop, paddingHorizontal: padX, maxWidth: activityMax, width: "100%", alignSelf: "center" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Classes</Text>
        <Text style={styles.lead}>Learn with your teacher. Join to get a helper worm!</Text>

        {live.length ? <Text style={styles.section}>Live now</Text> : null}
        {live.map((cls) => (
          <BouncePress key={cls.id} sound={false} onPress={() => openClass(cls)} style={[styles.card, styles.live]}>
            <View style={styles.liveDot} />
            <HiveAvatar name={cls.guideName} size={48} maya />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.kicker}>LIVE · {cls.guideName}</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {cls.title}
              </Text>
              <Text style={styles.cardSub} numberOfLines={2}>
                {packsToday.includes(classPackKey(cls.id)) ? (
                  <NextUnlockLabel kind="pack" style={styles.cardSub} />
                ) : (
                  `${cls.classKind === "individual" ? "1:1" : "Group"} · ${cls.durationMin} min · +${CLASS_PACK} Buzz Points pack`
                )}
              </Text>
            </View>
            <Text style={styles.go}>Join</Text>
          </BouncePress>
        ))}

        {upcoming.length ? <Text style={styles.section}>Coming up</Text> : null}
        {upcoming.map((cls) => (
          <BouncePress key={cls.id} sound={false} onPress={() => openClass(cls)} style={styles.card}>
            <HiveAvatar name={cls.guideName} size={48} maya />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.kicker}>{startsIn(cls.startsAt)}</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {cls.title}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {classWhen(cls.startsAt)} · {cls.classKind === "individual" ? "1:1" : "Group"} · {cls.durationMin} min · {cls.guideName}
              </Text>
            </View>
            <Text style={styles.wait}>Wait</Text>
          </BouncePress>
        ))}

        {past.length ? <Text style={styles.section}>Earlier</Text> : null}
        {past.map((cls) => {
          const canCollect = cls.joinedByMe && !packsToday.includes(classPackKey(cls.id));
          return (
          <BouncePress
            key={cls.id}
            sound={false}
            disabled={!canCollect}
            onPress={canCollect ? () => collectBonus(cls) : undefined}
            style={[styles.card, styles.past, canCollect && styles.collect]}
          >
            <View style={[styles.icon, { backgroundColor: canCollect ? "#FFF4D6" : "#EEF1F6" }]}>
              <Ionicons name={canCollect ? "gift" : "checkmark"} size={18} color={canCollect ? colors.listen : colors.muted} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.kicker}>{canCollect ? "Get helper!" : "Ended"}</Text>
              <Text style={[styles.cardTitle, !canCollect && styles.dim]} numberOfLines={1}>
                {cls.title}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {canCollect
                  ? `Tap Get it! · +${CLASS_PACK} Buzz · helper worm · ${cls.guideName}`
                  : `${classWhen(cls.startsAt)} · ${cls.guideName}`}
              </Text>
            </View>
            {canCollect ? <Text style={styles.go}>Open</Text> : null}
          </BouncePress>
          );
        })}

        {empty ? (
          <EmptyBee
            title="No live class yet"
            message="Your mentor will start a class. Come back and tap Join."
            size={120}
            style={{ paddingTop: 48 }}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  body: { paddingBottom: 28 },
  screenTitle: { fontFamily: fonts.extra, fontSize: 22, color: colors.navy },
  lead: { fontFamily: fonts.medium, color: colors.muted, marginTop: 4, marginBottom: 14, fontSize: 13 },
  section: { marginTop: 18, marginBottom: 8, fontFamily: fonts.bold, color: colors.navy, fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEE8DC",
  },
  live: { borderColor: "#E53935", backgroundColor: "#FFF5F4" },
  past: { opacity: 0.78 },
  collect: { opacity: 1, borderColor: colors.listen, backgroundColor: "#FFFBF2" },
  liveDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.nameRed,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: { fontFamily: fonts.bold, color: colors.listen, fontSize: 11, marginBottom: 2 },
  cardTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  cardSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  dim: { color: colors.muted },
  go: { fontFamily: fonts.extra, color: colors.nameRed, fontSize: 14 },
  wait: { fontFamily: fonts.bold, color: colors.muted, fontSize: 13 },
});
