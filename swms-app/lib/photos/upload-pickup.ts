export async function uploadPickupPhoto(photo: Blob, pickupId: string): Promise<
  { ok: true; path: string } | { ok: false; message: string }
> {
  const form = new FormData();
  form.append("file", photo, "evidence.jpg");
  form.append("pickupId", pickupId);
  try {
    const response = await fetch("/api/pickup-photo", { method: "POST", body: form });
    return await response.json();
  } catch {
    return { ok: false, message: "Photo upload failed. Check your connection." };
  }
}
