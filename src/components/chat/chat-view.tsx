"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createSession } from "@/lib/chat/session";
import { EmptyState } from "./empty-state";
import { Composer, type ComposerHandle } from "./composer";
import { Message, type RenderedMessage } from "./message";
import type { ToolCallLog } from "@/lib/chat/tools";
import { cn } from "@/lib/utils";

type ErrorKind = "network" | "rate" | "generic";

const STICK_THRESHOLD = 80;

export function ChatView({
  sessionId,
  onSessionCreated,
  onMessageSent,
}: {
  sessionId: string | null;
  onSessionCreated: (id: string) => void | Promise<void>;
  onMessageSent: () => void | Promise<void>;
}) {
  const composerRef = useRef<ComposerHandle | null>(null);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickRef = useRef(true);
  const submittingRef = useRef(false);

  const [messages, setMessages] = useState<RenderedMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorState, setErrorState] = useState<{ kind: ErrorKind } | null>(
    null,
  );
  const [showJumpPill, setShowJumpPill] = useState(false);

  const hydrateThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, tool_calls, created_at")
        .eq("session_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(
        (data ?? []).map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          toolCalls: Array.isArray(m.tool_calls)
            ? (m.tool_calls as ToolCallLog[])
            : undefined,
        })),
      );
    } catch (err) {
      console.error("Failed to hydrate thread:", err);
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (submittingRef.current) return;
    if (sessionId) {
      void hydrateThread(sessionId);
    } else {
      setMessages([]);
    }
    const id = window.setTimeout(() => composerRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [sessionId, hydrateThread]);

  useLayoutEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;
    const vp = root.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    viewportRef.current = vp;
    if (!vp) return;

    function onScroll() {
      if (!vp) return;
      const distanceFromBottom =
        vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      const atBottom = distanceFromBottom <= STICK_THRESHOLD;
      stickRef.current = atBottom;
      setShowJumpPill(!atBottom);
    }
    vp.addEventListener("scroll", onScroll);
    return () => vp.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    if (!stickRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTop = vp.scrollHeight;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
    stickRef.current = true;
    setShowJumpPill(false);
  }, []);

  async function refetchLastAssistant(sid: string, localId: string) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, content, tool_calls")
        .eq("session_id", sid)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === localId
            ? {
                ...m,
                id: data.id,
                content: data.content,
                toolCalls: Array.isArray(data.tool_calls)
                  ? (data.tool_calls as ToolCallLog[])
                  : undefined,
              }
            : m,
        ),
      );
    } catch (err) {
      console.error("Failed to refetch assistant message:", err);
    }
  }

  const submit = useCallback(
    async (prompt: string, opts: { regenerate?: boolean } = {}) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      setErrorState(null);

      let activeSessionId = sessionId;
      let createdNew = false;
      if (!activeSessionId) {
        try {
          activeSessionId = await createSession();
          createdNew = true;
        } catch (err) {
          console.error("Failed to create session:", err);
          setErrorState({ kind: "network" });
          return;
        }
      }

      const asstId = `local-asst-${Date.now()}`;
      const userId = `local-user-${Date.now()}`;
      const snapshot = messages.filter((m) => !m.streaming);
      let historyForApi: { role: "user" | "assistant"; content: string }[];

      if (opts.regenerate) {
        let i = snapshot.length - 1;
        while (i >= 0 && snapshot[i].role === "assistant") i--;
        historyForApi = snapshot
          .slice(0, i + 1)
          .map((m) => ({ role: m.role, content: m.content }));
        setMessages((prev) => {
          let j = prev.length - 1;
          while (j >= 0 && prev[j].role === "assistant") j--;
          return [
            ...prev.slice(0, j + 1),
            { id: asstId, role: "assistant", content: "", streaming: true },
          ];
        });
      } else {
        historyForApi = [
          ...snapshot.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: trimmed },
        ];
        setMessages((prev) => [
          ...prev,
          { id: userId, role: "user", content: trimmed },
          { id: asstId, role: "assistant", content: "", streaming: true },
        ]);
      }

      setComposerText("");
      stickRef.current = true;
      setIsStreaming(true);
      submittingRef.current = true;

      if (createdNew) {
        void onSessionCreated(activeSessionId);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSessionId,
            messages: historyForApi,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const kind: ErrorKind = res.status === 429 ? "rate" : "generic";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId ? { ...m, streaming: false, content: "" } : m,
            ),
          );
          setErrorState({ kind });
          return;
        }

        if (!res.body) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId ? { ...m, streaming: false } : m,
            ),
          );
          setErrorState({ kind: "generic" });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId ? { ...m, content: acc } : m,
            ),
          );
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId ? { ...m, streaming: false } : m,
          ),
        );
        void refetchLastAssistant(activeSessionId, asstId);
        void onMessageSent();
      } catch (err) {
        const isAbort = (err as Error)?.name === "AbortError";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId
              ? { ...m, streaming: false, stopped: isAbort }
              : m,
          ),
        );
        if (!isAbort) setErrorState({ kind: "network" });
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
        submittingRef.current = false;
      }
    },
    [messages, sessionId, onSessionCreated, onMessageSent],
  );

  function handleSuggestionSelect(prompt: string) {
    setComposerText(prompt);
    window.setTimeout(() => {
      composerRef.current?.focus();
      void submit(prompt);
    }, 0);
  }

  function handleSend() {
    const text = composerText;
    if (!text.trim()) return;
    void submit(text);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleRegenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    void submit(lastUser.content, { regenerate: true });
  }

  function handleRetry() {
    handleRegenerate();
  }

  const isEmpty = !loadingThread && messages.length === 0;
  const lastAssistantId =
    [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null;

  return (
    <Card className="flex h-full w-full flex-col gap-0 overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <span
          className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"
          aria-hidden
        >
          <Sparkles className="size-4" />
        </span>
        <h1 className="text-base font-semibold tracking-tight">Ask CMIS</h1>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <ScrollArea
          ref={scrollRootRef}
          className="h-full w-full max-w-full overflow-x-hidden px-5 py-4"
        >
          {loadingThread ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading thread…
            </div>
          ) : isEmpty ? (
            <EmptyState onSelect={handleSuggestionSelect} />
          ) : (
            <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4 pb-2">
              {messages.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  canRegenerate={!isStreaming && m.id === lastAssistantId}
                  onRegenerate={handleRegenerate}
                />
              ))}
              {errorState && (
                <div
                  role="alert"
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs",
                    errorState.kind === "network"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-chart-3/40 bg-chart-3/10 text-chart-3",
                  )}
                >
                  <span>
                    {errorState.kind === "network"
                      ? "Connection lost — try again."
                      : errorState.kind === "rate"
                        ? "The model is busy — try again in a moment."
                        : "Something went wrong — try again."}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleRetry}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        {showJumpPill && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border bg-background px-3 py-1 text-xs shadow-sm transition-colors hover:bg-muted"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowDown className="size-3" />
              Jump to latest
            </span>
          </button>
        )}
      </div>
      <div className="border-t p-4">
        <div className="mx-auto w-full max-w-3xl">
          <Composer
            ref={composerRef}
            value={composerText}
            onChange={setComposerText}
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </Card>
  );
}
