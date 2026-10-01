import { NextResponse } from "next/server";
import { answerBot } from "@/features/bot/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ message: "Send a text question as JSON." }, { status: 415 });
  if (Number(request.headers.get("content-length") ?? 0) > 4000) return NextResponse.json({ message: "Question is too long." }, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ message: "Write a question." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4000) { await reader.cancel(); return NextResponse.json({ message: "Question is too long." }, { status: 413 }); }
    chunks.push(value);
  }
  const input = (() => { try { return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))); } catch { return null; } })();
  const reply = await answerBot(input);
  if (!reply) return NextResponse.json({ message: "Write a question of up to 600 characters." }, { status: 400 });
  return NextResponse.json(reply, { headers: { "Cache-Control": "no-store" } });
}
