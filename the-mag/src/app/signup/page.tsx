"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const supabase = createClient();

    const { data: valid } = await supabase.rpc("check_invite", { invite: code });
    if (!valid) {
      setError("That invite code isn't valid or has already been used.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name.trim(), invite_code: code } },
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const input = "w-full border border-black p-2";

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-3xl font-bold">Join The Mag</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input className={input} placeholder="Your name" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input className={input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Password (8+ characters)"
          minLength={8} value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        <input className={input} placeholder="Invite code" value={code}
          onChange={(e) => setCode(e.target.value)} required />
        {error && <p className="text-red-700">{error}</p>}
        <button disabled={busy} className="bg-black p-2 text-white disabled:opacity-50">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4">
        Already in? <Link className="underline" href="/login">Log in</Link>
      </p>
    </main>
  );
}