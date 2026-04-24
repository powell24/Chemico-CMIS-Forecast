"use client";

import {
  Boxes,
  ShieldAlert,
  TrendingDown,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Category = {
  icon: LucideIcon;
  label: string;
  accentClass: string;
  questions: string[];
};

const CATEGORIES: Category[] = [
  {
    icon: TrendingDown,
    label: "Stockout risk",
    accentClass: "bg-chart-5/10 text-chart-5",
    questions: [
      "Which sites are at risk of stockout in the next 30 days?",
      "Which SKUs are driving the biggest shortfalls this quarter?",
      "What's the soonest projected stockout on the books?",
    ],
  },
  {
    icon: Boxes,
    label: "Working capital",
    accentClass: "bg-primary/10 text-primary",
    questions: [
      "Where is excess inventory tying up cash?",
      "Which SKUs have the largest over-forecast this period?",
      "How much working capital would a 5% accuracy lift free?",
    ],
  },
  {
    icon: Users,
    label: "Customer exposure",
    accentClass: "bg-chart-1/10 text-chart-1",
    questions: [
      "Which customer has the most stockout exposure right now?",
      "What is the seasonal pattern for our Fortune 100 accounts?",
      "Which customers are driving expedited freight this quarter?",
    ],
  },
  {
    icon: ShieldAlert,
    label: "Safety & compliance",
    accentClass: "bg-chart-3/10 text-chart-3",
    questions: [
      "Which SDS documents are expiring in the next 30 days?",
      "What PPE is required for the glycol deicer?",
      "Is the SDS for DI-400 current, and what are the top hazards?",
    ],
  },
];

export function EmptyState({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-medium">Start with an ROI question</p>
        <p className="text-xs text-muted-foreground">
          Answers cite the forecast, recommendation, and safety data behind them.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((c) => (
          <div
            key={c.label}
            className="flex flex-col gap-2 rounded-lg border bg-card/40 p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md",
                  c.accentClass,
                )}
                aria-hidden
              >
                <c.icon className="size-4" />
              </span>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {c.label}
              </p>
            </div>
            <ul className="space-y-1.5">
              {c.questions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => onSelect(q)}
                    className="w-full cursor-pointer rounded-md border border-transparent px-2 py-1.5 text-left text-xs leading-snug text-foreground/80 transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground focus-visible:border-primary/40 focus-visible:bg-muted/60 focus-visible:outline-none"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
