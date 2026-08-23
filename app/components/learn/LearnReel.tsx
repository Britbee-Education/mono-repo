import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ResizeMode, Video } from "expo-av";
import { HiveAvatar } from "@/components/hive/HiveAvatar";
import { BouncePress } from "@/components/game/BouncePress";
import { learnArt } from "@/lib/art";
import { playSfx } from "@/lib/sfx";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants/theme";
import type { LearnClip } from "@/lib/api";

export function LearnReel({
  clip,
  active,
  seen,
  height,
  onSeen,
}: {
  clip: LearnClip;
  active: boolean;
  seen: boolean;
  height: number;
  onSeen: (id: string) => void;
}) {
  const video = useRef<Video>(null);
  const elapsed = useRef(0);
  const tickAt = useRef(0);
  const seenOnce = useRef(seen);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [broken, setBroken] = useState(false);
  const [progress, setProgress] = useState(0);
  const art = learnArt(clip.art);
  const hasVideo = Boolean(clip.videoUrl) && !broken;
  const videoSource = typeof clip.videoUrl === "string" ? { uri: clip.videoUrl } : clip.videoUrl;
  const live = active && !paused;
  const containVideo = width >= 900;

  useEffect(() => {
    seenOnce.current = seen;
  }, [seen]);

  useEffect(() => {
    if (!active) {
      elapsed.current = 0;
      tickAt.current = 0;
      setProgress(0);
      setPaused(false);
      void video.current?.pauseAsync().catch(() => undefined);
      return;
    }
    void video.current?.playAsync().catch(() => undefined);
  }, [active]);

  useEffect(() => {
    if (!live) return;
    tickAt.current = Date.now();
    const span = clip.duration * 1000;
    const t = setInterval(() => {
      const now = Date.now();
      elapsed.current += now - tickAt.current;
      tickAt.current = now;
      if (elapsed.current >= span) elapsed.current = 0;
      const p = Math.min(1, elapsed.current / span);
      setProgress(p);
      if (p >= 0.55 && !seenOnce.current) {
        seenOnce.current = true;
        onSeen(clip.id);
      }
    }, 80);
    return () => clearInterval(t);
  }, [live, clip.duration, clip.id, onSeen]);

  useEffect(() => {
    if (!hasVideo) return;
    if (live) void video.current?.playAsync().catch(() => undefined);
    else void video.current?.pauseAsync().catch(() => undefined);
  }, [live, hasVideo]);

  function togglePause() {
    setPaused((v) => {
      const next = !v;
      playSfx("tap");
      return next;
    });
  }

  return (
    <View style={[styles.page, { height, backgroundColor: clip.bg || colors.navyDeep }]}>
      {hasVideo ? (
        <Video
          ref={video}
          source={videoSource as any}
          style={[StyleSheet.absoluteFill, containVideo && styles.videoContain]}
          resizeMode={containVideo ? ResizeMode.CONTAIN : ResizeMode.COVER}
          shouldPlay={live}
          isLooping
          isMuted={muted}
          onError={() => setBroken(true)}
        />
      ) : art ? (
        <Image source={art} style={styles.art} resizeMode="contain" accessibilityLabel={clip.line} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: clip.bg || colors.navyDeep }]} />
      )}
      <LinearGradient colors={["rgba(11,31,77,0.42)", "transparent", "rgba(11,31,77,0.88)"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.progressTrack, { top: Math.max(insets.top, 8) }]}>
        <View style={[styles.progressFill, { width: `${Math.max(4, progress * 100)}%` }]} />
      </View>

      <View style={[styles.top, { top: Math.max(insets.top, 8) + 12 }]}>
        <View style={styles.chip}>
          <Text style={styles.chipTxt}>{clip.duration}s</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipTxt}>{clip.topic}</Text>
        </View>
        {seen ? (
          <View style={styles.chip}>
            <Ionicons name="checkmark" size={12} color={colors.navy} />
            <Text style={styles.chipTxt}>Got it</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.side} pointerEvents="box-none">
        <RailBtn
          icon={paused ? "play" : "pause"}
          label={paused ? "Play" : "Wait"}
          onPress={togglePause}
        />
        <RailBtn
          icon={muted ? "volume-mute" : "volume-high"}
          label={muted ? "Muted" : "Sound"}
          onPress={() => {
            setMuted((v) => {
              playSfx("tap");
              return !v;
            });
          }}
        />
      </View>

      <View style={styles.bottom} pointerEvents="none">
        <View style={styles.mentor}>
          <HiveAvatar name={clip.guideName} size={36} maya />
          <Text style={styles.mentorName}>{clip.guideName}</Text>
        </View>
        <Text style={styles.title}>{clip.title}</Text>
        <Text style={styles.line}>“{clip.line}”</Text>
        {clip.tip ? <Text style={styles.tip}>{clip.tip}</Text> : null}
      </View>

      {paused ? (
        <View style={styles.pauseMark} pointerEvents="none">
          <Ionicons name="pause" size={42} color={colors.white} />
        </View>
      ) : null}
    </View>
  );
}

function RailBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const tap = useCallback(() => onPress(), [onPress]);
  return (
    <BouncePress onPress={tap} style={styles.rail} sound={false} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.railIcon}>
        <Ionicons name={icon} size={18} color={colors.navy} />
      </View>
      <Text style={styles.railTxt}>{label}</Text>
    </BouncePress>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", overflow: "hidden" },
  videoContain: { backgroundColor: "#0B1F4D" },
  art: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  progressTrack: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
    zIndex: 3,
  },
  progressFill: { height: "100%", backgroundColor: colors.yellow, borderRadius: 2 },
  top: {
    position: "absolute",
    left: 14,
    right: 72,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    zIndex: 3,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.yellow,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTxt: { fontFamily: fonts.extra, fontSize: 11, color: colors.navy },
  side: { position: "absolute", right: 10, bottom: 132, alignItems: "center", gap: 14, zIndex: 4 },
  rail: { alignItems: "center", gap: 4 },
  railIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  railTxt: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
  bottom: { position: "absolute", left: 16, right: 78, bottom: 22, zIndex: 3 },
  mentor: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  mentorName: { fontFamily: fonts.bold, color: colors.white, fontSize: 14 },
  title: { fontFamily: fonts.medium, color: "rgba(255,255,255,0.78)", fontSize: 13, marginBottom: 4 },
  line: {
    fontFamily: fonts.extra,
    color: colors.white,
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 8,
  },
  tip: { fontFamily: fonts.medium, color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 20 },
  pauseMark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
