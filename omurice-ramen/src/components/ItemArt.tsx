// Illustrated placeholders per category. Swapped automatically for a real photo
// once an item has `image` set in /admin/menu.

import type { Art } from "@/lib/menu-types";

export const ART_BG: Record<Art, string> = {
  ramen: "#fde6c8",
  omurice: "#fff1c7",
  boba: "#efe6fb",
  appetizer: "#f9e3d6",
  dessert: "#fde3ea",
  drink: "#dff0f5",
};

function Steam() {
  return (
    <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9">
      <path className="steam" d="M46 40 c-6 -6 6 -10 0 -18" />
      <path className="steam" style={{ animationDelay: "0.9s" }} d="M60 36 c-6 -6 6 -10 0 -18" />
      <path className="steam" style={{ animationDelay: "1.7s" }} d="M74 40 c-6 -6 6 -10 0 -18" />
    </g>
  );
}

function Ramen() {
  return (
    <>
      <Steam />
      <line x1="70" y1="20" x2="102" y2="64" stroke="#7a4b2a" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="18" x2="106" y2="62" stroke="#7a4b2a" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 62 H106 A46 42 0 0 1 14 62 Z" fill="#d23a2a" />
      <path d="M20 74 H100" stroke="#b02c1e" strokeWidth="4" />
      <path d="M50 101 h20 v6 h-20z" fill="#b02c1e" />
      <ellipse cx="60" cy="62" rx="46" ry="11" fill="#e9a15a" />
      <path d="M26 62 q6 -5 12 0 t12 0 t12 0 t12 0 t12 0" stroke="#ffd96a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="74" y="42" width="14" height="20" rx="2" fill="#1f2a1f" transform="rotate(12 81 52)" />
      <ellipse cx="40" cy="60" rx="10" ry="6" fill="#fffdf8" />
      <circle cx="40" cy="60" r="4" fill="#f6b91a" />
      <circle cx="64" cy="59" r="7" fill="#f2b6a0" />
      <path d="M64 55 a4 4 0 1 1 -3 6" stroke="#d9876c" strokeWidth="1.6" fill="none" />
      <circle cx="54" cy="64" r="1.6" fill="#6f9a4b" />
      <circle cx="74" cy="65" r="1.6" fill="#6f9a4b" />
      <circle cx="31" cy="66" r="1.6" fill="#6f9a4b" />
    </>
  );
}

function Omurice() {
  return (
    <>
      <Steam />
      <ellipse cx="60" cy="82" rx="50" ry="17" fill="#fffdf8" />
      <ellipse cx="60" cy="82" rx="42" ry="12" fill="none" stroke="#e6dccb" strokeWidth="1.5" />
      <path d="M20 80 C20 44, 100 44, 100 80 Q60 88 20 80 Z" fill="#f6b91a" />
      <path d="M30 64 C40 52, 70 50, 86 60" stroke="#ffd96a" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M30 70 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8" stroke="#d23a2a" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="94" cy="86" r="3" fill="#6f9a4b" />
      <circle cx="99" cy="83" r="2.4" fill="#6f9a4b" />
    </>
  );
}

function Boba() {
  return (
    <>
      <rect x="62" y="6" width="7" height="44" rx="3" fill="#d23a2a" transform="rotate(14 65 28)" />
      <path d="M36 36 L84 36 L77 104 Q60 109 43 104 Z" fill="#fffdf8" opacity="0.65" />
      <path d="M38.5 52 L81.5 52 L77 104 Q60 109 43 104 Z" fill="#c99a6b" />
      <path d="M39 60 L81 60" stroke="#e5c39b" strokeWidth="3" />
      <ellipse cx="60" cy="36" rx="26" ry="6" fill="#ffffff" stroke="#e6dccb" strokeWidth="1.5" />
      <path d="M38 35 Q60 20 82 35" fill="#ffffff" opacity="0.9" />
      {[
        [48, 98], [56, 100], [64, 100], [72, 98], [52, 92], [60, 93], [68, 92], [46, 90], [74, 90],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.6" fill="#2b211a" />
      ))}
    </>
  );
}

function Appetizer() {
  const dumpling = (x: number, y: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M-20 6 Q0 -22 20 6 Q0 12 -20 6 Z" fill="#f4d59c" />
      <path d="M-20 6 Q0 12 20 6" stroke="#c8873e" strokeWidth="3" fill="none" />
      <path d="M-9 -4 l2 6 M-2 -7 l1 7 M6 -6 l-1 7 M12 -2 l-2 6" stroke="#d9a75e" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
  return (
    <>
      <ellipse cx="60" cy="80" rx="50" ry="18" fill="#1d1a16" />
      <ellipse cx="60" cy="78" rx="46" ry="15" fill="#2a2620" />
      {dumpling(40, 72, -10)}
      {dumpling(62, 66, 0)}
      {dumpling(82, 74, 12)}
      <circle cx="52" cy="84" r="1.6" fill="#6f9a4b" />
      <circle cx="72" cy="85" r="1.6" fill="#6f9a4b" />
      <circle cx="60" cy="80" r="1.2" fill="#fffdf8" />
    </>
  );
}

function Dessert() {
  return (
    <>
      <ellipse cx="60" cy="84" rx="48" ry="15" fill="#fffdf8" />
      <circle cx="40" cy="70" r="15" fill="#f7b6c8" />
      <circle cx="80" cy="70" r="15" fill="#b8d49a" />
      <circle cx="60" cy="62" r="16" fill="#fffaf0" stroke="#efe3cc" strokeWidth="1.5" />
      <path d="M34 64 q4 -4 9 -3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M54 55 q4 -4 9 -3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </>
  );
}

function Drink() {
  return (
    <>
      <path d="M50 14 h20 v14 q10 8 10 22 v48 q0 8 -8 8 h-24 q-8 0 -8 -8 v-48 q0 -14 10 -22 z" fill="#8fd0e3" opacity="0.85" />
      <path d="M44 62 h32 v36 q0 6 -6 6 h-20 q-6 0 -6 -6z" fill="#5fb7d1" />
      <rect x="48" y="8" width="24" height="8" rx="3" fill="#d23a2a" />
      <circle cx="60" cy="40" r="5" fill="#ffffff" opacity="0.9" />
      <path d="M50 70 v24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </>
  );
}

const ARTS: Record<Art, () => React.ReactElement> = {
  ramen: Ramen,
  omurice: Omurice,
  boba: Boba,
  appetizer: Appetizer,
  dessert: Dessert,
  drink: Drink,
};

export function ItemArt({ art, className = "", label }: { art: Art; className?: string; label?: string }) {
  const Art = ARTS[art] ?? Ramen;
  return (
    <svg viewBox="0 0 120 120" className={className} role={label ? "img" : "presentation"} aria-label={label} aria-hidden={label ? undefined : true}>
      <Art />
    </svg>
  );
}

export function ItemVisual({
  art,
  image,
  name,
  className = "",
}: {
  art: Art;
  image: string | null;
  name: string;
  className?: string;
}) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`flex h-full w-full items-center justify-center ${className}`} style={{ background: ART_BG[art] }}>
      <ItemArt art={art} className="h-[78%] w-[78%]" />
    </div>
  );
}
