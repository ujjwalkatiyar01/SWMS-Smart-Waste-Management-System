import { z } from "zod";

export const markNotificationReadSchema = z.object({ id: z.uuid() });

export interface NotificationItem {
  id: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  href: string | null;
}
