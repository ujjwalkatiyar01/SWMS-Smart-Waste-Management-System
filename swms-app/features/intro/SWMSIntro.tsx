"use client";

import { useEffect, useRef } from "react";
import { INTRO_DURATION_MS, sampleIntro } from "./timeline";
import type { EarthScene } from "./earthScene";
import styles from "./intro.module.css";

export function SWMSIntro({ startedAt, onComplete }: { startedAt: number; onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const earthCanvas = useRef<HTMLCanvasElement>(null);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = root.current;
    const canvas = earthCanvas.current;
    if (!element || !canvas) return;
    let disposed = false;
    let frame = 0;
    let earth: EarthScene | undefined;
    const artwork = new Image();
    artwork.onerror = onComplete;
    artwork.src = "/brand/intro/swms-cinematic.webp";
    const letters = element.querySelectorAll<HTMLElement>("[data-letter]");
    const planet = element.querySelector<HTMLElement>("[data-earth]")!;
    const reflection = element.querySelector<HTMLElement>("[data-reflection]")!;
    const tagline = element.querySelector<HTMLElement>("[data-tagline]")!;
    const sweep = element.querySelector<HTMLElement>("[data-sweep]")!;
    const bin = element.querySelector<HTMLElement>("[data-bin]")!;
    const ambient = element.querySelector<HTMLElement>("[data-ambient]")!;

    // The renderer is optional and never owns the app's completion deadline.
    import("./earthScene").then(async ({ createEarthScene }) => {
      if (disposed || performance.now() - startedAt > 1500) return;
      const scene = await createEarthScene(canvas);
      if (disposed || performance.now() - startedAt > 1750) scene?.dispose();
      else if (scene) {
        earth = scene;
        element.dataset.webgl = "ready";
      }
    }).catch(() => { /* The textured CSS planet remains available without WebGL. */ });

    function draw() {
      if (disposed || !element) return;
      const elapsed = performance.now() - startedAt;
      const state = sampleIntro(elapsed);
      element.dataset.stage = String(state.stage);
      element.style.opacity = String(state.opacity);
      planet.style.opacity = String(state.earthOpacity);
      planet.style.transform = `scale(${state.earthScale})`;
      letters.forEach((letter, i) => {
        letter.style.opacity = String(state.letters[i].opacity);
        letter.style.transform = `translate3d(${state.letters[i].x}%, ${state.letters[i].y}%, 0) scale(${state.letters[i].scale})`;
      });
      reflection.style.opacity = String(state.reflection);
      bin.style.opacity = String(state.bin);
      tagline.style.clipPath = `inset(68% ${100 - state.tagline * 100}% 23.3% 0)`;
      tagline.style.opacity = String(state.tagline);
      sweep.style.opacity = String(state.sweepOpacity);
      sweep.style.transform = `translateX(${state.sweepX}%) rotate(-18deg)`;
      ambient.style.opacity = String(state.ambient);
      if (earth && elapsed <= 1800) {
        try { earth.render(elapsed / 1000); }
        catch {
          earth.dispose();
          earth = undefined;
          delete element.dataset.webgl;
        }
      }
      else if (earth) {
        earth.dispose();
        earth = undefined;
      }
      if (elapsed >= INTRO_DURATION_MS) onComplete();
      else frame = requestAnimationFrame(draw);
    }

    skip.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onComplete();
      // Only Skip is interactive while the screen behind is inert.
      if (event.key === "Tab") { event.preventDefault(); skip.current?.focus(); }
    };
    element.addEventListener("keydown", onKey);
    draw();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      earth?.dispose();
      artwork.onerror = null;
      element.removeEventListener("keydown", onKey);
    };
  }, [startedAt, onComplete]);

  return (
    <div ref={root} className={styles.cover} role="dialog" aria-modal="true" aria-label="SWMS introduction" data-swms-intro>
      <span className={styles.srOnly}>SWMS — Smart Waste Management System. Six-second introduction.</span>
      <div className={styles.ambient} data-ambient aria-hidden>
        <div className={styles.blueRay} /><div className={styles.goldRay} />
        {Array.from({ length: 12 }, (_, i) => <i key={i} className={styles.leaf} style={{ left: `${8 + i * 7.5}%`, top: `${8 + (i * 23) % 69}%`, animationDelay: `${-i * .37}s`, animationDuration: `${3.5 + (i % 3) * .8}s` }} />)}
        {Array.from({ length: 22 }, (_, i) => <i key={i} className={styles.particle} style={{ left: `${5 + (i * 31) % 91}%`, top: `${12 + (i * 17) % 75}%`, animationDelay: `${-i * .21}s` }} />)}
      </div>
      <div className={styles.earth} data-earth aria-hidden>
        <div className={styles.planetFallback} />
        <canvas ref={earthCanvas} className={styles.earthCanvas} />
        <div className={styles.orbit} /><div className={`${styles.orbit} ${styles.goldOrbit}`} />
      </div>
      <div className={styles.artwork} aria-hidden>
        {["S", "W", "M", "S"].map((letter, i) => (
          <div key={i} data-letter={letter} className={`${styles.layer} ${styles[`letter${i}`]}`} />
        ))}
        <div data-bin className={`${styles.layer} ${styles.bin}`} />
        <div data-reflection className={`${styles.layer} ${styles.reflection}`} />
        <div data-tagline className={`${styles.layer} ${styles.tagline}`} />
        <div className={styles.sweepClip}><div data-sweep className={styles.sweep} /></div>
      </div>
      <button ref={skip} type="button" className={styles.skip} onClick={onComplete}>Skip Intro <span aria-hidden>↗</span></button>
      <div className={styles.progress} aria-hidden><span /></div>
      <link rel="preload" as="image" href="/brand/intro/swms-cinematic.webp" />
    </div>
  );
}
