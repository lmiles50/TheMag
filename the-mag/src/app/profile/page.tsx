"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";

export default function ProfilePage() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [spotify, setSpotify] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [recCount, setRecCount] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, spotify_url, avatar_url")
        .eq("id", user.id)
        .single();
      if (p) {
        setName(p.display_name ?? "");
        setSpotify(p.spotify_url ?? "");
        setAvatarUrl(p.avatar_url ?? "");
      }

      const now = new Date();
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      ).toISOString();
      const { count } = await supabase
        .from("recs")
        .select("*", { count: "exact", head: true })
        .eq("author_id", user.id)
        .gte("created_at", monthStart);
      setRecCount(count ?? 0);
      setLoaded(true);
    }
    load();
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const link = spotify.trim();
    if (link && !link.startsWith("https://open.spotify.com/")) {
      setMsg("Spotify link should start with https://open.spotify.com/");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), spotify_url: link || null })
      .eq("id", userId);
    setMsg(error ? "Couldn't save. Try again." : "Saved.");
    setBusy(false);
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("Uploading…");
    setBusy(true);
    try {
      const blob = await resizeImage(file, 512);
      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`; // bust the cache
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      setAvatarUrl(url);
      setMsg("Photo updated.");
    } catch {
      setMsg("That photo didn't upload. Try a different image.");
    }
    setBusy(false);
  }

  const input = "w-full border border-black p-2";

  if (!loaded) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="underline">← Home</Link>
      <h1 className="my-4 text-3xl font-bold">Your profile</h1>

      <div className="mb-6 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-24 w-24 border border-black object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center border border-black">
            no photo
          </div>
        )}
        <label className="cursor-pointer underline">
          Change photo
          <input type="file" accept="image/*" className="hidden"
            onChange={uploadAvatar} disabled={busy} />
        </label>
      </div>

      <form onSubmit={save} className="grid gap-3">
        <label className="grid gap-1">
          Name
          <input className={input} value={name}
            onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="grid gap-1">
          Spotify profile link
          <input className={input} value={spotify} placeholder="https://open.spotify.com/user/…"
            onChange={(e) => setSpotify(e.target.value)} />
        </label>
        <button disabled={busy} className="bg-black p-2 text-white disabled:opacity-50">
          Save
        </button>
        {msg && <p>{msg}</p>}
      </form>

      <p className="mt-8">
        Recs this month: <b>{recCount} of 3</b>
      </p>
    </main>
  );
}