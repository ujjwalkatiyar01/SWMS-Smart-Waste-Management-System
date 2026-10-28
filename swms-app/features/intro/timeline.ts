export const INTRO_DURATION_MS = 6000;
export const STAGE_ENDS = [700, 1400, 2000, 2600, 3200, 3800, 4700, 6000] as const;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const progress = (time: number, start: number, duration: number) => clamp((time - start) / duration);
const easeOut = (value: number) => 1 - (1 - value) ** 3;

// All visual state is a function of elapsed time, independent of frame rate.
export function sampleIntro(time: number) {
  const letters = [1400, 2000, 2600, 3200].map((start, i) => {
    const reveal = easeOut(progress(time, start, 480));
    const settle = easeOut(progress(time, start + 130, 450));
    return {
      opacity: reveal,
      scale: i === 0 ? 1 + .55 * (1 - settle) : .92 + .08 * settle,
      x: i === 0 ? 19 * (1 - settle) : 0,
      y: 2.5 * (1 - settle),
    };
  });
  const sweep = progress(time, 3900, 650);
  return {
    stage: Math.min(8, STAGE_ENDS.filter((end) => time >= end).length + 1),
    opacity: 1 - progress(time, 5550, 450),
    earthOpacity: easeOut(progress(time, 0, 620)) * (1 - progress(time, 1370, 380)),
    earthScale: .86 + .14 * easeOut(progress(time, 0, 700)),
    letters,
    bin: easeOut(progress(time, 3200, 450)),
    reflection: easeOut(progress(time, 3800, 650)),
    tagline: easeOut(progress(time, 4700, 480)),
    ambient: progress(time, 650, 600) * (1 - progress(time, 4700, 650)),
    sweepOpacity: Math.sin(sweep * Math.PI) * .24,
    sweepX: -35 + 170 * sweep,
  };
}
