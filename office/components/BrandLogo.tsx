import logoDark from "../../../.cursor/projects/Users-agnisarvaloka-britbee/assets/logo-dark-d4129fd3-18c0-4a1c-9e11-4d7897874dcb.png";

export function BrandLogo({ width = 176 }: { width?: number; compact?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoDark.src}
      alt="BritBee"
      width={width}
      height={Math.round(width * (187 / 281))}
      className="brand-logo"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    />
  );
}
