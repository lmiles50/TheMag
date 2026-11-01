"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Rec = {
  id: string;
  title: string;
  artist: string;
  why: string;
  spotify_url: string | null;
  created_at: string;
};

export default function MyRecs() {
  const [supabase] = useState(() => createClient());
  const [recs, setRecs] = useState<Rec[]>([]);
  const [pokedNames, setPokedNames] = useState<Record<string, string[]>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: mine } = await supabase
        .from("recs")
        .select("id, title, artist, why, spotify_url, created_at")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });
      const list = (mine as Rec[]) ?? [];
      setRecs(list);

      if (list.length) {
        const { data: pokes } = await supabase
          .from("pokes")
          .select("rec_id, to_user")
          .in("rec_id", list.map((r) => r.id));
        const pokeRows = (pokes ?? []) as { rec_id: string; to_user: string }[];
        const ids = Array.from(new Set(pokeRows.map((p) => p.to_user)));
        const names: Record<string, string> = {};
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", ids);
          (profs ?? []).forEach((p: { id: string; display_name: string }) => {
            names[p.id] = p.display_name;
          });
        }
        const byRec: Record<string, string[]> = {};
        pokeRows.forEach((p) => {
          (byRec[p.rec_id] ??= []).push(names[p.to_user] ?? "Someone");
        });
        setPokedNames(byRec);
      }
      setLoaded(true);
    }
    load();
  }, [supabase]);

  if (!loaded) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="underline">← Home</Link>
      <h1 className="my-4 text-3xl font-bold">Your recs</h1>
      <Link href="/recs/new" className="underline">Submit a new rec</Link>

      {recs.length === 0 ? (
        <p className="mt-6">Nothing yet. Your first rec is waiting.</p>
      ) : (
        <ul className="mt-6 grid gap-6">
          {recs.map((r) => (
            <li key={r.id} className="border border-black p-3">
              <p className="text-xl font-bold">{r.title}</p>
              <p className="italic">{r.artist}</p>
              <p className="my-2 whitespace-pre-wrap">{r.why}</p>
              {r.spotify_url && (
                <a href={r.spotify_url} target="_blank" rel="noopener noreferrer"
                  className="underline">Listen on Spotify</a>
              )}
              <p className="mt-2 text-sm">
                {pokedNames[r.id]?.length
                  ? `Poked: ${pokedNames[r.id].join(", ")}`
                  : "Nobody poked yet"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}