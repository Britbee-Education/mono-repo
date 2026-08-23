import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { BackButton } from "@/components/ui/BackButton";
import { PillButton } from "@/components/ui/PillButton";
import { HiveAvatar } from "@/components/hive/HiveAvatar";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { useAuth } from "@/context/AuthContext";
import { useHive } from "@/context/HiveContext";
import { useSocial } from "@/context/SocialContext";
import { useLayout } from "@/lib/layout";
import { playSfx } from "@/lib/sfx";
import { colors, fonts } from "@/constants/theme";
import type { SocialRoom } from "@/lib/api";

export default function SocialRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { hive } = useHive();
  const { headerTop, padX, activityMax } = useLayout();
  const { loadRoom, joinRoom, sayInRoom, social } = useSocial();
  const [room, setRoom] = useState<SocialRoom | null>(null);
  const [draft, setDraft] = useState("");
  const meId = hive?.me.id || user?.id || "";

  const pull = useCallback(async () => {
    if (!id) return;
    const next = await loadRoom(String(id));
    if (next) setRoom(next);
  }, [id, loadRoom]);

  useEffect(() => {
    void pull();
    const t = setInterval(() => void pull(), 2_000);
    return () => clearInterval(t);
  }, [pull]);

  useEffect(() => {
    const live = social?.rooms.find((r) => r.id === id) || (social?.circle.id === id ? social.circle : null);
    if (live) setRoom(live);
  }, [social, id]);

  const mine = room?.players.find((p) => p.id === meId);
  const joined = Boolean(mine);

  async function join() {
    if (!id) return;
    playSfx("buzz");
    const next = await joinRoom(String(id));
    if (next) setRoom(next);
  }

  async function say() {
    if (!id) return;
    const text = draft.trim();
    if (!text) return;
    playSfx("tap");
    const next = await sayInRoom(String(id), text);
    if (next) {
      setRoom(next);
      setDraft("");
      playSfx(next.winnerId === meId ? "fanfare" : "ok");
    } else {
      playSfx("miss");
    }
  }

  const kicker = room?.kind === "circle" ? "Circle talk" : room?.kind === "battle" ? "Buzz battle" : "Word race";

  return (
    <View style={styles.root}>
      <ScreenDecor quiet />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.head, { paddingTop: headerTop, paddingHorizontal: padX }]}>
          <BackButton fallback="/(main)/social" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.eyebrow}>{kicker}</Text>
            <Text style={styles.title} numberOfLines={1}>
              {room?.title || "Hive play"}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingHorizontal: padX, maxWidth: activityMax, width: "100%", alignSelf: "center" },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.promptCard}>
            <Text style={styles.promptKicker}>{room?.kind === "circle" ? "Answer in English" : "Say this"}</Text>
            <Text style={styles.prompt}>{room?.prompt || "…"}</Text>
          </View>

          <View style={styles.players}>
            {(room?.players || []).map((p) => (
              <View key={p.id} style={[styles.player, p.done && styles.playerDone, p.id === room?.winnerId && styles.playerWin]}>
                <HiveAvatar name={p.name} hue={p.hue} look={p.look} size={36} ring={p.id === meId} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {p.id === meId ? "You" : p.name}
                  </Text>
                  <Text style={styles.playerSub} numberOfLines={2}>
                    {p.id === room?.winnerId
                      ? "Won the battle"
                      : p.done
                        ? room?.kind === "circle"
                          ? p.answer
                          : "Said it"
                        : "Thinking…"}
                  </Text>
                </View>
                {p.done ? <Text style={styles.check}>✓</Text> : null}
              </View>
            ))}
          </View>

          {room?.status === "done" ? (
            <Text style={styles.done}>
              {room.winnerName ? `${room.winnerId === meId ? "You" : room.winnerName} won!` : "This one is over."}
            </Text>
          ) : !joined ? (
            <PillButton label="Join" onPress={() => void join()} />
          ) : mine?.done ? (
            <Text style={styles.wait}>Nice. Wait for the hive.</Text>
          ) : (
            <>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={room?.kind === "circle" ? "Write one English sentence…" : "Type it in English…"}
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize={room?.kind === "race" ? "none" : "sentences"}
                maxLength={90}
              />
              <PillButton label={room?.kind === "circle" ? "Share" : "Send"} onPress={() => void say()} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8" },
  head: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 10 },
  eyebrow: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11 },
  title: { fontFamily: fonts.extra, color: colors.navy, fontSize: 18 },
  body: { paddingBottom: 28, gap: 12 },
  promptCard: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 16,
  },
  promptKicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 0.4 },
  prompt: { fontFamily: fonts.extra, color: colors.white, fontSize: 22, marginTop: 8, lineHeight: 28 },
  players: { gap: 8 },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEE8DC",
  },
  playerDone: { borderColor: "#A5D6A7", backgroundColor: "#E8F5E9" },
  playerWin: { borderColor: colors.yellow, backgroundColor: "#FFF8E1" },
  playerName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  playerSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 1 },
  check: { fontFamily: fonts.extra, color: colors.speak, fontSize: 18 },
  done: { fontFamily: fonts.extra, color: colors.speak, textAlign: "center", fontSize: 16, marginTop: 8 },
  wait: { fontFamily: fonts.bold, color: colors.listen, textAlign: "center", marginTop: 8 },
  input: {
    height: 48,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    color: colors.navy,
    borderWidth: 1,
    borderColor: "#EEE8DC",
  },
});
