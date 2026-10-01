"use client";

import { openChat } from "./ChatWidget";
import { ChatIcon } from "./icons";

export function AskButton({ question, label = "Ask our assistant", className = "" }: { question?: string; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => openChat(question)}
      className={`inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-rice transition hover:bg-ink-2 ${className}`}
    >
      <ChatIcon width={18} height={18} /> {label}
    </button>
  );
}
