export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="page skeleton-page" aria-busy="true" aria-label="Loading">
      <div className="skeleton skeleton-hero" />
      <div className="skeleton skeleton-line wide" />
      <div className="skeleton-grid">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}

export function InlineSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="skeleton-inline" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton skeleton-line${i === 0 ? " wide" : ""}`} />
      ))}
    </div>
  );
}
