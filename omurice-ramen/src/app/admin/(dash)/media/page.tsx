"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/components/admin/api";
import type { Media } from "@/lib/media";
import type { Socials } from "@/lib/settings";

type Library = { media: Media[]; heroMediaId: string | null; galleryIds: string[]; socials: Socials };
type Upload = { name: string; progress: number; error?: string; processing?: boolean; done?: boolean };

const MAX_EDGE = 2000;

/**
 * Downscale big photos in the browser (12MP phone shots -> ~2000px) and
 * re-encode every JPEG, which drops hidden EXIF data such as GPS location.
 */
async function prepareImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file); // applies EXIF rotation
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.type !== "image/jpeg" && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), type, 0.85));
  } catch {
    return file;
  }
}

function uploadOne(blob: Blob, name: string, onProgress: (p: number) => void): Promise<Media> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.setRequestHeader("X-Omurice-Upload", "1");
    xhr.setRequestHeader("X-Alt", encodeURIComponent(name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ")));
    xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const body = (() => {
        try {
          return JSON.parse(xhr.responseText);
        } catch {
          return {};
        }
      })();
      if (xhr.status === 401) window.location.href = "/admin/login";
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(blob);
  });
}

function Preview({ m, className = "" }: { m: Media; className?: string }) {
  return m.kind === "video" ? (
    <video src={m.url} poster={m.poster ?? undefined} className={`h-full w-full object-cover ${className}`} muted loop playsInline preload="metadata" onMouseEnter={(e) => void e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.url} alt={m.alt} className={`h-full w-full object-cover ${className}`} loading="lazy" />
  );
}

export default function MediaAdmin() {
  const [lib, setLib] = useState<Library | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [drag, setDrag] = useState(false);
  const [socials, setSocials] = useState<Socials | null>(null);
  const [saved, setSaved] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const d = await adminFetch<Library>("/api/admin/media");
    setLib(d);
    setSocials((s) => s ?? d.socials);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function handleFiles(files: FileList | File[]) {
    const list = [...files];
    setUploads((u) => [...u, ...list.map((f) => ({ name: f.name, progress: 0 }))]);
    for (const f of list) {
      const set = (patch: Partial<Upload>) => setUploads((u) => u.map((x) => (x.name === f.name ? { ...x, ...patch } : x)));
      try {
        const isVideo = !f.type.startsWith("image/");
        const blob = isVideo ? f : await prepareImage(f);
        await uploadOne(blob, f.name, (p) => set({ progress: p, processing: isVideo && p >= 1 }));
        set({ progress: 1, processing: false, done: true });
        setTimeout(() => setUploads((u) => u.filter((x) => x.name !== f.name || x.error)), 1200);
      } catch (e) {
        set({ error: e instanceof Error ? e.message : "Upload failed" });
      }
    }
    await load();
  }

  async function patchSettings(body: Record<string, unknown>, msg = "Saved") {
    await adminFetch("/api/admin/settings", { method: "PATCH", body });
    await load();
    setSaved(msg);
    setTimeout(() => setSaved(""), 1500);
  }

  if (!lib) return <p className="text-ink-3">Loading…</p>;
  const byId = new Map(lib.media.map((m) => [m.id, m]));
  const gallery = lib.galleryIds.map((id) => byId.get(id)).filter((m): m is Media => !!m);
  const moveGallery = (i: number, d: number) => {
    const ids = [...lib.galleryIds];
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void patchSettings({ galleryIds: ids });
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="mr-auto text-3xl font-extrabold">Photos &amp; video</h1>
        {saved && <span className="text-sm font-semibold text-matcha">{saved} ✓</span>}
      </div>
      <p className="mt-1 text-sm text-ink-3">Upload your Instagram photos and reels, then choose the home-page hero, the gallery, and menu-item photos (Menu → Edit → Photo).</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`mt-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${drag ? "border-seal bg-seal/5" : "border-line bg-card"}`}
      >
        <p className="text-lg font-bold">Drop photos &amp; videos here</p>
        <p className="mt-1 text-sm text-ink-3">JPG, PNG, WebP · iPhone/Android videos (MOV, MP4) up to 500 MB, under 3 minutes. Videos are converted automatically.</p>
        <button type="button" onClick={() => input.current?.click()} className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-rice">Choose files</button>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>
      {uploads.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {uploads.map((u) => (
            <li key={u.name} className="rounded-xl bg-card px-4 py-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate">{u.name}</span>
                <span className={u.error ? "text-seal" : "text-ink-3"}>
                  {u.error ?? (u.progress >= 1 && u.processing ? "Converting video…" : u.done ? "Done ✓" : `${Math.round(u.progress * 100)}%`)}
                </span>
              </div>
              {!u.error && <div className="mt-1 h-1 rounded bg-line"><div className="h-1 rounded bg-seal transition-all" style={{ width: `${u.progress * 100}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 rounded-2xl bg-card px-5 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">Tips for great results</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
          <li><strong>Hero video:</strong> 8–20 second clip (broth pour, omurice fold, the neon sign), landscape or square, under 40 MB. It plays muted on a loop.</li>
          <li><strong>From Instagram:</strong> open the post → ••• → Download (or save your original from Photos). Reels download as MP4.</li>
          <li><strong>iPhone videos:</strong> upload straight from your camera roll. 4K/HEVC clips are converted to a web-friendly MP4 automatically (takes a minute for long clips).</li>
          <li><strong>iPhone photos:</strong> HEIC photos won&apos;t upload from a computer. Upload from the iPhone itself (it converts automatically) or set Settings → Camera → Formats → Most Compatible.</li>
          <li><strong>Menu photos:</strong> one dish per photo, shot from above or at 45°, natural light.</li>
        </ul>
      </details>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Home page hero</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="h-28 w-48 overflow-hidden rounded-xl bg-ink">
            {lib.heroMediaId && byId.get(lib.heroMediaId) ? (
              <Preview m={byId.get(lib.heroMediaId)!} />
            ) : (
              <video src="/brand/hero.mp4" poster="/brand/hero-poster.jpg" className="h-full w-full object-cover" muted loop playsInline autoPlay />
            )}
          </div>
          {lib.heroMediaId ? (
            <button type="button" onClick={() => patchSettings({ heroMediaId: null })} className="text-sm font-semibold text-seal underline">Use the default dining-room video</button>
          ) : (
            <p className="text-sm text-ink-3">Showing your dining-room video (default). Pick any photo or video below with “Set hero”.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Home page gallery <span className="text-sm font-medium text-ink-3">({gallery.length})</span></h2>
        {gallery.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">Nothing yet. Add photos/videos below with “+ Gallery”. 6–12 works best.</p>
        ) : (
          <ol className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {gallery.map((m, i) => (
              <li key={m.id} className="w-32 shrink-0">
                <div className="aspect-square overflow-hidden rounded-xl"><Preview m={m} /></div>
                <div className="mt-1 flex justify-between text-xs font-bold">
                  <button type="button" onClick={() => moveGallery(i, -1)} disabled={i === 0} className="px-2 disabled:opacity-30" aria-label="Move earlier">←</button>
                  <span className="text-ink-3">{i + 1}</span>
                  <button type="button" onClick={() => moveGallery(i, 1)} disabled={i === gallery.length - 1} className="px-2 disabled:opacity-30" aria-label="Move later">→</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Library <span className="text-sm font-medium text-ink-3">({lib.media.length})</span></h2>
        {lib.media.length === 0 && <p className="mt-2 text-sm text-ink-3">Upload your first photos above.</p>}
        <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {lib.media.map((m) => {
            const inGallery = lib.galleryIds.includes(m.id);
            const isHero = lib.heroMediaId === m.id;
            return (
              <li key={m.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
                <div className="relative aspect-square bg-ink">
                  <Preview m={m} />
                  <div className="absolute left-2 top-2 flex gap-1">
                    {m.kind === "video" && <span className="rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold text-rice">VIDEO</span>}
                    {isHero && <span className="rounded bg-seal px-1.5 py-0.5 text-[10px] font-bold text-white">HERO</span>}
                    {inGallery && <span className="rounded bg-rice px-1.5 py-0.5 text-[10px] font-bold text-ink">GALLERY</span>}
                  </div>
                </div>
                <div className="space-y-2 p-2.5">
                  <input
                    defaultValue={m.alt}
                    placeholder="Describe it (for Google & screen readers)"
                    onBlur={(e) => e.target.value !== m.alt && adminFetch(`/api/admin/media/${m.id}`, { method: "PATCH", body: { alt: e.target.value } }).then(load)}
                    className="w-full rounded-lg border border-line bg-rice px-2 py-1 text-xs"
                    aria-label="Description"
                  />
                  <div className="flex flex-wrap gap-1 text-[11px] font-bold">
                    <button type="button" onClick={() => patchSettings({ heroMediaId: isHero ? null : m.id }, isHero ? "Hero reset" : "Hero set")} className={`rounded-full px-2.5 py-1 ${isHero ? "bg-seal text-white" : "ring-1 ring-line hover:ring-ink"}`}>
                      {isHero ? "Hero ✓" : "Set hero"}
                    </button>
                    <button
                      type="button"
                      onClick={() => patchSettings({ galleryIds: inGallery ? lib.galleryIds.filter((g) => g !== m.id) : [...lib.galleryIds, m.id] })}
                      className={`rounded-full px-2.5 py-1 ${inGallery ? "bg-ink text-rice" : "ring-1 ring-line hover:ring-ink"}`}
                    >
                      {inGallery ? "Gallery ✓" : "+ Gallery"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete this file? It will be removed from the hero, gallery and any menu item.")) return;
                        await adminFetch(`/api/admin/media/${m.id}`, { method: "DELETE", body: {} });
                        await load();
                      }}
                      className="ml-auto rounded-full px-2 py-1 text-seal hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-[10px] text-ink-3">{(m.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {socials && (
        <section className="mt-10 rounded-2xl border border-line bg-card p-5 shadow-soft">
          <h2 className="text-lg font-bold">Social links</h2>
          <p className="text-sm text-ink-3">Shown in the site header/footer and gallery. Full https:// links.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {([["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"]] as const).map(([k, label]) => (
              <label key={k} className="text-xs font-semibold">
                {label}
                <input value={socials[k]} onChange={(e) => setSocials({ ...socials, [k]: e.target.value })} placeholder={`https://www.${k}.com/…`} className="mt-1 w-full rounded-lg border border-line bg-rice px-3 py-2 text-sm font-normal" />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => patchSettings({ socials })} className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-rice">Save links</button>
        </section>
      )}
    </div>
  );
}
