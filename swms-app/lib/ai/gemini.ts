import "server-only";
import { GoogleGenAI } from "@google/genai";
import { WASTE_PROMPT } from "./prompt";
import { aiResultSchema, uncertain, type AiResult } from "./schema";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

export async function classifyWastePhoto(jpeg: Buffer, opts: { timeoutMs: number }): Promise<AiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI key not configured");
  const client = new GoogleGenAI({ apiKey: key });
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } },
      { text: WASTE_PROMPT },
    ],
    config: { responseMimeType: "application/json", httpOptions: { timeout: opts.timeoutMs } },
  });
  try {
    return aiResultSchema.parse(JSON.parse(response.text ?? ""));
  } catch {
    return uncertain;
  }
}
