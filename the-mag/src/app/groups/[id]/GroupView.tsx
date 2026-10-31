"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Member = { id: string; display_name: string; avatar_url: string | null };

export default function GroupView({ id }: { id: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [me, setMe] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMe(user?.id ?? "");

      const { data: g } = await supabase
        .from("groups")
        .select("name, join_code")
        .eq("id", id)
        .maybeSingle();
      if (!g) {
        setMissing(true);
        setLoaded(true);
        return;
      }
      setName(g.name);
      setJoinCode(g.join_code ?? "");

      const { data: rows } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", id);
      const ids = (rows ?? []).map((r: { user_id: string }) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids)
        .order("display_name");
      setMembers((profs as Member[]) ?? []);
      setLoaded(true);
    }
    load();
  }, [supabase, id]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(joinCode);
      setMsg("Code copied.");
    } catch {
      setMsg("Couldn't copy. Select the code and copy it by hand.");
    }
  }

  async function leave() {
    if (!window.confirm(`Leave ${name}?`)) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", id)
      .eq("user_id", me);
    if (error) {
      setMsg("Couldn't leave. Try again.");
      return;
    }
    router.push("/groups");
    router.refresh();
  }

  if (!loaded) return <main className="p-8">Loading…</main>;

  if (missing)
    return (
      <main className="p-8">
        <Link href="/groups" className="underline">← Groups</Link>
        <p className="mt-4">That group doesn&apos;t exist, or you&apos;re not in it.</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/groups" className="underline">← Groups</Link>
      <h1 className="my-4 text-3xl font-bold">{name}</h1>

      <div className="mb-6 border border-black p-3">
        <p>Invite friends with this code:</p>
        <p className="my-1 font-mono text-xl">{joinCode}</p>
        <button onClick={copyCode} className="underline">Copy code</button>
      </div>

      <h2 className="mb-2 text-xl font-bold">
        {members.length} {members.length === 1 ? "member" : "members"}
      </h2>
      <ul className="grid gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            {m.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.avatar_url} alt="" className="h-10 w-10 border border-black object-cover" />
            ) : (
              <div className="h-10 w-10 border border-black" />
            )}
            <span>{m.display_name}{m.id === me ? " (you)" : ""}</span>
          </li>
        ))}
      </ul>

      <button onClick={leave} className="mt-8 underline">Leave this group</button>
      {msg && <p className="mt-4">{msg}</p>}
    </main>
  );
}