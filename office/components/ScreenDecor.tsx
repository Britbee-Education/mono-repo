export function ScreenDecor() {
  return (
    <div className="decor" aria-hidden>
      <div className="decor-blob tl" />
      <div className="decor-blob br" />
      <div className="decor-blob bl" />
      <div className="hex" style={{ top: 36, right: 28, width: 34, height: 30 }} />
      <div className="hex" style={{ top: 64, right: 54, width: 46, height: 41 }} />
      <div className="dots" style={{ top: 18, left: 22, gridTemplateColumns: "repeat(5, 4px)" }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}
