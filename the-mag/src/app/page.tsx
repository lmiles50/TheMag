import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { connection } from "next/server";
async function Welcome() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="my-4 grid gap-1">
      <p>Hi, {profile?.display_name ?? "friend"}.</p>
      <Link href="/profile" className="underline">Profile</Link>
      <Link href="/groups" className="underline">Groups</Link>
      <Link href="/recs/new" className="underline">Submit a rec</Link>
      <Link href="/recs" className="underline">Your recs</Link>
      <Link href="/pokes" className="underline">Pokes for you</Link>
      <form action={signOut}>
        <button className="underline">Sign out</button>
      </form>
    </div>
  );
}

async function RecCount() {
  await connection();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("recs")
    .select("*", { count: "exact", head: true });

  return (
    <p>
      {error ? `Error: ${error.message}` : `Connected. ${count ?? 0} recs so far.`}
    </p>
  );
}

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">The Mag</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Welcome />
        <RecCount />
      </Suspense>
    </main>
  );
}