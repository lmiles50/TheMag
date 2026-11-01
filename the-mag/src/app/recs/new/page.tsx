"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Friend = { id: string; display_name: string; avatar_url: string | null };

export default function NewRec() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [friends, setFriends] = useState<Friend[]>([]);
  const [used, setUsed] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const [why, setWhy] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({}); // friend id -> note
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // everyone in my groups, minus me
      const { data: rows } = await supabase.from("group_members").select("user_id");
      const ids = Array.from(
        new Set((rows ?? []).map((r: { user_id: string }) => r.user_id))
      ).filter((id) => id !== user.id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", ids)
          .order("display_name");
        setFriends((profs as Friend[]) ?? []);
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
      setUsed(count ?? 0);
      setLoaded(true);
    }
    load();
  }, [supabase]);

  function togglePick(id: string) {
    setPicks((p) => {
      const next = { ...p };
      if (id in next) delete next[id];
      else next[id] = "";
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const l = link.trim();
    if (l && !l.startsWith("https://open.spotify.com/")) {
      setMsg("The song link should start with https://open.spotify.com/");
      return;
    }
    const pokes = Object.entries(picks).map(([to_user, note]) => ({
      to_user,
      note: note.trim(),
    }));
    if (pokes.some((p) => !p.note)) {
      setMsg("Write a note for everyone you're poking, so they know why.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("submit_rec", {
      p_title: title,
      p_artist: artist,
      p_link: l,
      p_why: why,
      p_pokes: pokes,
    });
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    router.push("/recs");
    router.refresh();
  }

  const left = 3 - used;
  const input = "w-full border border-black p-2";

  if (!loaded) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="underline">← Home</Link>
      <h1 className="my-4 text-3xl font-bold">Submit a rec</h1>

      {left <= 0 ? (
        <p>
          You&apos;ve used all 3 recs this month. They reset on the 1st, so
          save the next song for then.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-3">
          <p>
            {left} of 3 recs left this month. Make it count.
          </p>
          <input className={input} placeholder="Song title" value={title}
            onChange={(e) => setTitle(e.target.value)} required />
          <input className={input} placeholder="Artist" value={artist}
            onChange={(e) => setArtist(e.target.value)} required />
          <input className={input} placeholder="Spotify link (optional)" value={link}
            onChange={(e) => setLink(e.target.value)} />
          <textarea className={input} rows={5} value={why}
            placeholder="Why this song? How does it feel, where does it put you?"
            onChange={(e) => setWhy(e.target.value)} required />

          <h2 className="mt-4 text-xl font-bold">Poke friends</h2>
          {friends.length === 0 ? (
            <p>
              You don&apos;t share a group with anyone yet.{" "}
              <Link href="/groups" className="underline">Join or start a group</Link>{" "}
              to poke friends.
            </p>
          ) : (
            <ul className="grid gap-3">
              {friends.map((f) => (
                <li key={f.id} className="grid gap-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={f.id in picks}
                      onChange={() => togglePick(f.id)} />
                    {f.display_name}
                  </label>
                  {f.id in picks && (
                    <textarea className={input} rows={2}
                      placeholder={`Why will ${f.display_name} like this?`}
                      value={picks[f.id]}
                      onChange={(e) =>
                        setPicks((p) => ({ ...p, [f.id]: e.target.value }))
                      } />
                  )}
                </li>
              ))}
            </ul>
          )}

          {msg && <p className="text-red-700">{msg}</p>}
          <button disabled={busy} className="bg-black p-2 text-white disabled:opacity-50">
            {busy ? "Sending…" : "Submit rec"}
          </button>
        </form>
      )}
    </main>
  );
}