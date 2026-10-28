"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./intro.module.css";

export function StoryboardIntro({ onComplete }: { onComplete: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    skip.current?.focus({ preventScroll: true });
    video.current?.play().catch(onComplete);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [onComplete]);

  function finish() {
    setLeaving(true);
    timer.current = setTimeout(onComplete, 350);
  }

  return (
    <div className={`${styles.cover} ${leaving ? styles.videoLeaving : ""}`} role="dialog" aria-modal="true" aria-label="SWMS introduction" onKeyDown={(event) => {
      if (event.key === "Escape") onComplete();
      if (event.key === "Tab") { event.preventDefault(); skip.current?.focus(); }
    }}>
      <span className={styles.srOnly}>SWMS — Smart Waste Management System. Cleaner Cities, Greener Tomorrow.</span>
      <video ref={video} className={styles.introVideo} src="/brand/intro/swms-formation-v2.mp4" autoPlay muted playsInline preload="auto" onEnded={finish} onError={onComplete} aria-hidden="true" />
      <button ref={skip} type="button" className={styles.skip} onClick={onComplete}>Skip Intro <span aria-hidden>↗</span></button>
    </div>
  );
}
