"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email or password didn't match.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const input = "w-full border border-black p-2";

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-3xl font-bold">The Mag</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input className={input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-700">{error}</p>}
        <button disabled={busy} className="bg-black p-2 text-white disabled:opacity-50">
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4">
        Have an invite code? <Link className="underline" href="/signup">Sign up</Link>
      </p>
    </main>
  );
}