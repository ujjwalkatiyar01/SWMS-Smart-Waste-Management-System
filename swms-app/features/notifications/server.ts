import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "./schema";

function destination(type: string | null, id: string | null) {
  if (!id) return null;
  if (type === "report") return `/case/${id}`;
  if (type === "pickup") return `/pickup/${id}`;
  return null;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  const db = await createClient();
  const { data, error } = await db
    .from("notifications")
    .select("id, message, created_at, read_at, record_type, record_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("Could not load notifications");
  return data.map((item) => ({
    id: item.id,
    message: item.message,
    createdAt: item.created_at,
    readAt: item.read_at,
    href: destination(item.record_type, item.record_id),
  }));
}
