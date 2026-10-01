import { z } from "zod";

export const botQuestionSchema = z.object({
  question: z.string().trim().min(2).max(600),
  recentQuestions: z.array(z.string().trim().min(2).max(600)).max(3).default([]),
});

export interface BotLink { label: string; href: string }
export interface BotReply { answer: string; links: BotLink[]; mode: "guide" | "live" | "ai" }
