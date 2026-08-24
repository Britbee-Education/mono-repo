/** Short, K–8 friendly labels for garden collectibles. */

export function kidRarity(rarity?: string) {
  switch ((rarity || "").toLowerCase()) {
    case "epic":
      return "Mega";
    case "rare":
      return "Super";
    default:
      return "Nice";
  }
}

/** How much a plant helps the garden grow (flat Buzz). */
export function kidSeedHelp(seedPower?: number) {
  const n = Math.max(0, Math.round(seedPower || 0));
  if (n <= 0) return "Ready to plant";
  if (n === 1) return "Grows +1 Buzz";
  return `Grows +${n} Buzz`;
}

/** How much a worm helps — no % math for kids. */
export function kidWormHelp(boostPct?: number) {
  const n = Math.max(0, Math.round(boostPct || 0));
  if (n <= 0) return "Ready to help";
  if (n <= 3) return "Helps a little";
  if (n <= 5) return "Helps a lot";
  return "Super helper!";
}

export function kidPlantMeta(input: { rarity?: string; seedPower?: number; count?: number }) {
  const bits = [kidRarity(input.rarity), kidSeedHelp(input.seedPower)];
  if (input.count != null && input.count > 1) bits.unshift(`${input.count} plants`);
  return bits.join(" · ");
}

export function kidWormMeta(input: { rarity?: string; boostPct?: number; count?: number }) {
  const bits = [kidRarity(input.rarity), kidWormHelp(input.boostPct)];
  if (input.count != null && input.count > 1) bits.unshift(`${input.count} helpers`);
  return bits.join(" · ");
}
