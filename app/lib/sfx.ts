import { Audio } from "expo-av";

export type SfxName =
  | "tap"
  | "record"
  | "ok"
  | "miss"
  | "star"
  | "combo"
  | "fanfare"
  | "coin"
  | "buzz"
  | "unlock";

const sources: Record<SfxName, number> = {
  tap: require("../assets/sfx/tap.mp3"),
  record: require("../assets/sfx/record.mp3"),
  ok: require("../assets/sfx/ok.mp3"),
  miss: require("../assets/sfx/miss.mp3"),
  star: require("../assets/sfx/star.mp3"),
  combo: require("../assets/sfx/combo.mp3"),
  fanfare: require("../assets/sfx/fanfare.mp3"),
  coin: require("../assets/sfx/coin.mp3"),
  buzz: require("../assets/sfx/buzz.mp3"),
  unlock: require("../assets/sfx/unlock.mp3"),
};

const lastAt: Partial<Record<SfxName, number>> = {};
const gapMs: Partial<Record<SfxName, number>> = { tap: 45, ok: 90, star: 80 };

export function playSfx(name: SfxName, volume = 1) {
  const now = Date.now();
  if (lastAt[name] && now - lastAt[name]! < (gapMs[name] || 0)) return;
  lastAt[name] = now;
  void playClip(name, volume);
}

async function playClip(name: SfxName, volume: number) {
  try {
    const { sound } = await Audio.Sound.createAsync(sources[name], {
      shouldPlay: true,
      volume,
      isMuted: false,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) void sound.unloadAsync();
    });
  } catch {
    /* ignore missing audio session */
  }
}

export async function preloadSfx() {
  const names = Object.keys(sources) as SfxName[];
  await Promise.all(
    names.map(async (name) => {
      try {
        const { sound } = await Audio.Sound.createAsync(sources[name], { volume: 0 });
        await sound.unloadAsync();
      } catch {
        /* ignore */
      }
    })
  );
}
