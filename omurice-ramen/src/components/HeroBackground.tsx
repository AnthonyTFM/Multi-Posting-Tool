"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Full-bleed hero photo or looping muted video. Respects reduced-motion and
 * data-saver settings (shows the still), and offers a pause control (WCAG 2.2.2).
 */
export function HeroBackground({
  kind,
  src,
  mime,
  poster,
  webmSrc,
}: {
  kind: "image" | "video";
  src: string;
  mime: string;
  poster: string | null;
  webmSrc?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saveData) {
      v.pause();
      setPlaying(false);
    }
  }, []);

  if (kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />;
  }

  return (
    <>
      <video
        ref={ref}
        poster={poster ?? undefined}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      >
        <source src={src} type={mime} />
        {webmSrc && <source src={webmSrc} type="video/webm" />}
      </video>
      <button
        type="button"
        onClick={() => {
          const v = ref.current;
          if (!v) return;
          if (v.paused) {
            void v.play();
            setPlaying(true);
          } else {
            v.pause();
            setPlaying(false);
          }
        }}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/50 text-rice backdrop-blur hover:bg-ink/70 sm:right-6 sm:top-6"
        aria-label={playing ? "Pause background video" : "Play background video"}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
    </>
  );
}
