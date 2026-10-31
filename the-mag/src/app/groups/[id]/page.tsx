import { Suspense } from "react";
import GroupView from "./GroupView";

async function Loader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupView id={id} />;
}

export default function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="p-8">Loading…</main>}>
      <Loader params={params} />
    </Suspense>
  );
}