"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Flame,
  FlaskConical,
  Package,
  ShieldAlert,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatNumber, formatRelativeDate } from "@/lib/format";
import type { SkuDetail } from "@/lib/queries/skus";
import type { SdsDocument } from "@/lib/queries/sds";
import { SdsViewerDialog } from "./sds-viewer-dialog";

const chartConfig = {
  forecast: { label: "Forecast", color: "var(--primary)" },
  actual: { label: "Actual", color: "var(--muted-foreground)" },
  band: { label: "Confidence", color: "var(--primary)" },
} satisfies ChartConfig;

const STATUS_CLASS = {
  healthy: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  nearing: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  risk: "bg-chart-5/15 text-chart-5 border-chart-5/30",
};

const STATUS_LABEL = {
  healthy: "Healthy",
  nearing: "Nearing",
  risk: "At risk",
};

const SDS_BORDER = {
  valid: "border-chart-4/40 bg-chart-4/5",
  expiring: "border-chart-3/50 bg-chart-3/10",
  expired: "border-chart-5/50 bg-chart-5/10",
};

const SDS_TEXT = {
  valid: "text-chart-4",
  expiring: "text-chart-3",
  expired: "text-chart-5",
};

const SIGNAL_CLASS = {
  danger: "bg-chart-5 text-white",
  warning: "bg-chart-3 text-chart-3-foreground",
  none: "bg-muted text-muted-foreground",
};

export function SkuDetailView({
  sku,
  sds,
}: {
  sku: SkuDetail;
  sds: SdsDocument | null;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/skus">
            <ArrowLeft className="size-3.5" />
            All SKUs
          </Link>
        </Button>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              {sku.code}
              <Badge variant="outline" className="text-xs font-normal">
                {sku.category}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">{sku.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Package className="size-3.5" />
              Pack size: {sku.packSize} {sku.unit}
            </span>
            {sku.defaultSupplierName && (
              <span>Default supplier: {sku.defaultSupplierName}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="gap-1">
              <CardTitle className="text-base">Forecast vs. Actual</CardTitle>
              <p className="text-xs text-muted-foreground">
                12-month view · aggregated across all sites and customers
                carrying this SKU
              </p>
            </CardHeader>
            <CardContent>
              {sku.forecastByMonth.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  No forecast data for this SKU yet.
                </div>
              ) : (
                <ChartContainer
                  config={chartConfig}
                  className="h-[280px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={sku.forecastByMonth.map((m) => ({
                        month: new Date(m.month).toLocaleDateString("en-US", {
                          month: "short",
                          year: "2-digit",
                        }),
                        forecast: m.forecast,
                        actual: m.actual,
                        lower: m.lower,
                        upper: m.upper,
                      }))}
                      margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="sku-band-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--primary)"
                            stopOpacity={0.18}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--primary)"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={16}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={48}
                        tickFormatter={(v: number) => formatNumber(v)}
                      />
                      <ChartTooltip
                        cursor={{ stroke: "var(--border)" }}
                        content={<ChartTooltipContent indicator="line" />}
                      />
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="transparent"
                        fill="url(#sku-band-fill)"
                        fillOpacity={1}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="transparent"
                        fill="var(--background)"
                        fillOpacity={1}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="var(--muted-foreground)"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Open reorder risk</CardTitle>
              <span className="text-xs text-muted-foreground">
                {sku.openRecommendations.length} open
              </span>
            </CardHeader>
            <CardContent>
              {sku.openRecommendations.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No open reorder recommendations for this SKU.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sku.openRecommendations.slice(0, 10).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.siteName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.customerName} · {r.siteCity}, {r.siteState}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Stock {formatNumber(r.currentStock)} /{" "}
                          {formatNumber(r.reorderPoint)}
                          {r.projectedStockout
                            ? ` · ${formatRelativeDate(r.projectedStockout)}`
                            : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0", STATUS_CLASS[r.status])}
                      >
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card
          className={cn(
            "h-fit border-2",
            sds ? SDS_BORDER[sds.status] : "border-dashed",
          )}
        >
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="size-4" />
                Safety (SDS)
              </CardTitle>
              {sds && (
                <Badge
                  variant="secondary"
                  className={cn("text-[10px]", SIGNAL_CLASS[sds.signalWord])}
                >
                  {sds.signalWord.toUpperCase()}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!sds ? (
              <div className="text-sm text-muted-foreground">
                No Safety Data Sheet on file — contact EHS before ordering.
              </div>
            ) : (
              <>
                <div className="space-y-1 text-sm">
                  <p className={cn("font-medium", SDS_TEXT[sds.status])}>
                    {sds.status === "expired"
                      ? `Expired ${Math.abs(sds.daysUntilExpiry)} days ago`
                      : sds.status === "expiring"
                        ? `Expires in ${sds.daysUntilExpiry} ${sds.daysUntilExpiry === 1 ? "day" : "days"}`
                        : `Valid · expires in ${sds.daysUntilExpiry} days`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sds.revision} · Issued{" "}
                    {new Date(sds.issuedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {sds.pictograms.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Pictograms
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {sds.pictograms.map((p) => (
                        <Tooltip key={p}>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1 capitalize">
                              <PictogramIcon code={p} />
                              {p}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {PICTOGRAM_MEANING[p] ?? p}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {sds.hazardCodes.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Hazards
                    </p>
                    <ul className="space-y-1">
                      {sds.hazardCodes.map((h) => (
                        <li key={h} className="text-xs">
                          <span className="font-mono font-medium">{h}</span>
                          {H_STATEMENTS[h] ? (
                            <span className="text-muted-foreground">
                              {" "}
                              — {H_STATEMENTS[h]}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setViewerOpen(true)}
                >
                  <FileText className="size-3.5" />
                  View full SDS
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {sds && (
        <SdsViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          sds={sds}
        />
      )}
    </div>
  );
}

function PictogramIcon({ code }: { code: string }) {
  if (code === "flame") return <Flame className="size-3" />;
  if (code === "corrosion") return <FlaskConical className="size-3" />;
  return <ShieldAlert className="size-3" />;
}

const PICTOGRAM_MEANING: Record<string, string> = {
  flame: "Flammable",
  exclamation: "Health hazard / irritant",
  health: "Serious health hazard",
  corrosion: "Corrosive to skin, eyes, or metals",
  environment: "Hazardous to aquatic environment",
  skull: "Acute toxicity",
  explosive: "Explosive",
  gas: "Gas under pressure",
  oxidizer: "Oxidizer",
};

const H_STATEMENTS: Record<string, string> = {
  H226: "Flammable liquid and vapour",
  H304: "May be fatal if swallowed and enters airways",
  H314: "Causes severe skin burns and eye damage",
  H315: "Causes skin irritation",
  H318: "Causes serious eye damage",
  H319: "Causes serious eye irritation",
  H336: "May cause drowsiness or dizziness",
};
