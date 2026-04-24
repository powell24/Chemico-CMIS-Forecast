"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SkuRow } from "@/lib/queries/skus";
import type { SdsExpirationStatus } from "@/lib/queries/sds";

const SDS_LABEL: Record<SdsExpirationStatus, string> = {
  valid: "Valid",
  expiring: "Expiring",
  expired: "Expired",
};

const SDS_CLASS: Record<SdsExpirationStatus, string> = {
  valid: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  expiring: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  expired: "bg-chart-5/15 text-chart-5 border-chart-5/30",
};

export function SkusTable({
  skus,
  sdsStatusBySku,
  initialSds,
  initialCategory,
}: {
  skus: SkuRow[];
  sdsStatusBySku: Record<string, SdsExpirationStatus>;
  initialSds: string;
  initialCategory: string;
}) {
  const router = useRouter();
  const [sdsFilter, setSdsFilter] = useState<string>(initialSds);
  const [category, setCategory] = useState<string>(initialCategory);

  useEffect(() => {
    const params = new URLSearchParams();
    if (sdsFilter !== "__all__") params.set("sds", sdsFilter);
    if (category !== "__all__") params.set("category", category);
    const qs = params.toString();
    router.replace(qs ? `/skus?${qs}` : "/skus", { scroll: false });
  }, [sdsFilter, category, router]);

  const categories = useMemo(() => {
    const set = new Map<string, number>();
    for (const s of skus) set.set(s.category, (set.get(s.category) ?? 0) + 1);
    return [...set.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [skus]);

  const sdsCounts = useMemo(() => {
    const c: Record<SdsExpirationStatus, number> = {
      valid: 0,
      expiring: 0,
      expired: 0,
    };
    for (const s of skus) {
      const status = sdsStatusBySku[s.id] ?? "valid";
      c[status] += 1;
    }
    return c;
  }, [skus, sdsStatusBySku]);

  const filtered = useMemo(() => {
    return skus.filter((s) => {
      if (category !== "__all__" && s.category !== category) return false;
      if (sdsFilter !== "__all__") {
        const status = sdsStatusBySku[s.id] ?? "valid";
        if (status !== sdsFilter) return false;
      }
      return true;
    });
  }, [skus, category, sdsFilter, sdsStatusBySku]);

  const hasActiveFilter = sdsFilter !== "__all__" || category !== "__all__";

  function clearFilters() {
    setSdsFilter("__all__");
    setCategory("__all__");
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">All SKUs</CardTitle>
            <CardDescription className="text-xs">
              {filtered.length} of {skus.length} · {sdsCounts.expired} SDS
              expired · {sdsCounts.expiring} expiring · {sdsCounts.valid} valid
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  All categories ({skus.length})
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sdsFilter} onValueChange={setSdsFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="SDS status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All SDS ({skus.length})</SelectItem>
                <SelectItem value="valid">Valid ({sdsCounts.valid})</SelectItem>
                <SelectItem value="expiring">
                  Expiring ({sdsCounts.expiring})
                </SelectItem>
                <SelectItem value="expired">
                  Expired ({sdsCounts.expired})
                </SelectItem>
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
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-right text-xs">
                    Open recs
                  </TableHead>
                  <TableHead className="text-xs">SDS status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-[240px]">
                      <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                        <p>No SKUs match these filters.</p>
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
                  filtered.map((s) => {
                    const sdsStatus =
                      sdsStatusBySku[s.id] ?? ("valid" as SdsExpirationStatus);
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => router.push(`/skus/${s.code}`)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Link
                                href={`/skus/${s.code}`}
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {s.code}
                              </Link>
                              {(sdsStatus === "expired" ||
                                sdsStatus === "expiring") && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle
                                      className={cn(
                                        "size-3.5",
                                        sdsStatus === "expired"
                                          ? "text-chart-5"
                                          : "text-chart-3",
                                      )}
                                      aria-label={
                                        sdsStatus === "expired"
                                          ? "SDS expired"
                                          : "SDS expiring soon"
                                      }
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {sdsStatus === "expired"
                                      ? "SDS expired — verify before ordering."
                                      : "SDS expires within 30 days."}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {s.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.category}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.openRecCount > 0 ? (
                            <span
                              className={cn(
                                s.worstRecStatus === "risk"
                                  ? "text-chart-5"
                                  : s.worstRecStatus === "nearing"
                                    ? "text-chart-3"
                                    : "text-foreground",
                              )}
                            >
                              {s.openRecCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(SDS_CLASS[sdsStatus])}
                          >
                            {SDS_LABEL[sdsStatus]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
