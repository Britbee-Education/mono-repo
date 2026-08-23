import {
  BEE_BACKS,
  BEE_BLUSH,
  BEE_BODIES,
  BEE_EYES,
  BEE_GLASSES,
  BEE_HATS,
  BEE_STRIPES,
  BEE_WINGS,
  clampBeeLook,
  type BeeLook,
} from "@britbee/shared";

export type { BeeLook };

export const BODY_SWATCH: Record<BeeLook["body"], string> = {
  honey: "#F5C400",
  gold: "#FFB300",
  cream: "#FFE082",
  peach: "#FFAB91",
  pink: "#F48FB1",
  mint: "#81C784",
  sky: "#4FC3F7",
  lilac: "#B39DDB",
};

export const STRIPE_SWATCH: Record<BeeLook["stripe"], string> = {
  navy: "#1A2B5F",
  ink: "#212121",
  brown: "#6D4C41",
  plum: "#6A1B9A",
  teal: "#00695C",
};

export const BACK_SWATCH: Record<BeeLook["back"], string> = {
  navy: "#1A2B5F",
  blue: "#5B9BFF",
  violet: "#8C52FF",
  green: "#4CAF50",
  red: "#EF5350",
  yellow: "#F5C400",
  coral: "#FF8A65",
  teal: "#26A69A",
  rose: "#EC407A",
  cream: "#FFF3C4",
};

export const HAT_EMOJI: Record<BeeLook["hat"], string> = {
  none: "",
  bow: "🎀",
  cap: "🧢",
  crown: "👑",
  flower: "🌸",
  puffs: "🫧",
  phones: "🎧",
  halo: "✨",
};

export const EYE_LABEL: Record<BeeLook["eyes"], string> = {
  round: "Round",
  sparkle: "Sparkle",
  wink: "Wink",
  hearts: "Hearts",
  star: "Stars",
};

export const GLASS_LABEL: Record<BeeLook["glasses"], string> = {
  none: "None",
  round: "Round",
  sun: "Sun",
  heart: "Hearts",
  star: "Stars",
};

export const HAT_LABEL: Record<BeeLook["hat"], string> = {
  none: "None",
  bow: "Bow",
  cap: "Cap",
  crown: "Crown",
  flower: "Flower",
  puffs: "Puffs",
  phones: "Phones",
  halo: "Sparkle",
};

export const WING_LABEL: Record<BeeLook["wings"], string> = {
  clear: "Clear",
  sparkle: "Sparkle",
  rainbow: "Rainbow",
  gold: "Gold",
};

export const BODY_LABEL: Record<BeeLook["body"], string> = {
  honey: "Honey",
  gold: "Gold",
  cream: "Cream",
  peach: "Peach",
  pink: "Pink",
  mint: "Mint",
  sky: "Sky",
  lilac: "Lilac",
};

export const DEFAULT_LOOK: BeeLook = {
  body: "honey",
  stripe: "navy",
  eyes: "round",
  glasses: "round",
  hat: "none",
  blush: "pink",
  wings: "clear",
  back: "navy",
};

export function lookFromHue(hue = 0): BeeLook {
  const n = Math.abs(hue);
  return {
    body: BEE_BODIES[n % BEE_BODIES.length],
    stripe: BEE_STRIPES[n % BEE_STRIPES.length],
    eyes: BEE_EYES[n % 3],
    glasses: n % 4 === 1 ? "round" : "none",
    hat: n % 7 === 2 ? "bow" : "none",
    blush: "pink",
    wings: n % 5 === 0 ? "sparkle" : "clear",
    back: BEE_BACKS[n % BEE_BACKS.length],
  };
}

export function resolveLook(look?: BeeLook | null, hue = 0): BeeLook {
  return clampBeeLook(look) || lookFromHue(hue);
}

export function randomLook(): BeeLook {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
  return {
    body: pick(BEE_BODIES),
    stripe: pick(BEE_STRIPES),
    eyes: pick(BEE_EYES),
    glasses: pick(BEE_GLASSES),
    hat: pick(BEE_HATS),
    blush: pick(BEE_BLUSH),
    wings: pick(BEE_WINGS),
    back: pick(BEE_BACKS),
  };
}

export const LOOK_CATS = [
  { key: "body", label: "Fur" },
  { key: "stripe", label: "Stripes" },
  { key: "eyes", label: "Eyes" },
  { key: "glasses", label: "Glasses" },
  { key: "hat", label: "Hats" },
  { key: "wings", label: "Wings" },
  { key: "blush", label: "Cheeks" },
  { key: "back", label: "Hive" },
] as const;
