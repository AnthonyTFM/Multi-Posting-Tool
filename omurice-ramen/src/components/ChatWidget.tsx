"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ChatIcon, CloseIcon, SendIcon } from "./icons";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["Are you open right now?", "What's most popular?", "Any vegetarian options?", "Can I book a table for 8?"];

/** Open the chat from anywhere: openChat("optional question") */
export function openChat(question?: string) {
  window.dispatchEvent(new CustomEvent("omurice:chat", { detail: { question } }));
}

// Minimal, safe markdown: **bold** and [label](url). Internal links stay in-app.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const bold = p.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (link) {
          const href = link[2];
          if (href.startsWith("/")) return <Link key={i} href={href} className="font-semibold text-ketchup underline underline-offset-2">{link[1]}</Link>;
          if (/^(https?:|tel:)/.test(href)) return <a key={i} href={href} target={href.startsWith("tel:") ? undefined : "_blank"} rel="noopener" className="font-semibold text-ketchup underline underline-offset-2">{link[1]}</a>;
          return <Fragment key={i}>{link[1]}</Fragment>;
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const history: Msg[] = [...messages, { role: "user", content: q }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-20) }),
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "" }));
          throw new Error(err.error || "Something went wrong.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages([...history, { role: "assistant", content: acc }]);
        }
        if (!acc.trim()) throw new Error("No answer came back.");
      } catch (e) {
        const msg = e instanceof Error && e.message ? e.message : "Something went wrong.";
        setMessages([...history, { role: "assistant", content: `${msg} You can also call us at (269) 719-2737.` }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      if (q) void send(q);
      else setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener("omurice:chat", onOpen);
    return () => window.removeEventListener("omurice:chat", onOpen);
  }, [send]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-rice shadow-lift transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6 sm:w-auto sm:pl-4 sm:pr-5"
          aria-label="Open chat assistant"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yolk text-ink sm:h-8 sm:w-8">
            <ChatIcon width={18} height={18} />
          </span>
          <span className="hidden sm:inline">Questions? Ask us</span>
        </button>
      )}

      {open && (
        <section
          className="animate-rise fixed inset-0 z-50 flex flex-col bg-rice shadow-lift sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-3rem)] sm:w-[400px] sm:rounded-3xl sm:border sm:border-line"
          role="dialog"
          aria-label="Chat with Omurice assistant"
        >
          <header className="flex items-center gap-3 border-b border-line bg-ink px-4 py-3.5 text-rice sm:rounded-t-3xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-yolk text-ink">
              <ChatIcon />
            </span>
            <div className="flex-1">
              <p className="font-display text-lg font-bold leading-tight">Omurice Assistant</p>
              <p className="text-xs text-rice/70">AI · menu, hours, reservations & more</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10" aria-label="Close chat">
              <CloseIcon />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm leading-6 shadow-soft">
              Hi! 👋 I can answer questions about our menu, hours, allergens, parking and group reservations. What can I help with?
            </div>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium hover:border-ink">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-ketchup px-4 py-3 text-sm leading-6 text-white">
                  {m.content}
                </div>
              ) : (
                <div key={i} className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm leading-6 shadow-soft">
                  {m.content ? (
                    <RichText text={m.content} />
                  ) : (
                    <span className="inline-flex gap-1" aria-label="Typing">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3 [animation-delay:120ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3 [animation-delay:240ms]" />
                    </span>
                  )}
                </div>
              ),
            )}
          </div>

          <form
            className="border-t border-line bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-b-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 500))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                placeholder="Ask a question…"
                className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-rice px-4 py-2.5 text-sm outline-none focus:border-ink"
                aria-label="Your question"
              />
              <button type="submit" disabled={busy || !input.trim()} className="flex h-11 w-11 items-center justify-center rounded-full bg-ketchup text-white transition hover:bg-ketchup-2 disabled:opacity-40" aria-label="Send">
                <SendIcon width={18} height={18} />
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] leading-4 text-ink-3">AI assistant. For serious allergies, please confirm with our staff.</p>
          </form>
        </section>
      )}
    </>
  );
}
