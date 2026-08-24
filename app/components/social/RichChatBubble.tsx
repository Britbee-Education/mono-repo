import { View, Text, StyleSheet, Pressable, Image, Linking } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as WebBrowser from "expo-web-browser";
import { HiveAvatar } from "@/components/hive/HiveAvatar";
import { materialById, legacyStickerEmoji, legacyStickerUsesMascot, type RichChatMessage } from "@/lib/chatEngagement";
import { MascotMark } from "@/components/ui/MascotMark";
import { speak } from "@/lib/speech";
import { colors, fonts } from "@/constants/theme";

export function RichChatBubble({
  mine,
  pending,
  name,
  mentor,
  hue,
  look,
  msg,
}: {
  mine: boolean;
  pending: boolean;
  name?: string;
  mentor?: boolean;
  hue?: number;
  look?: string;
  msg: RichChatMessage;
}) {
  const router = useRouter();
  const kind = msg.kind || "text";

  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      {!mine ? (
        mentor ? (
          <HiveAvatar name={name || "Mentor"} size={22} maya />
        ) : (
          <HiveAvatar name={name || "Bee"} hue={hue} look={look} size={22} />
        )
      ) : null}
      <View style={[styles.bubble, mine && styles.bubbleMe, mentor && styles.bubbleMentor, pending && styles.pending]}>
        {!mine && name ? <Text style={[styles.name, mentor && styles.nameMentor]}>{name}</Text> : null}
        {kind === "sticker" ? (
          legacyStickerUsesMascot(msg.stickerId || "") ? (
            <MascotMark size={48} />
          ) : (
            <Text style={styles.sticker}>{legacyStickerEmoji(msg.stickerId || "") || msg.text || "🎨"}</Text>
          )
        ) : kind === "material" ? (
          <MaterialCard msg={msg} mine={mine} onOpen={(href) => router.push(href as never)} />
        ) : kind === "attachment" ? (
          <AttachmentCard msg={msg} mine={mine} />
        ) : kind === "voice" ? (
          <VoiceCard msg={msg} mine={mine} />
        ) : (
          <Text style={[styles.text, mine && styles.textMe]}>{msg.text}</Text>
        )}
        {pending ? <Text style={styles.pendingTxt}>…</Text> : null}
      </View>
    </View>
  );
}

async function openAttachment(url: string) {
  if (!url) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => undefined);
  }
}

function AttachmentCard({ msg, mine }: { msg: RichChatMessage; mine: boolean }) {
  const url = msg.attachmentUrl || "";
  const kind = msg.attachmentKind || "document";
  const label = msg.attachmentName || msg.text || "File";

  if (kind === "photo" && url) {
    return (
      <Pressable onPress={() => void openAttachment(url)} style={styles.attachPhotoWrap}>
        <Image source={{ uri: url }} style={styles.attachPhoto} resizeMode="cover" />
      </Pressable>
    );
  }

  if (kind === "video") {
    return (
      <Pressable onPress={() => void openAttachment(url)} style={[styles.attachFile, mine && styles.attachFileMe]}>
        <View style={[styles.attachThumb, mine && styles.attachThumbMe]}>
          <Ionicons name="play" size={18} color={mine ? colors.navy : colors.white} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.attachTitle, mine && styles.textMe]} numberOfLines={1}>
            Video
          </Text>
          <Text style={[styles.attachSub, mine && styles.textMeSoft]} numberOfLines={1}>
            Tap to open
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color={mine ? colors.yellow : colors.listen} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => void openAttachment(url)} style={[styles.attachFile, mine && styles.attachFileMe]}>
      <View style={[styles.attachThumb, mine && styles.attachThumbMe]}>
        <Ionicons name="document-text" size={18} color={mine ? colors.navy : colors.white} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.attachTitle, mine && styles.textMe]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={[styles.attachSub, mine && styles.textMeSoft]} numberOfLines={1}>
          Tap to open
        </Text>
      </View>
      <Ionicons name="open-outline" size={18} color={mine ? colors.yellow : colors.listen} />
    </Pressable>
  );
}

function MaterialCard({ msg, mine, onOpen }: { msg: RichChatMessage; mine: boolean; onOpen: (href: string) => void }) {
  const mat = materialById(msg.materialId || "");
  if (!mat) return <Text style={[styles.text, mine && styles.textMe]}>{msg.text}</Text>;
  return (
    <Pressable onPress={() => onOpen(mat.href)} style={[styles.material, { backgroundColor: mine ? "rgba(255,255,255,0.14)" : mat.tint }]}>
      <Text style={styles.materialEmoji}>{mat.emoji}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.materialTitle, mine && styles.textMe]} numberOfLines={1}>
          {mat.title}
        </Text>
        <Text style={[styles.materialSub, mine && styles.textMeSoft]} numberOfLines={2}>
          {mat.subtitle}
        </Text>
      </View>
      <Ionicons name="arrow-forward-circle" size={22} color={mine ? colors.white : colors.navy} />
    </Pressable>
  );
}

function VoiceCard({ msg, mine }: { msg: RichChatMessage; mine: boolean }) {
  const line = msg.voiceText || msg.text || "Voice note";
  const sec = msg.voiceSec || 0;
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  async function playVoice() {
    if (msg.voiceUrl) {
      try {
        if (soundRef.current) {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await soundRef.current.pauseAsync();
            setPlaying(false);
            return;
          }
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync({ uri: msg.voiceUrl });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) setPlaying(false);
        });
        setPlaying(true);
        await sound.playAsync();
        return;
      } catch {
        setPlaying(false);
      }
    }
    speak(line, "coach");
  }

  return (
    <Pressable onPress={() => void playVoice()} style={styles.voice}>
      <View style={[styles.voiceIcon, mine && styles.voiceIconMe]}>
        <Ionicons name={playing ? "pause" : "mic"} size={16} color={mine ? colors.navy : colors.white} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.voiceTitle, mine && styles.textMe]} numberOfLines={1}>
          Voice note{sec ? ` · ${sec}s` : ""}
        </Text>
        <Text style={[styles.voiceSub, mine && styles.textMeSoft]} numberOfLines={2}>
          {line}
        </Text>
      </View>
      <Ionicons name={playing ? "pause-circle" : "play-circle"} size={24} color={mine ? colors.yellow : colors.listen} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 5, maxWidth: "94%" },
  rowMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: "88%",
  },
  bubbleMe: { backgroundColor: colors.navy },
  bubbleMentor: { backgroundColor: "#E3F2E8" },
  pending: { opacity: 0.7 },
  name: { fontFamily: fonts.bold, color: colors.listen, fontSize: 9, marginBottom: 2 },
  nameMentor: { color: "#2E7D32" },
  text: { fontFamily: fonts.medium, color: colors.navy, fontSize: 14, lineHeight: 19 },
  textMe: { color: colors.white },
  textMeSoft: { color: "rgba(255,255,255,0.82)" },
  sticker: { fontSize: 42, lineHeight: 46, textAlign: "center", paddingHorizontal: 4 },
  attachPhotoWrap: { borderRadius: 12, overflow: "hidden" },
  attachPhoto: { width: 220, height: 160, backgroundColor: "#E8E2D6" },
  attachFile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 8,
    minWidth: 210,
    backgroundColor: "#F6F1E8",
  },
  attachFileMe: { backgroundColor: "rgba(255,255,255,0.12)" },
  attachThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.listen,
    alignItems: "center",
    justifyContent: "center",
  },
  attachThumbMe: { backgroundColor: colors.yellow },
  attachTitle: { fontFamily: fonts.extra, fontSize: 13, color: colors.navy },
  attachSub: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 14 },
  material: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 8,
    minWidth: 210,
  },
  materialEmoji: { fontSize: 24 },
  materialTitle: { fontFamily: fonts.extra, fontSize: 13, color: colors.navy },
  materialSub: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 14 },
  voice: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 200 },
  voiceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.listen,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceIconMe: { backgroundColor: colors.yellow },
  voiceTitle: { fontFamily: fonts.extra, fontSize: 13, color: colors.navy },
  voiceSub: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 14 },
  pendingTxt: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, marginTop: 2, textAlign: "right" },
});
