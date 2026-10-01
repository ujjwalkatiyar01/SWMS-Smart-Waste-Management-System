"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, X } from "lucide-react";
import { MascotFigure } from "@/components/shared/MascotFigure";
import type { BotReply } from "../schema";

type Message = { id: number; from: "you" | "bot"; text: string; links?: BotReply["links"] };

export function SwmsBot() {
  const pathname = usePathname();
  const home = pathname === "/";
  const inApp = /^\/(my|worker|admin|supervisor|authority|report|case|pickup)(\/|$)/.test(pathname);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const placement = home ? "right-4 sm:right-6" : "left-4 sm:left-6";

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, open]);
  if (!home && !inApp) return null;

  const close = () => { setOpen(false); launcherRef.current?.focus(); };
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setQuestion("");
    setMessages((items) => [...items, { id: Date.now(), from: "you", text }]);
    setBusy(true);
    try {
      const recentQuestions = messages.filter((m) => m.from === "you").slice(-3).map((m) => m.text);
      const response = await fetch("/api/bot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, recentQuestions }) });
      if (!response.ok) throw new Error("Could not get an answer");
      const reply = await response.json() as BotReply;
      setMessages((items) => [...items, { id: Date.now() + 1, from: "bot", text: reply.answer, links: reply.links }]);
    } catch {
      setMessages((items) => [...items, { id: Date.now() + 1, from: "bot", text: "I couldn't load an answer. Please try again." }]);
    } finally { setBusy(false); }
  };

  return (
    <div className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] ${placement} z-50 flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2`}>
      {open && (
        <section aria-label="SWMS bot chat" onKeyDown={(event) => { if (event.key === "Escape") close(); }}
          className="flex h-[min(28rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-leaf-200 bg-cream shadow-card animate-enter">
          <div className="flex items-center gap-3 bg-leaf-900 px-4 py-3 text-white">
            <div className="w-10 shrink-0" aria-hidden><MascotFigure sign={["HI!"]} /></div>
            <div className="min-w-0 flex-1"><h2 className="font-bold">SWMS bot</h2><p className="text-xs text-white/80">Here for app and work help</p></div>
            <button type="button" onClick={close} aria-label="Close SWMS bot" className="flex size-11 items-center justify-center rounded-full hover:bg-white/15"><X size={20} /></button>
          </div>
          <div role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-leaf-100 px-4 py-3 text-leaf-950">Hi! I’m SWMS bot. I can help with reports, pickups, worker tasks and waste sorting.</div>
            {messages.map((message) => <div key={message.id} className={`flex ${message.from === "you" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 leading-relaxed ${message.from === "you" ? "rounded-tr-sm bg-leaf-700 text-white" : "rounded-tl-sm bg-white text-leaf-950 ring-1 ring-leaf-100"}`}>
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.links && message.links.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{message.links.map((link) => <Link key={`${message.id}-${link.href}`} href={link.href} onClick={() => setOpen(false)} className="rounded-full bg-leaf-50 px-3 py-1.5 font-semibold text-leaf-800 underline underline-offset-2 hover:bg-leaf-100">{link.label}</Link>)}</div>}
              </div>
            </div>)}
            {busy && <p className="text-leaf-700" role="status">SWMS bot is checking…</p>}
            <div ref={endRef} />
          </div>
          <p className="border-t border-leaf-100 bg-white px-4 pt-2 text-xs text-leaf-950/70">Please avoid names, addresses or phone numbers. General AI answers may use Gemini.</p>
          <form onSubmit={send} className="flex gap-2 bg-white p-3">
            <label htmlFor="swms-bot-question" className="sr-only">Your question</label>
            <input id="swms-bot-question" ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={600} placeholder="Type your question…" className="min-w-0 flex-1 rounded-xl border border-leaf-200 bg-cream px-3 text-base text-leaf-950 placeholder:text-leaf-950/50 focus:outline-none focus:ring-2 focus:ring-leaf-600" />
            <button type="submit" disabled={busy || !question.trim()} aria-label="Send question" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-leaf-700 text-white disabled:opacity-50"><ArrowUp size={20} /></button>
          </form>
        </section>
      )}
      <button ref={launcherRef} type="button" aria-label={open ? "SWMS bot chat is open" : "Open SWMS bot chat"} aria-expanded={open} onClick={() => setOpen((value) => !value)}
        className="group flex min-h-20 w-[76px] flex-col items-center justify-end rounded-2xl bg-transparent p-1 text-leaf-950 transition-transform hover:-translate-y-1">
        <span className="block w-14 animate-bob drop-shadow-lg" aria-hidden><MascotFigure sign={["HI!"]} /></span>
        <span className="-mt-1 text-xs font-extrabold leading-none drop-shadow-sm">Ask</span>
      </button>
    </div>
  );
}
