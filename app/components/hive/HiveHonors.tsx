import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BouncePress } from "@/components/game/BouncePress";
import { HiveAvatar, placeLabel } from "@/components/hive/HiveAvatar";
import { MascotMark } from "@/components/ui/MascotMark";
import type { HiveBee, HivePayload } from "@/lib/api";
import { colors, fonts } from "@/constants/theme";

function monthName() {
  return new Date().toLocaleString("en-IN", { month: "long", timeZone: "Asia/Kolkata" });
}

function medal(place: number) {
  if (place === 1) return { emoji: "🥇", tint: "#F5C400" };
  if (place === 2) return { emoji: "🥈", tint: "#C5CDD8" };
  if (place === 3) return { emoji: "🥉", tint: "#E09A5A" };
  return { emoji: `${place}`, tint: "#EEE8DC" };
}

function PodiumBee({ bee, me, tall }: { bee: HiveBee; me: boolean; tall: number }) {
  const m = medal(bee.place);
  return (
    <View style={styles.podiumCol}>
      {bee.place === 1 ? <Text style={styles.crown}>👑</Text> : <View style={{ height: 18 }} />}
      <View style={[styles.podiumRing, me && styles.podiumMe, { borderColor: m.tint }]}>
        <HiveAvatar name={bee.name} hue={bee.hue} look={bee.look} size={bee.place === 1 ? 56 : 44} ring={bee.dailyDone} />
      </View>
      <Text style={[styles.podiumName, me && styles.you]} numberOfLines={1}>
        {me ? "You" : bee.name}
      </Text>
      <View style={[styles.podiumBlock, { height: tall, backgroundColor: m.tint }]}>
        <Text style={styles.podiumPlace}>{m.emoji}</Text>
        <Text style={styles.podiumPts}>{bee.points}</Text>
      </View>
    </View>
  );
}

export function HiveHonors({
  hive,
  onClimb,
}: {
  hive: HivePayload;
  onClimb: () => void;
}) {
  const board = hive.board || [];
  if (!board.length) return null;
  const meId = hive.me.id;
  const top = board[0];
  const streakStar = board.slice().sort((a, b) => b.streak - a.streak || b.points - a.points)[0];
  const podium = [board[1], board[0], board[2]].filter(Boolean) as HiveBee[];
  const heights = [52, 72, 44];
  const rival = hive.rival;
  const month = monthName();
  const finishedFriends = board.filter((b) => b.dailyDone && b.id !== meId);

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={["#1A2B5F", "#2A3F84"]} style={styles.monthCard}>
        <Text style={styles.monthKicker}>Bee of the Month · {month}</Text>
        <View style={styles.monthRow}>
          <View style={styles.monthAvatar}>
            <Text style={styles.monthCrown}>👑</Text>
            <HiveAvatar name={top.name} hue={top.hue} look={top.look} size={64} ring />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.monthName} numberOfLines={1}>
              {top.id === meId ? "That’s you!" : top.name}
            </Text>
            <Text style={styles.monthSub} numberOfLines={1}>
              {top.title} · {top.points} Buzz Points · {top.streak}-day streak
            </Text>
            <Text style={styles.monthHint}>
              {top.id === meId ? "Keep playing to hold the crown." : `Climb ${top.points - hive.me.points} Buzz Points to take the crown.`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.boardCard}>
        <View style={styles.head}>
          <Ionicons name="trophy" size={16} color={colors.navy} />
          <Text style={styles.headTxt}>Hive race</Text>
          <Text style={styles.headMeta}>You’re {placeLabel(hive.me.place)}</Text>
        </View>

        {podium.length >= 3 ? (
          <View style={styles.podium}>
            {podium.map((bee, i) => (
              <PodiumBee key={bee.id} bee={bee} me={bee.id === meId} tall={heights[i] || 44} />
            ))}
          </View>
        ) : null}

        {board.map((bee) => {
          const mine = bee.id === meId;
          const m = medal(bee.place);
          return (
            <View key={bee.id} style={[styles.row, mine && styles.rowMe]}>
              <Text style={styles.place}>{bee.place <= 3 ? m.emoji : bee.place}</Text>
              <HiveAvatar name={bee.name} hue={bee.hue} look={bee.look} size={32} online={bee.buzzing} ring={mine} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowName, mine && styles.you]} numberOfLines={1}>
                  {mine ? "You" : bee.name}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {bee.dailyDone ? "Finished today" : bee.buzzing ? "Buzzing now" : `${bee.streak}-day streak`}
                </Text>
              </View>
              <Text style={styles.rowPts}>{bee.points}</Text>
            </View>
          );
        })}

        <View style={styles.chips}>
          {streakStar ? (
            <View style={styles.chip}>
              <Text style={styles.chipEmoji}>🔥</Text>
              <Text style={styles.chipTxt} numberOfLines={1}>
                Streak star · {streakStar.id === meId ? "You" : streakStar.name} · {streakStar.streak} days
              </Text>
            </View>
          ) : null}
          <View style={styles.chip}>
            <MascotMark size={18} style={styles.chipMascot} />
            <Text style={styles.chipTxt} numberOfLines={1}>
              {hive.me.dailyDone
                ? finishedFriends.length
                  ? finishedFriends.length === 1
                    ? `${finishedFriends[0].name} finished today too!`
                    : `${finishedFriends[0].name} and ${finishedFriends[1].name} finished today too!`
                  : "You finished first today!"
                : finishedFriends.length
                  ? finishedFriends.length === 1
                    ? `${finishedFriends[0].name} finished the full pack today! Your turn!`
                    : `${finishedFriends[0].name} and ${finishedFriends[1].name} finished today! Your turn!`
                  : "Be the first bee today!"}
            </Text>
          </View>
        </View>

        {rival && rival.direction === "ahead" ? (
          <BouncePress sound="tap" onPress={onClimb} style={styles.catch}>
            <HiveAvatar name={rival.name} hue={rival.hue} look={hive.board.find((b) => b.id === rival.id)?.look} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.catchTitle} numberOfLines={1}>
                Catch {rival.name}!
              </Text>
              <Text style={styles.catchSub} numberOfLines={1}>
                {rival.delta} Buzz Points ahead · play today’s path
              </Text>
            </View>
            <Text style={styles.catchGo}>Climb</Text>
          </BouncePress>
        ) : hive.me.place === 1 ? (
          <Text style={styles.hold}>You’re on top. Play to keep it.</Text>
        ) : (
          <BouncePress sound="tap" onPress={onClimb} style={styles.catch}>
            <Text style={styles.catchTitle}>Climb the hive</Text>
            <Text style={styles.catchGo}>Play</Text>
          </BouncePress>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, gap: 10 },
  monthCard: { borderRadius: 22, padding: 14, overflow: "hidden" },
  monthKicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 0.4 },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  monthAvatar: { alignItems: "center" },
  monthCrown: { fontSize: 18, marginBottom: -6, zIndex: 2 },
  monthName: { fontFamily: fonts.extra, color: colors.white, fontSize: 20 },
  monthSub: { fontFamily: fonts.bold, color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 2 },
  monthHint: { fontFamily: fonts.medium, color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 6 },
  boardCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEE8DC",
  },
  head: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  headTxt: { fontFamily: fonts.extra, color: colors.navy, fontSize: 16, flex: 1 },
  headMeta: { fontFamily: fonts.bold, color: colors.listen, fontSize: 12 },
  podium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 8, marginBottom: 8 },
  podiumCol: { flex: 1, alignItems: "center", maxWidth: 110 },
  crown: { fontSize: 16, marginBottom: 2 },
  podiumRing: { borderRadius: 32, borderWidth: 3, padding: 1 },
  podiumMe: { borderColor: colors.yellow },
  podiumName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12, marginTop: 4 },
  podiumBlock: {
    marginTop: 6,
    alignSelf: "stretch",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
  },
  podiumPlace: { fontSize: 14 },
  podiumPts: { fontFamily: fonts.extra, color: colors.navy, fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  rowMe: { backgroundColor: "#FFF8E1", borderWidth: 1, borderColor: colors.yellow },
  place: { width: 22, textAlign: "center", fontFamily: fonts.extra, color: colors.navy, fontSize: 13 },
  rowName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 14 },
  you: { color: colors.navy },
  rowSub: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, marginTop: 1 },
  rowPts: { fontFamily: fonts.extra, color: "#C47A00", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F6F1E8",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  chipEmoji: { fontSize: 12 },
  chipMascot: { marginTop: 1 },
  chipTxt: { fontFamily: fonts.bold, color: colors.navy, fontSize: 11, flexShrink: 1 },
  catch: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.yellow,
    borderRadius: 16,
    padding: 10,
  },
  catchTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  catchSub: { fontFamily: fonts.bold, color: colors.ink, fontSize: 12, marginTop: 1 },
  catchGo: {
    fontFamily: fonts.extra,
    color: colors.white,
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  hold: { marginTop: 10, fontFamily: fonts.bold, color: colors.speak, textAlign: "center", fontSize: 13 },
});
