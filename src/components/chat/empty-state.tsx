"use client";

import { ArrowUpRight, Boxes, TrendingDown, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Suggestion = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    icon: Boxes,
    label: "Working capital",
    prompt: "Where is excess inventory tying up cash?",
  },
  {
    icon: TrendingDown,
    label: "Stockout risk",
    prompt: "Which sites are at risk of stockout in the next 30 days?",
  },
  {
    icon: Truck,
    label: "Expedited freight",
    prompt: "Which SKUs are driving expedited shipments this quarter?",
  },
];

export function EmptyState({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Start with an ROI question</p>
        <p className="text-xs text-muted-foreground">
          Answers cite the forecast, recommendation, and seasonal data behind them.
        </p>
      </div>
      <div className="space-y-2">
        {SUGGESTIONS.map((s) => (
          <Card
            key={s.label}
            className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/40"
            onClick={() => onSelect(s.prompt)}
          >
            <CardContent className="flex items-start gap-3 p-3">
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
                )}
                aria-hidden
              >
                <s.icon className="size-4" />
              </span>
              <div className="flex-1 space-y-0.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-sm">{s.prompt}</p>
              </div>
              <ArrowUpRight
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
