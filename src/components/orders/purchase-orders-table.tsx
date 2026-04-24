"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import type {
  PoStatus,
  PoSummary,
  SupplierOption,
} from "@/lib/queries/purchase-orders";
import type { FilterOption } from "@/lib/queries/filter-options";

const STATUS_LABEL: Record<PoStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  received: "Received",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<PoStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  received: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  cancelled: "bg-chart-5/10 text-chart-5 border-chart-5/30",
};

export function PurchaseOrdersTable({
  pos,
  suppliers,
  sites,
  initialStatus,
  initialSupplier,
  initialSite,
}: {
  pos: PoSummary[];
  suppliers: SupplierOption[];
  sites: FilterOption[];
  initialStatus: PoStatus | "__all__";
  initialSupplier: string;
  initialSite: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<PoStatus | "__all__">(initialStatus);
  const [supplier, setSupplier] = useState<string>(initialSupplier);
  const [site, setSite] = useState<string>(initialSite);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (k: string, v: string) => {
      if (v === "__all__") params.delete(k);
      else params.set(k, v);
    };
    setOrDelete("status", status);
    setOrDelete("supplier", supplier);
    setOrDelete("site", site);
    const qs = params.toString();
    const current = searchParams.toString();
    if (qs !== current) {
      router.replace(qs ? `/orders?${qs}` : "/orders", { scroll: false });
    }
  }, [status, supplier, site, router, searchParams]);

  const filtered = useMemo(() => {
    return pos.filter((p) => {
      if (status !== "__all__" && p.status !== status) return false;
      if (supplier !== "__all__" && p.supplierId !== supplier) return false;
      if (site !== "__all__" && p.siteId !== site) return false;
      return true;
    });
  }, [pos, status, supplier, site]);

  const hasActiveFilter =
    status !== "__all__" || supplier !== "__all__" || site !== "__all__";

  function clearFilters() {
    setStatus("__all__");
    setSupplier("__all__");
    setSite("__all__");
  }

  const statusCounts = useMemo(() => {
    const c: Record<PoStatus, number> = {
      draft: 0,
      sent: 0,
      received: 0,
      cancelled: 0,
    };
    for (const p of filtered) c[p.status] += 1;
    return c;
  }, [filtered]);

  const allStatusCounts = useMemo(() => {
    const c: Record<PoStatus, number> = {
      draft: 0,
      sent: 0,
      received: 0,
      cancelled: 0,
    };
    for (const p of pos) c[p.status] += 1;
    return c;
  }, [pos]);

  const supplierCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of pos) c.set(p.supplierId, (c.get(p.supplierId) ?? 0) + 1);
    return c;
  }, [pos]);

  const siteCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of pos) c.set(p.siteId, (c.get(p.siteId) ?? 0) + 1);
    return c;
  }, [pos]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">All orders</CardTitle>
            <CardDescription className="text-xs">
              {filtered.length} of {pos.length} · {statusCounts.draft} draft ·{" "}
              {statusCounts.sent} sent · {statusCounts.received} received
              {statusCounts.cancelled > 0
                ? ` · ${statusCounts.cancelled} cancelled`
                : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as PoStatus | "__all__")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses ({pos.length})</SelectItem>
                <SelectItem value="draft">Draft ({allStatusCounts.draft})</SelectItem>
                <SelectItem value="sent">Sent ({allStatusCounts.sent})</SelectItem>
                <SelectItem value="received">
                  Received ({allStatusCounts.received})
                </SelectItem>
                <SelectItem value="cancelled">
                  Cancelled ({allStatusCounts.cancelled})
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All suppliers ({pos.length})</SelectItem>
                {suppliers
                  .filter((s) => (supplierCounts.get(s.id) ?? 0) > 0)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({supplierCounts.get(s.id) ?? 0})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sites ({pos.length})</SelectItem>
                {sites
                  .filter((s) => (siteCounts.get(s.id) ?? 0) > 0)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({siteCounts.get(s.id) ?? 0})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="px-6">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">PO #</TableHead>
                  <TableHead className="text-xs">Supplier</TableHead>
                  <TableHead className="text-xs">Site</TableHead>
                  <TableHead className="text-right text-xs">Lines</TableHead>
                  <TableHead className="text-right text-xs">Subtotal</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs">Expected</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-[280px]">
                      <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                        <p>
                          {hasActiveFilter
                            ? "No purchase orders match these filters."
                            : "No purchase orders yet — create one from the dashboard."}
                        </p>
                        {hasActiveFilter ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                          >
                            Clear filters
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/">Go to dashboard</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((po) => (
                    <TableRow
                      key={po.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => router.push(`/orders/${po.id}`)}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/orders/${po.id}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {po.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{po.siteName}</span>
                          <span className="text-xs text-muted-foreground">
                            {po.siteCity}, {po.siteState}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {po.lineCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(po.subtotal)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(po.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {po.expectedDelivery
                          ? new Date(po.expectedDelivery).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(STATUS_CLASS[po.status])}
                        >
                          {STATUS_LABEL[po.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
