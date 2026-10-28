"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { SWMSIntro } from "./SWMSIntro";
import { INTRO_DURATION_MS } from "./timeline";
import styles from "./intro.module.css";

const SESSION_KEY = "swms_intro_played";
let attemptedInThisDocument = false;

type Playback = { status: "pending" | "done" } | { status: "playing"; startedAt: number };

export function IntroGate({ children }: { children: React.ReactNode }) {
  const [playback, setPlayback] = useState<Playback>({ status: "pending" });
  const content = useRef<HTMLDivElement>(null);
  const decision = useRef<{ play: boolean; startedAt: number } | null>(null);

  const complete = useCallback(() => {
    startTransition(() => setPlayback({ status: "done" }));
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!decision.current) {
      let seen = attemptedInThisDocument;
      try {
        seen ||= sessionStorage.getItem(SESSION_KEY) === "1";
        // Reserve the attempt before rendering so errors or reloads cannot trap users in a replay.
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Storage is optional; the root gate also prevents route-change replays.
      }
      attemptedInThisDocument = true;
      decision.current = { play: !seen && !motion.matches, startedAt: performance.now() };
    }
    if (!decision.current.play || motion.matches) {
      complete();
      return;
    }

    const { startedAt } = decision.current;
    startTransition(() => setPlayback({ status: "playing", startedAt }));
    const deadline = window.setTimeout(complete, Math.max(0, INTRO_DURATION_MS - (performance.now() - startedAt)));
    const onMotionChange = () => { if (motion.matches) complete(); };
    const onVisible = () => {
      if (performance.now() - startedAt >= INTRO_DURATION_MS) complete();
    };
    motion.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(deadline);
      motion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [complete]);

  useEffect(() => {
    if (playback.status !== "playing") return;
    const previousFocus = document.activeElement;
    const contentElement = content.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus !== document.body && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      } else {
        contentElement?.focus({ preventScroll: true });
      }
    };
  }, [playback.status]);

  return (
    <>
      <div ref={content} className={styles.content} inert={playback.status === "playing"} tabIndex={-1}>
        {children}
      </div>
      {playback.status === "pending" && <div className={`${styles.cover} swms-intro-pending`} aria-hidden />}
      {playback.status === "playing" && <SWMSIntro startedAt={playback.startedAt} onComplete={complete} />}
      <noscript><style>{`.swms-intro-pending{display:none!important}`}</style></noscript>
    </>
  );
}
