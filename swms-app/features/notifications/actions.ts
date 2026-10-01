"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { markNotificationReadSchema } from "./schema";

export async function markNotificationRead(formData: FormData) {
  const parsed = markNotificationReadSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success || !(await getCurrentUser())) return;
  const db = await createClient();
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .is("read_at", null);
  if (error) throw new Error("Could not mark notification as read");
  revalidatePath("/", "layout");
}
