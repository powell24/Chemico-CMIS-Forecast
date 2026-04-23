"use client";

import { createClient } from "@/lib/supabase/client";

export async function createSession(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw userError ?? new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export type ThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export async function listThreads(): Promise<ThreadSummary[]> {
  const supabase = createClient();
  const { data: sessions, error } = await supabase
    .from("chat_sessions")
    .select("id, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!sessions || sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: firstUserMsgs } = await supabase
    .from("chat_messages")
    .select("session_id, content, created_at")
    .in("session_id", ids)
    .eq("role", "user")
    .order("created_at", { ascending: true });

  const titleBySession = new Map<string, string>();
  for (const m of firstUserMsgs ?? []) {
    if (!titleBySession.has(m.session_id)) {
      titleBySession.set(m.session_id, m.content as string);
    }
  }

  return sessions.map((s) => ({
    id: s.id,
    title: truncateTitle(titleBySession.get(s.id) ?? "New thread"),
    updatedAt: (s.updated_at ?? s.created_at) as string,
  }));
}

export async function deleteThread(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
  if (error) throw error;
}

function truncateTitle(raw: string): string {
  const s = raw.replace(/\s+/g, " ").trim();
  if (s.length <= 60) return s;
  return `${s.slice(0, 58)}…`;
}
