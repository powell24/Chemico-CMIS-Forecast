"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  FileText,
  Plus,
  ShieldAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PoDraftDialog } from "@/components/orders/po-draft-dialog";
import type {
  SupplierOption,
  PoDashboardCounts,
} from "@/lib/queries/purchase-orders";
import type {
  SdsCounts,
  SdsExpirationStatus,
} from "@/lib/queries/sds";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  RecommendationRow,
  RecStatus,
} from "@/lib/queries/recommendations";
import type { FilterOptions } from "@/lib/queries/filter-options";
import { cn } from "@/lib/utils";
import { formatNumber, formatRelativeDate } from "@/lib/format";

type SortKey =
  | "sku"
  | "customer"
  | "site"
  | "currentStock"
  | "reorderPoint"
  | "stockout";

type SortState = { key: SortKey; dir: "asc" | "desc" };

const STATUS_LABEL: Record<RecStatus, string> = {
  healthy: "Healthy",
  nearing: "Nearing",
  risk: "At risk",
};

const STATUS_CLASS: Record<RecStatus, string> = {
  healthy: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  nearing: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  risk: "bg-chart-5/15 text-chart-5 border-chart-5/30",
};

const STATUS_TOOLTIP: Record<RecStatus, string> = {
  healthy: "Stock comfortably above reorder point.",
  nearing: "Approaching reorder point within ~30 days.",
  risk: "Projected stockout inside lead time — reorder now.",
};

const PAGE_SIZE = 10;

export function RecommendationsTable({
  rows,
  filterOptions,
  suppliers,
  poCounts,
  sdsStatusBySku,
  sdsCounts,
}: {
  rows: RecommendationRow[];
  filterOptions: FilterOptions;
  suppliers: SupplierOption[];
  poCounts: PoDashboardCounts;
  sdsStatusBySku: Record<string, SdsExpirationStatus>;
  sdsCounts: SdsCounts;
}) {
  const [customer, setCustomer] = useState<string>("__all__");
  const [site, setSite] = useState<string>("__all__");
  const [status, setStatus] = useState<"__all__" | RecStatus>("__all__");
  const [sdsFilter, setSdsFilter] = useState<
    "__all__" | SdsExpirationStatus
  >("__all__");
  const [sort, setSort] = useState<SortState>({
    key: "stockout",
    dir: "asc",
  });
  const [page, setPage] = useState(0);
  const [poDialogRecId, setPoDialogRecId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (customer !== "__all__" && r.customerId !== customer) return false;
      if (site !== "__all__" && r.siteId !== site) return false;
      if (status !== "__all__" && r.status !== status) return false;
      if (sdsFilter !== "__all__") {
        const s = sdsStatusBySku[r.skuId] ?? "valid";
        if (s !== sdsFilter) return false;
      }
      return true;
    });
  }, [rows, customer, site, status, sdsFilter, sdsStatusBySku]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "sku":
          return a.skuCode.localeCompare(b.skuCode) * dir;
        case "customer":
          return a.customerName.localeCompare(b.customerName) * dir;
        case "site":
          return a.siteName.localeCompare(b.siteName) * dir;
        case "currentStock":
          return (a.currentStock - b.currentStock) * dir;
        case "reorderPoint":
          return (a.reorderPoint - b.reorderPoint) * dir;
        case "stockout": {
          const ax = a.projectedStockout
            ? new Date(a.projectedStockout).getTime()
            : Number.POSITIVE_INFINITY;
          const bx = b.projectedStockout
            ? new Date(b.projectedStockout).getTime()
            : Number.POSITIVE_INFINITY;
          return (ax - bx) * dir;
        }
      }
    });
    return copy;
  }, [filtered, sort]);

  const customerCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of rows) c.set(r.customerId, (c.get(r.customerId) ?? 0) + 1);
    return c;
  }, [rows]);

  const siteCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of rows) c.set(r.siteId, (c.get(r.siteId) ?? 0) + 1);
    return c;
  }, [rows]);

  const statusCounts = useMemo(() => {
    const c: Record<RecStatus, number> = { healthy: 0, nearing: 0, risk: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const sdsFilterCounts = useMemo(() => {
    const c: Record<SdsExpirationStatus, number> = {
      valid: 0,
      expiring: 0,
      expired: 0,
    };
    for (const r of rows) {
      const s = sdsStatusBySku[r.skuId] ?? "valid";
      c[s] += 1;
    }
    return c;
  }, [rows, sdsStatusBySku]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const ghostCount = Math.max(0, PAGE_SIZE - pageRows.length);

  function toggleSort(key: SortKey) {
    setPage(0);
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function clearFilters() {
    setCustomer("__all__");
    setSite("__all__");
    setStatus("__all__");
    setSdsFilter("__all__");
    setPage(0);
  }

  const hasActiveFilter =
    customer !== "__all__" ||
    site !== "__all__" ||
    status !== "__all__" ||
    sdsFilter !== "__all__";
  const from = sorted.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min(sorted.length, (safePage + 1) * PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">
              Reorder Recommendations
            </CardTitle>
            <CardDescription className="text-xs">
              Active stockout risk and reorder triggers across assigned SKUs.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <FileText className="size-3" />
                <span>
                  {poCounts.draft} in draft · {poCounts.sentThisWeek} sent this
                  week
                </span>
              </Link>
              {(sdsCounts.expired > 0 || sdsCounts.expiring > 0) && (
                <Link
                  href={
                    sdsCounts.expired > 0
                      ? "/skus?sds=expired"
                      : "/skus?sds=expiring"
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px]",
                    sdsCounts.expired > 0
                      ? "border-chart-5/30 bg-chart-5/10 text-chart-5"
                      : "border-chart-3/30 bg-chart-3/10 text-chart-3",
                  )}
                >
                  <ShieldAlert className="size-3" />
                  <span>
                    {sdsCounts.expired > 0
                      ? `${sdsCounts.expired} SDS expired`
                      : `${sdsCounts.expiring} SDS expiring`}
                    {sdsCounts.expired > 0 && sdsCounts.expiring > 0
                      ? ` · ${sdsCounts.expiring} expiring`
                      : ""}
                  </span>
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={customer}
              onValueChange={(v) => {
                setCustomer(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All customers ({rows.length})</SelectItem>
                {filterOptions.customers
                  .filter((c) => (customerCounts.get(c.id) ?? 0) > 0)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({customerCounts.get(c.id) ?? 0})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={site}
              onValueChange={(v) => {
                setSite(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sites ({rows.length})</SelectItem>
                {filterOptions.sites
                  .filter((s) => (siteCounts.get(s.id) ?? 0) > 0)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({siteCounts.get(s.id) ?? 0})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as "__all__" | RecStatus);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses ({rows.length})</SelectItem>
                <SelectItem value="healthy">Healthy ({statusCounts.healthy})</SelectItem>
                <SelectItem value="nearing">Nearing ({statusCounts.nearing})</SelectItem>
                <SelectItem value="risk">At risk ({statusCounts.risk})</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sdsFilter}
              onValueChange={(v) => {
                setSdsFilter(v as "__all__" | SdsExpirationStatus);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="SDS status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All SDS ({rows.length})</SelectItem>
                <SelectItem value="valid">
                  SDS valid ({sdsFilterCounts.valid})
                </SelectItem>
                <SelectItem value="expiring">
                  SDS expiring ({sdsFilterCounts.expiring})
                </SelectItem>
                <SelectItem value="expired">
                  SDS expired ({sdsFilterCounts.expired})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-0">
        <div className="px-6">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="SKU"
                    sortKey="sku"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHead
                    label="Customer"
                    sortKey="customer"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHead
                    label="Site"
                    sortKey="site"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHead
                    label="Current Stock"
                    sortKey="currentStock"
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="Reorder Point"
                    sortKey="reorderPoint"
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="Projected Stockout"
                    sortKey="stockout"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-[360px]">
                      <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                        <p>No recommendations match — clear filters to see everything.</p>
                        {hasActiveFilter && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {pageRows.map((r) => (
                      <TableRow
                        key={r.id}
                        className="hover:bg-muted/40 focus-within:bg-muted/40"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Link
                                href={`/skus/${encodeURIComponent(r.skuCode)}`}
                                className="hover:underline"
                              >
                                {r.skuCode}
                              </Link>
                              {(() => {
                                const s = sdsStatusBySku[r.skuId];
                                if (s === "expired" || s === "expiring") {
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle
                                          className={cn(
                                            "size-3.5",
                                            s === "expired"
                                              ? "text-chart-5"
                                              : "text-chart-3",
                                          )}
                                          aria-label={
                                            s === "expired"
                                              ? "SDS expired"
                                              : "SDS expiring soon"
                                          }
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {s === "expired"
                                          ? "SDS expired — verify before ordering."
                                          : "SDS expires within 30 days."}
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                }
                                return null;
                              })()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {r.skuName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{r.customerName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{r.siteName}</span>
                            <span className="text-xs text-muted-foreground">
                              {r.siteCity}, {r.siteState}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(r.currentStock)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(r.reorderPoint)}
                        </TableCell>
                        <TableCell>
                          {r.projectedStockout ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dotted underline-offset-4">
                                  {formatRelativeDate(r.projectedStockout)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {new Date(
                                  r.projectedStockout,
                                ).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={cn(STATUS_CLASS[r.status])}
                              >
                                {STATUS_LABEL[r.status]}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {STATUS_TOOLTIP[r.status]}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[11px]"
                            onClick={() => setPoDialogRecId(r.id)}
                            aria-label={`Create PO for ${r.skuCode} at ${r.siteName}`}
                          >
                            <Plus className="size-3" />
                            Create PO
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {Array.from({ length: ghostCount }).map((_, i) => (
                      <TableRow key={`ghost-${i}`} aria-hidden>
                        <TableCell colSpan={8}>
                          <span className="invisible">—</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {from}–{to} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
      <PoDraftDialog
        open={poDialogRecId !== null}
        onOpenChange={(open) => {
          if (!open) setPoDialogRecId(null);
        }}
        recommendationId={poDialogRecId}
        suppliers={suppliers}
      />
    </Card>
  );
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = sort.key === sortKey;
  const Icon = !isActive
    ? ChevronsUpDown
    : sort.dir === "asc"
      ? ChevronUp
      : ChevronDown;

  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
          align === "right" && "ml-auto",
        )}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  );
}
