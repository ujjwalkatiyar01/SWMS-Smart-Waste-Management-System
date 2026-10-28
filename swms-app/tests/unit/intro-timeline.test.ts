import { describe, expect, it } from "vitest";
import { INTRO_DURATION_MS, sampleIntro, STAGE_ENDS } from "../../features/intro/timeline";

describe("six-second SWMS presentation", () => {
  it("starts black and reveals Earth before the four letters in order", () => {
    expect(sampleIntro(0).earthOpacity).toBe(0);
    expect(sampleIntro(1000).earthOpacity).toBe(1);
    for (const [index, time] of [1900, 2500, 3100, 3700].entries()) {
      const state = sampleIntro(time);
      expect(state.letters.map((letter) => letter.opacity > 0)).toEqual(
        [0, 1, 2, 3].map((letter) => letter <= index),
      );
      expect(state.tagline).toBe(0);
    }
  });

  it("holds the assembled logo and exact tagline stage before dissolving", () => {
    const hold = sampleIntro(5300);
    expect(hold.letters.every((letter) => letter.opacity === 1 && letter.scale === 1 && letter.x === 0 && letter.y === 0)).toBe(true);
    expect(hold.tagline).toBe(1);
    expect(hold.bin).toBe(1);
    expect(hold.earthOpacity).toBe(0);
    expect(hold.opacity).toBe(1);
    expect(sampleIntro(5800).opacity).toBeGreaterThan(0);
    expect(sampleIntro(5800).opacity).toBeLessThan(1);
    expect(sampleIntro(INTRO_DURATION_MS).opacity).toBe(0);
    expect(INTRO_DURATION_MS).toBe(6000);
  });

  it("preserves the eight requested stage boundaries", () => {
    expect(STAGE_ENDS.map((end) => sampleIntro(end - 1).stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
