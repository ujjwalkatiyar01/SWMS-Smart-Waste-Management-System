// Browser side of the photo rule (03 §3, 04 G8): decode, draw on a canvas and re-encode as JPEG,
// long side ≤ 1600 px, target ≤ 1 MB (demo). Re-encoding drops EXIF, including GPS location.

import { UNSUPPORTED_PHOTO } from "./contract";

const LONG_SIDE = 1600;
const TARGET_BYTES = 1024 * 1024;

export async function toUploadJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // applies the camera's rotation; fails for formats the browser cannot read (e.g. HEIC outside Safari)
  } catch {
    throw new Error(UNSUPPORTED_PHOTO);
  }
  const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) break;
    if (blob.size <= TARGET_BYTES || quality === 0.55) return blob;
  }
  throw new Error(UNSUPPORTED_PHOTO);
}
