/** Official BritBee mascot (bee.png only). Never emoji. Never pair with BrandLogo. */
export function MascotMark({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/bee.png"
      alt="BritBee"
      width={size}
      height={Math.round(size * (155 / 232))}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

/** Initials avatar — use inside Shell so BrandLogo is the only bee. */
export function InitialsMark({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        display: "grid",
        placeItems: "center",
        background: "#FFF3C4",
        color: "#1B2B4B",
        fontWeight: 800,
        fontSize: Math.max(12, size * 0.4),
      }}
    >
      {letter}
    </span>
  );
}
