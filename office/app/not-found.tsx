import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ maxWidth: 560, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🐝</div>
        <h1 className="hello" style={{ marginBottom: 6 }}>Page flew away</h1>
        <p className="lead">This hive lane does not exist. Let’s buzz you back to your dashboard.</p>
        <div style={{ marginTop: 14 }}>
          <Link href="/dashboard" className="btn btn-yellow" style={{ maxWidth: 220, display: "inline-flex", justifyContent: "center" }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

