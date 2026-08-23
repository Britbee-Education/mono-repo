import { BACK_SWATCH, type BeeLook } from "@/lib/look";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeHex(input: string) {
  // DiceBear expects hex without `#` for many color params.
  return input.startsWith("#") ? input.slice(1) : input;
}

export function beeDicebearSeed(look: BeeLook, hue: number) {
  // Seed maps to what the avatar editor will change.
  // We keep it limited so UI controls feel meaningful:
  // - back  -> backgroundColor
  // - wings/style is fixed (adventurer-neutral), so it should not affect the seed.
  return `${hue}|${look.back}`;
}

function styleFromWings(wings: BeeLook["wings"]) {
  // Requirement: always use adventurer-neutral.
  // (We still accept `wings` to keep storage/backwards compat, but ignore it for style.)
  return "adventurer-neutral";
}

function eyesVariantFromBeeEyes(eyes: BeeLook["eyes"]) {
  // DiceBear adventurer-neutral supports: eyesVariant variant01..variant26
  // We map bee-eye styles to a small stable set of variants.
  switch (eyes) {
    case "round":
      return "variant01";
    case "sparkle":
      return "variant02";
    case "wink":
      return "variant03";
    case "hearts":
      return "variant04";
    case "star":
    default:
      return "variant05";
  }
}

function eyebrowsVariantFromBeeGlasses(glasses: BeeLook["glasses"]) {
  // DiceBear adventurer-neutral supports: eyebrowsVariant variant01..variant15
  switch (glasses) {
    case "none":
      return "variant01";
    case "round":
      return "variant02";
    case "sun":
      return "variant03";
    case "heart":
      return "variant04";
    case "star":
    default:
      return "variant05";
  }
}

function mouthVariantFromBeeHat(hat: BeeLook["hat"]) {
  // DiceBear adventurer-neutral supports: mouthVariant variant01..variant30
  switch (hat) {
    case "none":
      return "variant01";
    case "bow":
      return "variant02";
    case "cap":
      return "variant03";
    case "crown":
      return "variant04";
    case "flower":
      return "variant05";
    case "puffs":
      return "variant06";
    case "phones":
      return "variant07";
    case "halo":
    default:
      return "variant08";
  }
}

/**
 * DiceBear HTTP API image URL (PNG).
 * We generate a “real avatar image” via DiceBear, then optionally overlay bee-specific elements in the UI.
 */
export function beeDicebearPngUrl({
  style,
  look,
  hue,
  size,
}: {
  style?: string;
  look: BeeLook;
  hue: number;
  size: number;
}) {
  const seed = beeDicebearSeed(look, hue);
  const resolvedStyle = style || styleFromWings(look.wings);
  const bg = normalizeHex(BACK_SWATCH[look.back]);
  const px = clamp(Math.round(size * 3), 64, 256);
  // Example: https://api.dicebear.com/10.x/lorelei/png?seed=Felix&size=128&backgroundColor=...
  const eyesVariant = eyesVariantFromBeeEyes(look.eyes);
  const eyebrowsVariant = eyebrowsVariantFromBeeGlasses(look.glasses);
  const mouthVariant = mouthVariantFromBeeHat(look.hat);

  return `https://api.dicebear.com/10.x/${encodeURIComponent(resolvedStyle)}/png?seed=${encodeURIComponent(seed)}&size=${px}&backgroundColor=${encodeURIComponent(bg)}&eyesVariant=${encodeURIComponent(
    eyesVariant
  )}&eyebrowsVariant=${encodeURIComponent(eyebrowsVariant)}&mouthVariant=${encodeURIComponent(mouthVariant)}`;
}

export function crittersDicebearPngUrl({ seed, size }: { seed: string; size: number }) {
  const px = clamp(Math.round(size), 24, 1200);
  return `https://api.dicebear.com/10.x/critters/png?seed=${encodeURIComponent(seed)}&size=${px}`;
}

export function sproutsDicebearPngUrl({ seed, size }: { seed: string; size: number }) {
  const px = clamp(Math.round(size), 24, 1200);
  return `https://api.dicebear.com/10.x/sprouts/png?seed=${encodeURIComponent(seed)}&size=${px}`;
}

export function planetsDicebearPngUrl({ seed, size }: { seed: string; size: number }) {
  const px = clamp(Math.round(size), 24, 1200);
  return `https://api.dicebear.com/10.x/planets/png?seed=${encodeURIComponent(seed)}&size=${px}`;
}

