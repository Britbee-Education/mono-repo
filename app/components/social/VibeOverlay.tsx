import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { cheerEmoji, cheerUsesMascot, type ChatVibeId, type SocialVibeEvent } from "@/lib/chatEngagement";
import { MascotMark } from "@/components/ui/MascotMark";
import { fonts } from "@/constants/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type ParticleSpec = {
  key: string;
  emoji: string;
  mascot?: boolean;
  startX: number;
  startY: number;
  driftX: number;
  riseY: number;
  delay: number;
  duration: number;
  rot: number;
  size: number;
  showName?: string;
};

type Burst = {
  key: string;
  particles: ParticleSpec[];
  ttl: number;
};

type BurstSource = {
  key: string;
  vibe: ChatVibeId | string;
  name?: string;
};

function particlesForBurst(source: BurstSource): Burst {
  const vibe = source.vibe;
  const big = vibe === "celebrate" || vibe === "popper";
  const count = big ? 9 : vibe === "clap" ? 6 : 5;
  const primary = cheerEmoji(String(vibe));
  const mascot = cheerUsesMascot(String(vibe));
  const accent = big ? "✨" : primary;
  const centerX = SCREEN_W * 0.5;
  const baseY = 88 + Math.min(40, SCREEN_H * 0.04);
  const particles: ParticleSpec[] = [];

  for (let i = 0; i < count; i++) {
    const slot = count <= 1 ? 0.5 : i / (count - 1);
    const spread = big ? 0.78 : 0.55;
    const angle = -Math.PI / 2 + (slot - 0.5) * Math.PI * spread;
    const reach = SCREEN_H * (big ? 0.38 : 0.28) + (i % 3) * 18;
    const lane = (i - (count - 1) / 2) * (big ? 28 : 22);

    particles.push({
      key: `${source.key}-${i}`,
      emoji: big ? (i % 2 === 0 ? primary : accent) : primary,
      mascot: mascot && !(big && i % 2 !== 0),
      startX: centerX + lane - 14,
      startY: baseY + (i % 2) * 6,
      driftX: Math.cos(angle) * reach * 0.55,
      riseY: -Math.abs(Math.sin(angle) * reach) - reach * 0.35,
      delay: i * 55,
      duration: big ? 2200 : 1800,
      rot: (slot - 0.5) * 36,
      size: big ? 26 + (i % 2) * 4 : 24,
      showName: i === Math.floor(count / 2) ? source.name : undefined,
    });
  }

  const ttl = Math.max(...particles.map((p) => p.delay + p.duration)) + 120;
  return { key: source.key, particles, ttl };
}

type Props = {
  vibes: SocialVibeEvent[];
  localBurst?: { vibe: string; name: string; tick: number } | null;
};

export function VibeOverlay({ vibes, localBurst }: Props) {
  const seenRef = useRef(new Set<string>());
  const recentLocalRef = useRef<{ vibe: string; at: number } | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);

  const spawn = useCallback((source: BurstSource) => {
    const burst = particlesForBurst(source);
    setBursts((prev) => [...prev, burst].slice(-4));
  }, []);

  const removeBurst = useCallback((key: string) => {
    setBursts((prev) => prev.filter((b) => b.key !== key));
  }, []);

  useEffect(() => {
    const fresh = vibes.filter((v) => !seenRef.current.has(v.id));
    if (!fresh.length) return;

    const now = Date.now();
    for (const vibe of fresh) {
      seenRef.current.add(vibe.id);
      const recent = recentLocalRef.current;
      if (recent && recent.vibe === vibe.vibe && now - recent.at < 5000) continue;
      spawn({ key: vibe.id, vibe: vibe.vibe, name: vibe.name });
    }
  }, [vibes, spawn]);

  useEffect(() => {
    if (!localBurst?.tick) return;
    recentLocalRef.current = { vibe: localBurst.vibe, at: Date.now() };
    spawn({
      key: `local-${localBurst.tick}`,
      vibe: localBurst.vibe,
      name: localBurst.name,
    });
  }, [localBurst?.tick, localBurst?.vibe, localBurst?.name, spawn]);

  if (!bursts.length) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {bursts.map((burst) => (
        <VibeBurst key={burst.key} burst={burst} onDone={() => removeBurst(burst.key)} />
      ))}
    </View>
  );
}

function VibeBurst({ burst, onDone }: { burst: Burst; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, burst.ttl);
    return () => clearTimeout(timer);
  }, [burst.ttl, onDone]);

  return (
    <>
      {burst.particles.map((p) => (
        <FlyingParticle key={p.key} particle={p} />
      ))}
    </>
  );
}

function FlyingParticle({ particle }: { particle: ParticleSpec }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withTiming(1, {
        duration: particle.duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [particle.delay, particle.duration, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.78, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, particle.driftX]) },
      { translateY: interpolate(progress.value, [0, 1], [0, particle.riseY]) },
      { scale: interpolate(progress.value, [0, 0.22, 0.65, 1], [0.45, 1.08, 1, 0.82]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, particle.rot])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, { left: particle.startX, bottom: particle.startY }, style]}>
      {particle.mascot ? (
        <MascotMark size={particle.size + 8} />
      ) : (
        <Text style={[styles.emoji, { fontSize: particle.size }]}>{particle.emoji}</Text>
      )}
      {particle.showName ? <Text style={styles.name}>{particle.showName}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  particle: {
    position: "absolute",
    alignItems: "center",
    width: 32,
  },
  emoji: {
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  name: {
    marginTop: 2,
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#1A2B5F",
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
});
