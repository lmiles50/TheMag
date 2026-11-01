"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";

type Client = ReturnType<typeof createClient>;

type PokeItem = {
  id: string;
  note: string;
  from: string;
  rec: {
    title: string;
    artist: string;
    why: string;
    spotify_url: string | null;
  } | null;
  reaction: { body: string; photoUrl: string | null } | null;
};

function PokeCard({
  item,
  userId,
  supabase,
  onSaved,
}: {
  item: PokeItem;
  userId: string;
  supabase: Client;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(!item.reaction);
  const [body, setBody] = useState(item.reaction?.body ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      let path: string | null = null;
      if (file) {
        const blob = await resizeImage(file, 1280);
        path = `${userId}/${item.id}.jpg`;
        const { error } = await supabase.storage
          .from("reactions")
          .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (error) throw error;
      }
      const { error } = await supabase.rpc("respond_to_poke", {
        p_poke: item.id,
        p_body: body,
        p_photo: path,
      });
      if (error) throw error;
      setFile(null);
      setEditing(false);
      await onSaved();
    } catch {
      setMsg("That didn't save. Try again.");
    }
    setBusy(false);
  }

  const input = "w-full border border-black p-2";

  return (
    <li className="border border-black p-3">
      <p className="text-sm">{item.from} poked you with</p>
      <p className="text-xl font-bold">{item.rec?.title ?? "A song"}</p>
      <p className="italic">{item.rec?.artist}</p>
      {item.rec?.spotify_url && (
        <a href={item.rec.spotify_url} target="_blank" rel="noopener noreferrer"
          className="underline">Listen on Spotify</a>
      )}

      <p className="mt-3 text-sm font-bold">Why they thought you&apos;d like it</p>
      <p className="whitespace-pre-wrap">{item.note}</p>

      {item.rec?.why && (
        <>
          <p className="mt-3 text-sm font-bold">Why they picked it</p>
          <p className="whitespace-pre-wrap">{item.rec.why}</p>
        </>
      )}

      <div className="mt-4 border-t border-black pt-3">
        {editing ? (
          <form onSubmit={save} className="grid gap-2">
            <p className="font-bold">How did it feel?</p>
            <textarea className={input} rows={4} value={body}
              placeholder="Where did it put you? Where were you, what were you doing?"
              onChange={(e) => setBody(e.target.value)} required />
            <label className="grid gap-1 text-sm">
              Photo (optional): you listening, or where you were
              <input type="file" accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {msg && <p className="text-red-700">{msg}</p>}
            <div className="flex gap-4">
              <button disabled={busy} className="bg-black p-2 text-white disabled:opacity-50">
                {busy ? "Saving…" : item.reaction ? "Save changes" : "Send response"}
              </button>
              {item.reaction && (
                <button type="button" className="underline"
                  onClick={() => { setEditing(false); setFile(null); setMsg(""); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="grid gap-2">
            <p className="font-bold">Your response</p>
            <p className="whitespace-pre-wrap">{item.reaction?.body}</p>
            {item.reaction?.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.reaction.photoUrl} alt="" className="max-h-64 border border-black object-cover" />
            )}
            <button className="text-left underline" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function PokesPage() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<PokeItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: pokes } = await supabase
      .from("pokes")
      .select("id, note, rec_id, created_at")
      .eq("to_user", user.id)
      .order("created_at", { ascending: false });
    const rows = pokes ?? [];
    if (!rows.length) {
      setItems([]);
      setLoaded(true);
      return;
    }

    const { data: recs } = await supabase
      .from("recs")
      .select("id, author_id, title, artist, why, spotify_url")
      .in("id", rows.map((p) => p.rec_id));
    const recById = new Map((recs ?? []).map((r) => [r.id, r]));

    const authorIds = Array.from(new Set((recs ?? []).map((r) => r.author_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", authorIds);
    const nameById = new Map((profs ?? []).map((p) => [p.id, p.display_name]));

    const { data: reacts } = await supabase
      .from("reactions")
      .select("poke_id, body, photo_path")
      .in("poke_id", rows.map((p) => p.id));

    // private bucket: swap each stored path for a temporary link
    const paths = (reacts ?? []).map((r) => r.photo_path).filter(Boolean) as string[];
    const urlByPath = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("reactions")
        .createSignedUrls(paths, 3600);
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
      });
    }
    const reactByPoke = new Map(
      (reacts ?? []).map((r) => [
        r.poke_id,
        {
          body: r.body as string,
          photoUrl: r.photo_path ? urlByPath.get(r.photo_path) ?? null : null,
        },
      ])
    );

    setItems(
      rows.map((p) => {
        const rec = recById.get(p.rec_id);
        return {
          id: p.id,
          note: p.note,
          from: rec ? nameById.get(rec.author_id) ?? "Someone" : "Someone",
          rec: rec
            ? { title: rec.title, artist: rec.artist, why: rec.why, spotify_url: rec.spotify_url }
            : null,
          reaction: reactByPoke.get(p.id) ?? null,
        };
      })
    );
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return <main className="p-8">Loading…</main>;

  const waiting = items.filter((i) => !i.reaction).length;

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="underline">← Home</Link>
      <h1 className="my-4 text-3xl font-bold">Pokes for you</h1>

      {items.length === 0 ? (
        <p>No pokes yet. When a friend thinks you&apos;d love a song, it lands here.</p>
      ) : (
        <>
          <p className="mb-4">
            {waiting > 0
              ? `${waiting} waiting for your response.`
              : "You've responded to everything."}
          </p>
          <ul className="grid gap-6">
            {items.map((item) => (
              <PokeCard key={item.id} item={item} userId={userId}
                supabase={supabase} onSaved={load} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}