"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Group = { id: string; name: string };

export default function GroupsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [groups, setGroups] = useState<Group[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("groups")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        setGroups((data as Group[]) ?? []);
        setLoaded(true);
      });
  }, [supabase]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const { data, error } = await supabase.rpc("create_group", { group_name: newName });
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    router.push(`/groups/${data}`);
  }

  async function joinGroup(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const { data, error } = await supabase.rpc("join_group", { group_code: code });
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    router.push(`/groups/${data}`);
  }

  const input = "w-full border border-black p-2";
  const button = "bg-black p-2 text-white disabled:opacity-50";

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="underline">← Home</Link>
      <h1 className="my-4 text-3xl font-bold">Your groups</h1>

      {!loaded ? (
        <p>Loading…</p>
      ) : groups.length === 0 ? (
        <p>You&apos;re not in a group yet. Make one or join one below.</p>
      ) : (
        <ul className="grid gap-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`} className="underline">{g.name}</Link>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={joinGroup} className="mt-8 grid gap-2">
        <h2 className="text-xl font-bold">Join with a code</h2>
        <input className={input} placeholder="Group code" value={code}
          onChange={(e) => setCode(e.target.value)} required />
        <button disabled={busy} className={button}>Join</button>
      </form>

      <form onSubmit={createGroup} className="mt-8 grid gap-2">
        <h2 className="text-xl font-bold">Start a new group</h2>
        <input className={input} placeholder="Group name" value={newName}
          onChange={(e) => setNewName(e.target.value)} required />
        <button disabled={busy} className={button}>Create</button>
      </form>

      {msg && <p className="mt-4 text-red-700">{msg}</p>}
    </main>
  );
}