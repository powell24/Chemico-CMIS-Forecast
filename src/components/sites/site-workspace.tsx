"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SiteDetail, SiteStatus, SiteSummary } from "@/lib/queries/sites";
import type { FilterOption } from "@/lib/queries/filter-options";
import { getSiteDetailAction } from "@/app/(app)/sites/actions";
import { SiteList } from "./site-list";
import { SiteDetailPanel } from "./site-detail-panel";

const SiteMap = dynamic(
  () => import("./site-map").then((m) => m.SiteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center rounded-lg border bg-muted">
        <Skeleton className="size-full rounded-lg" />
      </div>
    ),
  },
);

type StatusFilter = "all" | SiteStatus;

export function SiteWorkspace({
  summaries,
  customers,
}: {
  summaries: SiteSummary[];
  customers: FilterOption[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SiteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      if (statusFilter !== "all" && s.worstStatus !== statusFilter) return false;
      if (
        customerFilter !== "__all__" &&
        !s.customerIds.includes(customerFilter)
      )
        return false;
      return true;
    });
  }, [summaries, statusFilter, customerFilter]);

  const hasActiveFilter =
    statusFilter !== "all" || customerFilter !== "__all__";

  const dimmedIds = useMemo(() => {
    if (!hasActiveFilter) return new Set<string>();
    return new Set(filtered.map((s) => s.id));
  }, [filtered, hasActiveFilter]);

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getSiteDetailAction(activeId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        console.error("Failed to fetch site detail:", err);
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setActiveId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  const counts = useMemo(() => {
    const c = { healthy: 0, nearing: 0, risk: 0, unknown: 0 };
    for (const s of summaries) c[s.worstStatus] += 1;
    return c;
  }, [summaries]);

  return (
    <div className="flex h-[calc(100svh-3rem)] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Plant Network
          </h1>
          <p className="text-sm text-muted-foreground">
            {summaries.length} sites · {counts.healthy} healthy ·{" "}
            {counts.nearing} nearing · {counts.risk} at risk
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={customerFilter}
            onValueChange={setCustomerFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="risk">At risk</SelectItem>
              <SelectItem value="nearing">Nearing</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="unknown">No data</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="relative flex-1 overflow-hidden rounded-lg">
          <SiteMap
            summaries={summaries}
            activeSiteId={activeId}
            onSelect={(id) => setActiveId(id)}
            dimmedIds={dimmedIds}
          />
          <MapLegend />
        </div>
        <Card className="flex w-80 shrink-0 flex-col overflow-hidden p-0">
          {activeId ? (
            <SiteDetailPanel
              detail={detail}
              loading={detailLoading}
              onBack={() => setActiveId(null)}
            />
          ) : (
            <>
              <div className="border-b px-3 py-3">
                <p className="text-sm font-semibold">Sites</p>
                <p className="text-[11px] text-muted-foreground">
                  Sorted by urgency. Click to see detail.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SiteList
                  summaries={filtered}
                  activeId={activeId}
                  onSelect={(id) => setActiveId(id)}
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function MapLegend() {
  const entries: { label: string; color: string }[] = [
    { label: "At risk", color: "var(--chart-5)" },
    { label: "Nearing", color: "var(--chart-3)" },
    { label: "Healthy", color: "var(--chart-4)" },
    { label: "No data", color: "var(--muted-foreground)" },
  ];
  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 z-[1000] rounded-md border bg-card/95 p-3 text-xs shadow-md backdrop-blur">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Status
      </p>
      <ul className="flex flex-col gap-1">
        {entries.map((e) => (
          <li key={e.label} className="flex items-center gap-2">
            <span
              className={cn("inline-block size-2.5 rounded-full")}
              style={{ background: e.color }}
              aria-hidden
            />
            <span>{e.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
