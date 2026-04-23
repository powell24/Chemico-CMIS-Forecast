import { stepCountIs, streamText } from "ai";
import { z } from "zod";
import { openai } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT, buildToolSet, type ToolCallLog } from "@/lib/chat/tools";

export const runtime = "nodejs";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Bad request", { status: 400 });
  }
  const { sessionId, messages } = parsed.data;

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.user_id !== user.id) {
    return new Response("Session not found", { status: 404 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return new Response("No user message", { status: 400 });
  }

  const { error: insertError } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content: lastUser.content,
  });
  if (insertError) {
    console.error("Failed to persist user message:", insertError);
  }

  const model =
    process.env.OPENAI_MODEL?.trim() && process.env.OPENAI_MODEL !== ""
      ? process.env.OPENAI_MODEL
      : "gpt-4o-mini";

  const toolCallLog: ToolCallLog[] = [];
  const tools = buildToolSet(toolCallLog);

  const result = streamText({
    model: openai(model),
    system: SYSTEM_PROMPT,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    tools,
    stopWhen: stepCountIs(4),
    onError({ error }) {
      console.error("[chat] streamText error:", error);
    },
    async onFinish({ text, finishReason }) {
      console.log(
        `[chat] finished reason=${finishReason} text.length=${text.length} tools=${toolCallLog.length}`,
      );
      const persistSupabase = await createClient();
      const { error: asstError } = await persistSupabase
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          role: "assistant",
          content: text,
          tool_calls: toolCallLog,
        });
      if (asstError) {
        console.error("Failed to persist assistant message:", asstError);
      }
    },
  });

  return result.toTextStreamResponse();
}
