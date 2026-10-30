import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function RecCount() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("recs")
    .select("*", { count: "exact", head: true });

  return (
    <p>
      {error
        ? `Error: ${error.message}`
        : `Connected. ${count ?? 0} recs so far.`}
    </p>
  );
}

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">The Mag</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <RecCount />
      </Suspense>
    </main>
  );
}