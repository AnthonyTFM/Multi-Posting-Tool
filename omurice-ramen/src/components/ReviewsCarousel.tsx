"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Review } from "@/lib/reviews";

const ROTATE_MS = 7000;

export function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <defs>
              <linearGradient id={`s${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#e2a93b" />
                <stop offset={`${fill * 100}%`} stopColor="#e2dbcf" />
              </linearGradient>
            </defs>
            <path fill={`url(#s${i}-${Math.round(fill * 100)})`} d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9L12 2.8Z" />
          </svg>
        );
      })}
    </span>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ReviewCard({ r }: { r: Review }) {
  const long = r.text.length > 320;
  return (
    <figure className="flex h-full flex-col rounded-3xl border border-line bg-card p-6 shadow-soft sm:p-7">
      <div className="flex items-center justify-between">
        <Stars value={r.rating} />
        <span className="font-display text-5xl leading-none text-seal/25" aria-hidden>“</span>
      </div>
      <blockquote className="mt-3 flex-1 text-[1.02rem] leading-7 text-ink-2">
        <p className={long ? "line-clamp-6" : ""}>{r.text}</p>
        {r.reviewUrl && (
          <a href={r.reviewUrl} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-seal hover:underline">
            {long ? "Read full review" : `View on ${r.source}`}
          </a>
        )}
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        {r.authorPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.authorPhoto} alt="" width={40} height={40} referrerPolicy="no-referrer" className="h-10 w-10 rounded-full bg-rice-2 object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-semibold text-rice" aria-hidden>
            {r.author.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          {r.authorUrl ? (
            <a href={r.authorUrl} target="_blank" rel="noopener" className="block truncate font-semibold hover:underline">{r.author}</a>
          ) : (
            <span className="block truncate font-semibold">{r.author}</span>
          )}
          <span className="block text-xs text-ink-3">{r.relativeTime}{r.relativeTime ? " · " : ""}{r.source} review</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Auto-rotating, shuffled Google reviews with manual controls. */
export function ReviewsCarousel({ reviews }: { reviews: Review[] }) {
  const [list, setList] = useState(reviews);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [userNav, setUserNav] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Shuffle after hydration so server and client markup match.
  useEffect(() => {
    setList(shuffle(reviews));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(false);
  }, [reviews]);

  const go = useCallback((d: number, byUser = false) => {
    setI((x) => (x + d + list.length) % list.length);
    if (byUser) setUserNav(true);
  }, [list.length]);

  useEffect(() => {
    if (!auto || hovering || list.length < 2) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") go(1);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [auto, hovering, list.length, go]);

  if (!list.length) return null;
  const second = list.length > 1 ? list[(i + 1) % list.length] : null;

  return (
    <div
      ref={root}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={(e) => !root.current?.contains(e.relatedTarget as Node) && setHovering(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Google reviews"
    >
      <div className="grid gap-4 lg:grid-cols-2" aria-live={userNav ? "polite" : "off"}>
        <div key={`a-${list[i].id}`} className="animate-rise">
          <ReviewCard r={list[i]} />
        </div>
        {second && (
          <div key={`b-${second.id}`} className="animate-rise hidden lg:block" style={{ animationDelay: "80ms" }}>
            <ReviewCard r={second} />
          </div>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => go(-1, true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-card ring-1 ring-line hover:ring-ink" aria-label="Previous review">‹</button>
          <button type="button" onClick={() => go(1, true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-card ring-1 ring-line hover:ring-ink" aria-label="Next review">›</button>
          <button
            type="button"
            onClick={() => setAuto(!auto)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card ring-1 ring-line hover:ring-ink"
            aria-label={auto ? "Pause rotating reviews" : "Play rotating reviews"}
          >
            {auto ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <div className="flex flex-1 justify-center gap-1.5" aria-hidden>
            {list.map((r, n) => (
              <span key={r.id} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-seal" : "w-1.5 bg-line"}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
