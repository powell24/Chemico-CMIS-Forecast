"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChatView } from "./chat-view";
import { ThreadList } from "./thread-list";
import {
  deleteThread,
  listThreads,
  type ThreadSummary,
} from "@/lib/chat/session";

export function ChatWorkspace() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);

  const refreshThreads = useCallback(async () => {
    try {
      const next = await listThreads();
      setThreads(next);
      setActiveId((prev) => {
        if (prev && next.some((t) => t.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
    } catch (err) {
      console.error("Failed to load threads:", err);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  function handleSelect(id: string) {
    setActiveId(id);
  }

  function handleNewThread() {
    setActiveId(null);
  }

  function handleDelete(id: string) {
    const removed = threads.find((t) => t.id === id);
    if (!removed) return;

    setThreads((prev) => prev.filter((t) => t.id !== id));
    setActiveId((prev) => {
      if (prev !== id) return prev;
      const remaining = threads.filter((t) => t.id !== id);
      return remaining[0]?.id ?? null;
    });

    void deleteThread(id).catch((err) => {
      console.error("Failed to delete thread:", err);
      toast.error("Couldn't delete thread — restored it.");
      setThreads((prev) => {
        if (prev.some((t) => t.id === removed.id)) return prev;
        return [removed, ...prev];
      });
    });
  }

  async function handleSessionCreated(newId: string) {
    setActiveId(newId);
    await refreshThreads();
  }

  async function handleMessageSent() {
    await refreshThreads();
  }

  return (
    <div className="flex h-[calc(100svh-3rem)] w-full gap-4">
      <ThreadList
        threads={threads}
        activeId={activeId}
        onSelect={handleSelect}
        onNewThread={handleNewThread}
        onDelete={handleDelete}
        loading={loadingThreads}
      />
      <div className="flex-1 min-w-0">
        <ChatView
          sessionId={activeId}
          onSessionCreated={handleSessionCreated}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}
