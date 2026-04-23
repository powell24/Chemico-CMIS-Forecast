"use client";

import type { KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/format";
import type { SiteStatus, SiteSummary } from "@/lib/queries/sites";

const STATUS_LABEL: Record<SiteStatus, string> = {
  risk: "At risk",
  nearing: "Nearing",
  healthy: "Healthy",
  unknown: "No data",
};

const STATUS_CLASS: Record<SiteStatus, string> = {
  risk: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  nearing: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  healthy: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

const STATUS_RANK: Record<SiteStatus, number> = {
  risk: 3,
  nearing: 2,
  healthy: 1,
  unknown: 0,
};

export function SiteList({
  summaries,
  activeId,
  onSelect,
}: {
  summaries: SiteSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = [...summaries].sort((a, b) => {
    const rankDiff = STATUS_RANK[b.worstStatus] - STATUS_RANK[a.worstStatus];
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });

  if (sorted.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-muted-foreground">
        No sites match the current filters.
      </p>
    );
  }

  function handleListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const list = e.currentTarget;
    const buttons = Array.from(
      list.querySelectorAll<HTMLButtonElement>("button[data-site-item]"),
    );
    if (buttons.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const currentIndex = active ? buttons.indexOf(active as HTMLButtonElement) : -1;
    e.preventDefault();
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      currentIndex === -1
        ? dir === 1
          ? 0
          : buttons.length - 1
        : (currentIndex + dir + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
  }

  return (
    <ul className="flex flex-col gap-1 p-2" onKeyDown={handleListKeyDown}>
      {sorted.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            data-site-item
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex w-full cursor-pointer flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeId === s.id ? "bg-muted" : "hover:bg-muted/60",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.city}, {s.state}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[10px]",
                  STATUS_CLASS[s.worstStatus],
                )}
              >
                {STATUS_LABEL[s.worstStatus]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                {s.customerCount}{" "}
                {s.customerCount === 1 ? "customer" : "customers"}
              </span>
              <span>·</span>
              <span>
                {s.openRecCount} open{" "}
                {s.openRecCount === 1 ? "rec" : "recs"}
              </span>
              {s.earliestStockout && (
                <>
                  <span>·</span>
                  <span>{formatRelativeDate(s.earliestStockout)}</span>
                </>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
