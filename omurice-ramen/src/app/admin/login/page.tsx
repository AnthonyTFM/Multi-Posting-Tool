"use client";

import { useState } from "react";
import { Logo } from "@/components/SiteHeader";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/admin";
      return;
    }
    const d = await res.json().catch(() => ({}));
    setError(d.error || "Sign-in failed.");
    setBusy(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-rice p-8 shadow-lift">
        <Logo />
        <h1 className="mt-6 text-2xl font-extrabold">Staff dashboard</h1>
        <p className="mt-1 text-sm text-ink-3">Orders, reservations, menu and AI phone settings.</p>
        <label className="mt-6 block">
          <span className="text-sm font-semibold">Staff password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            className="mt-1.5 h-12 w-full rounded-xl border border-line bg-card px-4 outline-none focus:border-ink"
          />
        </label>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-ketchup">{error}</p>}
        <button disabled={busy || !password} className="mt-6 h-12 w-full rounded-full bg-ketchup font-semibold text-white hover:bg-ketchup-2 disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
