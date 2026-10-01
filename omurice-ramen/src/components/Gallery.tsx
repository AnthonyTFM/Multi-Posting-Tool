"use client";

import { useEffect, useState } from "react";
import type { Media } from "@/lib/media";
import { CloseIcon } from "./icons";

function Tile({ m }: { m: Media }) {
  if (m.kind === "video") {
    return (
      <>
        <video src={m.url} poster={m.poster ?? undefined} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" muted loop playsInline autoPlay preload="metadata" aria-label={m.alt || "Video"} />
        <span className="absolute right-2 top-2 rounded-full bg-ink/60 p-1.5 text-white" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={m.url} alt={m.alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />;
}

/** Instagram-style square grid with a lightbox. */
export function Gallery({ items }: { items: Media[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % items.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + items.length) % items.length));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, items.length]);

  const current = open === null ? null : items[open];

  return (
    <>
      <ul className="grid grid-cols-3 gap-1 sm:gap-2">
        {items.map((m, i) => (
          <li key={m.id}>
            <button type="button" onClick={() => setOpen(i)} className="group relative block aspect-square w-full overflow-hidden bg-ink sm:rounded-lg" aria-label={`Open ${m.alt || (m.kind === "video" ? "video" : "photo")}`}>
              <Tile m={m} />
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4" role="dialog" aria-modal="true" aria-label={current.alt || "Gallery"}>
          <button type="button" className="absolute inset-0" onClick={() => setOpen(null)} aria-label="Close" tabIndex={-1} />
          <div className="relative max-h-full max-w-4xl">
            {current.kind === "video" ? (
              <video key={current.id} src={current.url} poster={current.poster ?? undefined} className="max-h-[85dvh] max-w-full rounded-xl" controls autoPlay playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={current.alt} className="max-h-[85dvh] max-w-full rounded-xl object-contain" />
            )}
            {current.alt && <p className="mt-3 text-center text-sm text-rice/80">{current.alt}</p>}
          </div>
          <button type="button" onClick={() => setOpen(null)} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close">
            <CloseIcon />
          </button>
          {items.length > 1 && (
            <>
              <button type="button" onClick={() => setOpen((open! - 1 + items.length) % items.length)} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20" aria-label="Previous">‹</button>
              <button type="button" onClick={() => setOpen((open! + 1) % items.length)} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20" aria-label="Next">›</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
