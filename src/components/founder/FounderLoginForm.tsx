"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FounderLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/founder/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setPassword("");
        router.refresh();
        return;
      }
      setError(data?.message ?? "Sign-in failed.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: 440 }} noValidate>
      <h1>Founder sign-in</h1>
      <p className="small muted">This area is private. Only the authorised founder account can see orders.</p>
      <div className="form-row">
        <label className="field" htmlFor="f-email">Email</label>
        <input id="f-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="form-row">
        <label className="field" htmlFor="f-password">Password</label>
        <input id="f-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div aria-live="assertive">{error && <p className="notice notice-error">{error}</p>}</div>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
