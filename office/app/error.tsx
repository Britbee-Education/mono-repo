"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ maxWidth: 560, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🐝</div>
        <h1 className="hello" style={{ marginBottom: 6 }}>Oops, hive hiccup</h1>
        <p className="lead">
          Something went wrong here. Our bee is already fixing it. Try again and continue helping learners.
        </p>
        <p className="hint" style={{ wordBreak: "break-word" }}>
          {error.message || "Unexpected error"}
        </p>
        <div style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-yellow" onClick={() => reset()} style={{ maxWidth: 220 }}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

