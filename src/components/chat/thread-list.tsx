"use client";

import { useState } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ThreadSummary } from "@/lib/chat/session";

export function ThreadList({
  threads,
  activeId,
  onSelect,
  onNewThread,
  onDelete,
  loading,
}: {
  threads: ThreadSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewThread: () => void;
  onDelete: (id: string) => void;
  loading: boolean;
}) {
  const [pendingDelete, setPendingDelete] = useState<ThreadSummary | null>(
    null,
  );

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    onDelete(id);
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">Threads</p>
          <p className="text-[11px] text-muted-foreground">
            {threads.length} {threads.length === 1 ? "thread" : "threads"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onNewThread}
          className="cursor-pointer gap-1.5"
        >
          <MessageSquarePlus className="size-3.5" />
          New
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {loading && threads.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              Loading threads…
            </p>
          ) : threads.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No threads yet. Start one with the composer on the right.
            </p>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group/thread flex items-start gap-1 rounded-md transition-colors",
                  activeId === t.id ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    "flex-1 min-w-0 cursor-pointer rounded-md px-2 py-2 text-left text-xs",
                    activeId === t.id
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <p className="line-clamp-2 font-medium leading-snug">
                    {t.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 cursor-pointer opacity-0 transition-opacity group-hover/thread:opacity-100 focus-visible:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(t);
                  }}
                  aria-label="Delete thread"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this thread?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title
                ? `"${pendingDelete.title}" will be permanently removed, along with its messages. This can't be undone.`
                : "The thread and its messages will be permanently removed. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
