"use client";

import { Fragment, memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ToolCallLog } from "@/lib/chat/tools";

export type RenderedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallLog[];
  streaming?: boolean;
  stopped?: boolean;
};

const CITATION_REGEX = /\[\[([^\]]+)\]\]/g;

function renderCitationsInline(text: string, key: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  CITATION_REGEX.lastIndex = 0;
  while ((match = CITATION_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <Badge
        key={`${key}-cite-${i++}`}
        variant="outline"
        className="mx-0.5 h-auto max-w-full whitespace-normal break-words px-1.5 py-0.5 font-mono text-[10px] font-normal leading-snug text-muted-foreground [overflow-wrap:anywhere]"
      >
        {match[1].trim()}
      </Badge>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

function renderChildren(
  children: React.ReactNode,
  key: string,
): React.ReactNode {
  if (typeof children === "string") {
    return <>{renderCitationsInline(children, key)}</>;
  }
  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, i) => (
          <Fragment key={`${key}-${i}`}>
            {typeof child === "string"
              ? renderCitationsInline(child, `${key}-${i}`)
              : child}
          </Fragment>
        ))}
      </>
    );
  }
  return <>{children}</>;
}

export const Message = memo(function Message({
  message,
  canRegenerate,
  onRegenerate,
}: {
  message: RenderedMessage;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const isAssistant = message.role === "assistant";

  const markdownComponents = useMemo(
    () => ({
      p: ({ children }: { children?: React.ReactNode }) => (
        <p>{renderChildren(children, message.id)}</p>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li>{renderChildren(children, message.id)}</li>
      ),
    }),
    [message.id],
  );

  function handleCopy() {
    navigator.clipboard
      .writeText(message.content)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Copy failed"));
  }

  if (!isAssistant) {
    return (
      <div className="flex w-full justify-end">
        <div
          className="max-w-[85%] overflow-hidden rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group/message w-full min-w-0 space-y-2">
      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-card px-3 py-2 text-sm break-words [overflow-wrap:anywhere]",
          message.stopped && "border-dashed text-muted-foreground",
        )}
      >
        {message.content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1 prose-pre:whitespace-pre-wrap prose-pre:break-words prose-code:break-words prose-a:break-words">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
            {message.streaming && <span className="cmis-caret" aria-hidden />}
          </div>
        ) : message.streaming ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="cmis-caret" aria-hidden />
            <span className="text-xs">Thinking…</span>
          </span>
        ) : (
          <span className="text-muted-foreground italic">No response</span>
        )}
      </div>
      {!message.streaming && (
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleCopy}
                aria-label="Copy message"
              >
                <Copy className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          {canRegenerate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={onRegenerate}
                  aria-label="Regenerate"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
});
