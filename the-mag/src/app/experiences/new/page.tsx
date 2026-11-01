"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";

const KINDS = [
  { value: "concert", label: "A concert" },
  { value: "show", label: "A show" },
  { value: "local", label: "Local music" },
  { value: "learned", label: "Something I learned" },
];

const MAX_VIDEO_MB = 40;

export default function NewExperience() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [kind, setKind] = useState("concert");
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setMsg(picked.length > 4 ? "Up to 4 photos. I kept the first 4." : "");
    setFiles(picked.slice(0, 4));
  }

  function pickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_VIDEO_MB * 1024 * 1024) {
      setMsg(
        `That video is ${(f.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_VIDEO_MB} MB, so trim it shorter first.`
      );
      e.target.value = "";
      setVideo(null);
      return;
    }
    setMsg("");
    setVideo(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const id = crypto.randomUUID();
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const blob = await resizeImage(files[i], 1280);
        const path = `${user.id}/${id}-${i}.jpg`;
        const { error } = await supabase.storage
          .from("experiences")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        paths.push(path);
      }

      let videoPath: string | null = null;
      if (video) {
        const ext = video.name.split(".").pop()?.toLowerCase() || "mp4";
        videoPath = `${user.id}/${id}-video.${ext}`;
        const { error } = await supabase.storage
          .from("experiences")
          .upload(videoPath, video, {
            contentType: video.type || "video/mp4",
          });
        if (error) throw error;
      }

      const { error } = await supabase.from("experiences").insert({
        id,
        author_id: user.id,
        kind,
        title: title.trim(),
        place: place.trim() || null,
        happened_on: date || null,
        body: body.trim(),
        photo_paths: paths,
        video_path: videoPath,
      });
      if (error) throw error;

      router.push("/experiences");
      router.refresh();
    } catch {
      setMsg("That didn't save. Try again, or try a smaller video.");
      setBusy(false);
    }
  }

  const input = "w-full border border-black p-2";

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/experiences" className="underline">← Experiences</Link>
      <h1 className="my-4 text-3xl font-bold">Share a music experience</h1>

      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1">
          What kind?
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        <input className={input} placeholder="Title (the band, the night, the thing)"
          value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className={input} placeholder="Where? (venue, city)" value={place}
          onChange={(e) => setPlace(e.target.value)} />
        <label className="grid gap-1">
          When?
          <input className={input} type="date" value={date}
            onChange={(e) => setDate(e.target.value)} />
        </label>
        <textarea className={input} rows={6} value={body}
          placeholder="Tell us about it. What happened, how did it feel, what should we know?"
          onChange={(e) => setBody(e.target.value)} required />
        <label className="grid gap-1 text-sm">
          Photos (optional, up to 4)
          <input type="file" accept="image/*" multiple onChange={pickFiles} />
        </label>
        {files.length > 0 && <p className="text-sm">{files.length} photo(s) selected.</p>}
        <label className="grid gap-1 text-sm">
          One video (optional, up to {MAX_VIDEO_MB} MB, mp4 plays everywhere)
          <input type="file" accept="video/mp4,video/quicktime,video/webm"
            onChange={pickVideo} />
        </label>
        {video && (
          <p className="text-sm">
            Video selected: {(video.size / 1024 / 1024).toFixed(1)} MB
          </p>
        )}
        {msg && <p className="text-red-700">{msg}</p>}
        <button disabled={busy} className="bg-black p-2 text-white disabled:opacity-50">
          {busy ? "Posting… (videos take a moment)" : "Post it"}
        </button>
      </form>
    </main>
  );
}