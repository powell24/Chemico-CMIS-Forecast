"use client";

import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatNumber, formatRelativeDate } from "@/lib/format";
import type { SiteDetail } from "@/lib/queries/sites";
import type { RecStatus } from "@/lib/queries/recommendations";

const STATUS_CLASS: Record<RecStatus, string> = {
  healthy: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  nearing: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  risk: "bg-chart-5/15 text-chart-5 border-chart-5/30",
};

const STATUS_LABEL: Record<RecStatus, string> = {
  healthy: "Healthy",
  nearing: "Nearing",
  risk: "At risk",
};

export function SiteDetailPanel({
  detail,
  loading,
  onBack,
}: {
  detail: SiteDetail | null;
  loading: boolean;
  onBack: () => void;
}) {
  if (loading && !detail) {
    return <SiteDetailSkeleton onBack={onBack} />;
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <p>Site not found.</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{detail.site.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {detail.site.city}, {detail.site.state}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0 gap-1"
        >
          <ArrowLeft className="size-3.5" />
          All sites
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 p-4">
          {detail.customers.length > 0 && (
            <section className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Customers served
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detail.customers.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {detail.topSkus.length > 0 && (
            <section className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Top SKUs by open recommendations
              </p>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-right text-xs">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.topSkus.map((s) => (
                      <TableRow key={s.code}>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {s.code}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {s.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground">
                          {s.category}
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs tabular-nums">
                          {s.openRecCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Open reorder recommendations
            </p>
            {detail.recommendations.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                No open reorder recommendations for this site.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {detail.recommendations.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border p-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {r.skuCode} · {r.skuName}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {r.customerName}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0", STATUS_CLASS[r.status])}
                      >
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>
                        Stock {formatNumber(r.currentStock)} /{" "}
                        {formatNumber(r.reorderPoint)}
                      </span>
                      {r.projectedStockout && (
                        <>
                          <span>·</span>
                          <span>
                            {formatRelativeDate(r.projectedStockout)}
                          </span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SiteDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b p-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0 gap-1"
        >
          <ArrowLeft className="size-3.5" />
          All sites
        </Button>
      </div>
      <div className="space-y-4 p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
