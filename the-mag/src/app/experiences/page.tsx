"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const KIND_LABEL: Record<string, string> = {
  concert: "Concert",
  show: "Show",
  local: "Local music",
  learned: "Learned something",
};

type Experience = {
  id: string;
  author_id: string;
  kind: string;
  title: string;
  place: string | null;
  happened_on: string | null;
  body: string;
  photo_paths: string[];
  video_path: string | null;
  created_at: string;
};

export default function ExperiencesPage() {
  const [supabase] = useState(() => createClient());
  const [me, setMe] = useState("");
  const [items, setItems] = useState<Experience[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setMe(user.id);

    const { data } = await supabase
      .from("experiences")
      .select("id, author_id, kind, title, place, happened_on, body, photo_paths, video_path, created_at")
      .order("created_at", { ascending: false });
    const list = (data as Experience[]) ?? [];
    setItems(list);

    const authorIds = Array.from(new Set(list.map((x) => x.author_id)));
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", authorIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; display_name: string }) => {
        map[p.id] = p.display_name;
      });
      setNames(map);
    }

    const allPaths = list.flatMap((x) =>
    x.video_path ? [...x.photo_paths, x.video_path] : x.photo_paths
    );

    if (allPaths.length) {
      const { data: signed } = await supabase.storage
        .from("experiences")
        .createSignedUrls(allPaths, 3600);
      const map: Record<string, string> = {};
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
      });
      setUrls(map);
    }
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(x: Experience) {
    if (!window.confirm(`Delete "${x.title}"?`)) return;
    setMsg("");
    const { error } = await supabase.from("experiences").delete().eq("id", x.id);
    if (error) {
      setMsg("Couldn't delete. Try again.");
      return;
    }
    const toRemove = x.video_path ? [...x.photo_paths, x.video_path] : x.photo_paths;
    if (toRemove.length) {
      await supabase.storage.from("experiences").remove(toRemove);
    }
    await load();
  }

  if (!loaded) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="underline">← Home</Link>
      <h1 className="my-4 text-3xl font-bold">Music experiences</h1>
      <Link href="/experiences/new" className="underline">Share one</Link>

      {msg && <p className="mt-4 text-red-700">{msg}</p>}

      {items.length === 0 ? (
        <p className="mt-6">
          Nothing here yet. Went to a show lately, or learned something about
          your local scene?
        </p>
      ) : (
        <ul className="mt-6 grid gap-6">
          {items.map((x) => (
            <li key={x.id} className="border border-black p-3">
              <p className="text-sm">
                {KIND_LABEL[x.kind] ?? x.kind} · {names[x.author_id] ?? "Someone"}
                {x.author_id === me ? " (you)" : ""}
              </p>
              <p className="text-xl font-bold">{x.title}</p>
              {(x.place || x.happened_on) && (
                <p className="italic">
                  {[x.place, x.happened_on && new Date(x.happened_on + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <p className="my-2 whitespace-pre-wrap">{x.body}</p>
              {x.photo_paths.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {x.photo_paths.map((p) =>
                    urls[p] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p} src={urls[p]} alt="" className="h-40 w-full border border-black object-cover" />
                    ) : null
                  )}
                </div>
              )}
                {x.video_path && urls[x.video_path] && (
                <video src={urls[x.video_path]} controls preload="metadata"
                  className="mt-2 max-h-80 w-full border border-black" />
              )}
              {x.author_id === me && (
                <button onClick={() => remove(x)} className="mt-3 underline">Delete</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}