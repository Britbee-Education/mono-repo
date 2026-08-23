"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ScreenDecor } from "@/components/ScreenDecor";
import { API, getToken, saveSession } from "@/lib/api";

export default function OfficeLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("guide@britbee.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portal: "office" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not log in.");
      saveSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <ScreenDecor />
      <div className="card" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <BrandLogo width={176} />
        </div>
        <div className="eyebrow" style={{ marginTop: 8 }}>
          Guide office
        </div>
        <h1 className="hello" style={{ fontSize: 22, marginTop: 4 }}>
          Welcome, mentor
        </h1>
        <p className="lead" style={{ marginBottom: 18 }}>
          Log in with your staff email. This is not the kids app.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <div className="field-box">
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guide@britbee.test"
                autoComplete="username"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="field-box">
              <input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
              <button type="button" className="signout" onClick={() => setShow((s) => !s)} style={{ padding: 0 }}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error ? <div className="error-box">{error}</div> : null}
          <button className="btn btn-yellow" disabled={loading}>
            {loading ? "Please wait…" : "Log in"}
          </button>
        </form>
        <p className="hint" style={{ textAlign: "center", marginTop: 16 }}>
          Demo: guide@britbee.test / password123
        </p>
      </div>
    </main>
  );
}
