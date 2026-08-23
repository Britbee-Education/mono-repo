import { Image, View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import {
  BACK_SWATCH,
  BODY_SWATCH,
  HAT_EMOJI,
  STRIPE_SWATCH,
  resolveLook,
  type BeeLook,
} from "@/lib/look";
import { beeDicebearPngUrl } from "@/lib/dicebear";

export const HIVE_HUES = ["#5B9BFF", "#8C52FF", "#4CAF50", "#EF5350", "#F5C400", "#FF8A65", "#26A69A", "#EC407A"];

export function hiveHue(index: number) {
  return HIVE_HUES[Math.abs(index) % HIVE_HUES.length];
}

function Eye({
  kind,
  size,
  wink,
}: {
  kind: BeeLook["eyes"];
  size: number;
  wink?: boolean;
}) {
  if (kind === "hearts") {
    return <Text style={{ fontSize: size * 0.9, lineHeight: size }}>{wink ? "😉" : "♥"}</Text>;
  }
  if (kind === "star") {
    return <Text style={{ fontSize: size, lineHeight: size }}>★</Text>;
  }
  if (wink || kind === "wink") {
    return <View style={{ width: size * 1.1, height: 2, borderRadius: 1, backgroundColor: "#1A2B5F" }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#1A2B5F",
      }}
    >
      <View
        style={{
          width: size * (kind === "sparkle" ? 0.42 : 0.5),
          height: size * (kind === "sparkle" ? 0.42 : 0.5),
          borderRadius: size,
          backgroundColor: "#1A2B5F",
        }}
      />
    </View>
  );
}

export function KidBee({ look, size }: { look: BeeLook; size: number }) {
  const body = BODY_SWATCH[look.body];
  const stripe = STRIPE_SWATCH[look.stripe];
  const s = size;
  const bodyW = s * 0.62;
  const bodyH = s * 0.58;
  const eye = Math.max(5, s * 0.14);
  const wing = look.wings === "gold" ? "#FFE566" : look.wings === "rainbow" ? "#81D4FA" : look.wings === "sparkle" ? "#FFF59D" : "rgba(255,255,255,0.72)";
  const hat = HAT_EMOJI[look.hat];
  const glassColor = look.glasses === "sun" ? "rgba(26,43,95,0.55)" : look.glasses === "heart" ? "#EC407A" : look.glasses === "star" ? "#F5C400" : "#1A2B5F";

  function tint(hex: string, amt: number) {
    // amt: -255..+255
    if (!hex.startsWith("#")) return hex;
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + amt));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  const bodyDark = tint(body, -55);
  const bodyLight = tint(body, 35);
  const wingDark = tint(wing, -30);
  const wingLight = tint(wing, 30);
  const stripeDark = tint(stripe, -40);

  return (
    <View
      style={{
        width: s,
        height: s,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: s * 0.34,
          height: s * 0.42,
          borderRadius: s,
          backgroundColor: wing,
          left: s * 0.04,
          top: s * 0.32,
          transform: [{ rotate: "-18deg" }],
          opacity: 0.9,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 10 },
        }}
      />
      <View
        style={{
          position: "absolute",
          width: s * 0.34,
          height: s * 0.42,
          borderRadius: s,
          backgroundColor: look.wings === "rainbow" ? "#F48FB1" : wing,
          right: s * 0.04,
          top: s * 0.32,
          transform: [{ rotate: "18deg" }],
          opacity: 0.9,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 10 },
        }}
      />
      {look.hat === "none" ? (
        <>
          <View style={{ position: "absolute", top: s * 0.08, left: s * 0.32, width: 3, height: s * 0.14, backgroundColor: stripe, borderRadius: 2 }} />
          <View style={{ position: "absolute", top: s * 0.08, right: s * 0.32, width: 3, height: s * 0.14, backgroundColor: stripe, borderRadius: 2 }} />
          <View style={{ position: "absolute", top: s * 0.04, left: s * 0.28, width: s * 0.1, height: s * 0.1, borderRadius: s, backgroundColor: body, borderWidth: 1, borderColor: stripe }} />
          <View style={{ position: "absolute", top: s * 0.04, right: s * 0.28, width: s * 0.1, height: s * 0.1, borderRadius: s, backgroundColor: body, borderWidth: 1, borderColor: stripe }} />
        </>
      ) : null}
      {/* Body now uses a gradient fill + highlight to feel more 3D */}
      <LinearGradient
        style={{
          width: bodyW,
          height: bodyH,
          borderRadius: bodyW / 2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderWidth: 1.5,
          borderColor: "rgba(26,43,95,0.18)",
          shadowColor: "#000",
          shadowOpacity: 0.10,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 12 },
        }}
        colors={[bodyDark, body, bodyLight]}
      >
        {/* Bee stripes (multiple bands = more “real bee” than a single bar) */}
        {(() => {
          const bandCount = 4;
          const stripeStart = bodyH * 0.48;
          const bandH = Math.max(3, s * 0.045);
          const bandStep = bodyH * 0.08;
          const inset = bodyW * 0.07;
          const speckSeed = `${look.body}-${look.stripe}-${look.hat}-${look.eyes}-${look.wings}-${look.blush}`.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
          const rand = (k: number) => {
            const v = Math.sin((speckSeed + k) * 0.001) * 10000;
            return v - Math.floor(v);
          };

          const specks = Array.from({ length: 8 }).map((_, i) => {
            const rx = rand(i * 2 + 1);
            const ry = rand(i * 2 + 2);
            return {
              key: `sp-${i}`,
              left: inset * 0.35 + rx * (bodyW - inset * 0.7),
              top: stripeStart + ry * (bandStep * bandCount * 0.9),
              size: Math.max(2, s * (0.012 + rand(i * 3) * 0.02)),
              opacity: 0.04 + rand(i * 5) * 0.08,
            };
          });

          return (
            <>
              {Array.from({ length: bandCount }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    position: "absolute",
                    left: inset,
                    right: inset,
                    height: bandH,
                    backgroundColor: i % 2 === 0 ? stripeDark : stripe,
                    top: stripeStart + i * bandStep,
                    opacity: 0.92,
                    borderRadius: 6,
                  }}
                />
              ))}
              {/* Subtle speckle texture */}
              {specks.map((sp) => (
                <View
                  key={sp.key}
                  style={{
                    position: "absolute",
                    left: sp.left,
                    top: sp.top,
                    width: sp.size,
                    height: sp.size,
                    borderRadius: sp.size / 2,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    opacity: sp.opacity,
                  }}
                />
              ))}
            </>
          );
        })()}
        <View
          style={{
            position: "absolute",
            left: bodyW * 0.08,
            top: bodyH * 0.08,
            width: bodyW * 0.55,
            height: Math.max(6, s * 0.12),
            borderRadius: bodyW,
            backgroundColor: "rgba(255,255,255,0.28)",
          }}
        />
        {/* Dark rim for extra depth */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: bodyH * 0.66,
            height: bodyH * 0.34,
            backgroundColor: stripeDark,
            opacity: 0.10,
          }}
        />
        <View style={{ flexDirection: "row", gap: Math.max(3, s * 0.06), marginTop: -s * 0.04, alignItems: "center" }}>
          <Eye kind={look.eyes} size={eye} />
          <Eye kind={look.eyes} size={eye} wink={look.eyes === "wink"} />
        </View>
        {look.blush !== "none" ? (
          <View style={{ position: "absolute", left: bodyW * 0.08, top: bodyH * 0.48, width: s * 0.1, height: s * 0.06, borderRadius: 8, backgroundColor: look.blush === "peach" ? "#FFAB91" : "#F48FB1", opacity: 0.85 }} />
        ) : null}
        {look.blush !== "none" ? (
          <View style={{ position: "absolute", right: bodyW * 0.08, top: bodyH * 0.48, width: s * 0.1, height: s * 0.06, borderRadius: 8, backgroundColor: look.blush === "peach" ? "#FFAB91" : "#F48FB1", opacity: 0.85 }} />
        ) : null}
        <View
          style={{
            marginTop: 2,
            width: s * 0.16,
            height: s * 0.08,
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            borderBottomWidth: 2,
            borderColor: "#1A2B5F",
            opacity: 0.85,
          }}
        />
        {look.glasses !== "none" ? (
          <View style={{ position: "absolute", flexDirection: "row", alignItems: "center", gap: 2 }}>
            <View style={{ width: eye * 1.45, height: eye * 1.45, borderRadius: look.glasses === "heart" ? 4 : eye, borderWidth: 2, borderColor: glassColor, backgroundColor: look.glasses === "sun" ? "rgba(26,43,95,0.28)" : "transparent" }} />
            <View style={{ width: 4, height: 2, backgroundColor: glassColor }} />
            <View style={{ width: eye * 1.45, height: eye * 1.45, borderRadius: look.glasses === "heart" ? 4 : eye, borderWidth: 2, borderColor: glassColor, backgroundColor: look.glasses === "sun" ? "rgba(26,43,95,0.28)" : "transparent" }} />
          </View>
        ) : null}
      </LinearGradient>
      {hat ? (
        <Text style={{ position: "absolute", top: -s * 0.06, fontSize: s * 0.32, lineHeight: s * 0.36 }}>{hat}</Text>
      ) : null}
    </View>
  );
}

export function HiveAvatar({
  name,
  hue = 0,
  look,
  size = 32,
  ring,
  online,
  maya,
  emoji,
}: {
  name: string;
  hue?: number;
  look?: BeeLook | null;
  size?: number;
  ring?: boolean;
  online?: boolean;
  maya?: boolean;
  emoji?: string;
}) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  const resolved = resolveLook(look, hue);
  const dot = Math.max(9, size * 0.3);
  const showBee = !maya && !emoji;
  const inner = size - (ring ? 6 : 0);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.wrap,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: maya ? colors.yellow : BACK_SWATCH[resolved.back],
            borderWidth: ring || maya ? 3 : 0,
            borderColor: maya ? colors.navy : colors.white,
            overflow: "visible",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
          },
        ]}
      >
        <View
          style={{
            position: "absolute",
            top: -size * 0.15,
            left: -size * 0.2,
            width: size * 0.55,
            height: size * 0.45,
            borderRadius: size * 0.25,
            backgroundColor: "rgba(255,255,255,0.22)",
            transform: [{ rotate: "-25deg" }],
          }}
        />
        {maya || emoji ? (
          <Text style={{ fontSize: size * 0.48 }}>{emoji || "🐝"}</Text>
        ) : showBee ? (
          <>
            <Image
              source={{
                uri: beeDicebearPngUrl({
                  look: resolved,
                  hue,
                  size: inner,
                }),
              }}
              style={{ width: inner, height: inner, borderRadius: inner / 2 }}
              resizeMode="cover"
            />
          </>
        ) : (
          <Text style={[styles.letter, { fontSize: Math.max(12, size * 0.42), color: colors.white }]}>{letter}</Text>
        )}
      </View>
      {online ? <View style={[styles.online, { width: dot, height: dot, borderRadius: dot / 2, right: -1, bottom: -1 }]} /> : null}
    </View>
  );
}

export function ago(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export function placeLabel(n: number) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  letter: { fontFamily: fonts.extra, color: colors.white },
  online: {
    position: "absolute",
    backgroundColor: colors.speak,
    borderWidth: 2,
    borderColor: colors.white,
  },
});
