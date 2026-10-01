// 05-STORAGE-PHOTOS §5: a photo with EXIF (GPS) metadata is stored without it.

import { describe, expect, it } from "vitest";
import { isJpeg, stripJpegMetadata } from "../../lib/photos/jpeg";

const segment = (marker: number, payload: number[]) => [0xff, marker, 0, payload.length + 2, ...payload];
const EXIF = [0x45, 0x78, 0x69, 0x66, 0, 0, 1, 2, 3, 4]; // "Exif\0\0" + sample data

function sampleJpeg() {
  return new Uint8Array([
    0xff, 0xd8,
    ...segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]), // APP0 JFIF — kept
    ...segment(0xe1, EXIF), // APP1 EXIF — removed
    ...segment(0xfe, [0x68, 0x69]), // comment — removed
    ...segment(0xdb, [0, 1, 2]), // quantisation table — kept
    ...segment(0xda, [9, 9]), 0x11, 0x22, // start of scan + image data
    0xff, 0xd9,
  ]);
}

describe("JPEG photo checks", () => {
  it("recognises a JPEG by its first bytes and rejects other files", () => {
    expect(isJpeg(sampleJpeg())).toBe(true);
    expect(isJpeg(new TextEncoder().encode("%PDF-1.7"))).toBe(false);
  });

  it("removes EXIF and comments but keeps the image data", () => {
    const out = Array.from(stripJpegMetadata(sampleJpeg()));
    const hex = out.map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).not.toContain("ffe1");
    expect(hex).not.toContain("45786966"); // "Exif"
    expect(hex).not.toContain("fffe");
    expect(hex).toContain("ffe0");
    expect(hex).toContain("ffdb");
    expect(hex.endsWith("ffda000409091122ffd9")).toBe(true);
  });

  it("throws on a damaged file", () => {
    expect(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]))).toThrow();
  });
});
