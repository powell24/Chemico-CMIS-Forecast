"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_CHARS = 4000;
const WARN_CHARS = 3600;
const LINE_HEIGHT = 20;
const MAX_LINES = 6;
const MIN_HEIGHT = 72;
const MAX_HEIGHT = MIN_HEIGHT + LINE_HEIGHT * (MAX_LINES - 3);

export type ComposerHandle = {
  focus: () => void;
};

export const Composer = forwardRef<
  ComposerHandle,
  {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
    isStreaming: boolean;
  }
>(function Composer({ value, onChange, onSend, onStop, isStreaming }, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight));
    el.style.height = `${next}px`;
  }, [value]);

  const trimmed = value.trim();
  const tooLong = value.length >= MAX_CHARS;
  const warn = value.length >= WARN_CHARS && !tooLong;
  const canSend = !isStreaming && trimmed.length > 0 && !tooLong;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder="Ask about stockout risk, excess inventory, or seasonal patterns…"
          className="min-h-[72px] resize-none pr-24"
          rows={3}
          maxLength={MAX_CHARS}
        />
        <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-2">
          <span
            className={cn(
              "pointer-events-auto tabular-nums text-[10px]",
              warn
                ? "text-chart-3"
                : tooLong
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {value.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          <kbd className="rounded border bg-muted px-1 font-medium">Enter</kbd>{" "}
          to send ·{" "}
          <kbd className="rounded border bg-muted px-1 font-medium">
            Shift+Enter
          </kbd>{" "}
          for a newline
        </span>
        {isStreaming ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStop}
            className="gap-1.5"
          >
            <Square className="size-3.5 fill-current" />
            Stop
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={onSend}
            disabled={!canSend}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            Send
          </Button>
        )}
      </div>
    </div>
  );
});
