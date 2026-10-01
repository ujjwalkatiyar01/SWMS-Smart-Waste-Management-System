// JPEG checks for uploaded photos (05-STORAGE-PHOTOS §1): the real file type from its first bytes, and
// removal of metadata segments (EXIF with GPS location, XMP, comments) before storage (03 §3).

export function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Copy of the JPEG without APP1–APP15 and COM segments. Throws on a damaged file. */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  const kept: Uint8Array[] = [bytes.subarray(0, 2)]; // SOI
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    if (marker === 0xda) {
      // Start of scan: everything after this is image data.
      kept.push(bytes.subarray(i));
      return concat(kept);
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const end = i + 2 + length;
    if (length < 2 || end > bytes.length) break;
    const isMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) kept.push(bytes.subarray(i, end));
    i = end;
  }
  throw new Error("Invalid JPEG");
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
