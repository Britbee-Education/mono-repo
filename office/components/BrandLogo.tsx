/**
 * Full BritBee lockup (mascot + wordmark + tagline) from /logo.png.
 * Do NOT also render MascotMark on the same surface — that doubles the bee.
 * Use MascotMark alone on standalone error / not-found pages (outside Shell).
 */
export function BrandLogo({ width = 176 }: { width?: number; compact?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="BritBee"
      width={width}
      height={Math.round(width * (503 / 580))}
      className="brand-logo"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    />
  );
}
