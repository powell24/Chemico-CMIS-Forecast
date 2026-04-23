"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  Dimension,
  ForecastSeries,
  Horizon,
  ViewMode,
} from "@/lib/queries/forecast";
import type { FilterOptions } from "@/lib/queries/filter-options";
import { formatNumber } from "@/lib/format";
import { getForecastSeriesAction } from "@/app/(app)/actions";

const chartConfig = {
  forecast: { label: "Forecast", color: "var(--primary)" },
  actual: { label: "Actual", color: "var(--muted-foreground)" },
  band: { label: "Confidence", color: "var(--primary)" },
  anomaly: { label: "Anomaly", color: "var(--chart-5)" },
} satisfies ChartConfig;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonthLabel(iso: string, horizon: Horizon) {
  const d = new Date(iso);
  if (horizon === "30d")
    return `${MONTH_SHORT[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
  return `${MONTH_SHORT[d.getMonth()]} ’${String(d.getFullYear()).slice(-2)}`;
}

export function ForecastChart({
  initial,
  filterOptions,
}: {
  initial: ForecastSeries;
  filterOptions: FilterOptions;
}) {
  const [dimension, setDimension] = useState<Dimension>(initial.meta.dimension);
  const [mode, setMode] = useState<ViewMode>(initial.meta.mode);
  const [horizon, setHorizon] = useState<Horizon>(initial.meta.horizon);
  const [filter, setFilter] = useState<string | null>(initial.meta.filter);
  const [series, setSeries] = useState<ForecastSeries>(initial);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const next = await getForecastSeriesAction({
        dimension,
        mode,
        horizon,
        filter,
      });
      setSeries(next);
    });
  }, [dimension, mode, horizon, filter]);

  const slices =
    dimension === "customer"
      ? filterOptions.customers
      : dimension === "plant"
        ? filterOptions.sites
        : dimension === "sku"
          ? filterOptions.skus
          : [];

  const chartData = useMemo(() => {
    return series.points.map((p) => ({
      label:
        mode === "timeline"
          ? formatMonthLabel(p.periodStart, horizon)
          : MONTH_SHORT[new Date(p.periodStart).getMonth()],
      forecast: p.forecast,
      actual: p.actual,
      lower: p.lower,
      upper: p.upper,
      anomaly: p.anomaly ? p.actual : null,
    }));
  }, [series.points, mode, horizon]);

  const isEmpty = chartData.length === 0;

  function handleDimensionChange(next: Dimension) {
    setDimension(next);
    setFilter(null);
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">Forecast vs. Actual</CardTitle>
            <CardDescription className="text-xs">
              {series.meta.sliceLabel}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={dimension}
              onValueChange={(v) => handleDimensionChange(v as Dimension)}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="customer">Customer</TabsTrigger>
                <TabsTrigger value="plant">Plant</TabsTrigger>
                <TabsTrigger value="sku">SKU</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={mode} onValueChange={(v) => setMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "timeline" && (
            <Select
              value={horizon}
              onValueChange={(v) => setHorizon(v as Horizon)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
                <SelectItem value="12mo">12 months</SelectItem>
              </SelectContent>
            </Select>
          )}
          {dimension !== "all" && (
            <Select
              value={filter ?? "__none__"}
              onValueChange={(v) => setFilter(v === "__none__" ? null : v)}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue
                  placeholder={`Select a ${
                    dimension === "plant" ? "plant" : dimension
                  }`}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  All {dimension === "plant" ? "plants" : `${dimension}s`}
                </SelectItem>
                {slices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isPending && (
            <span className="text-xs text-muted-foreground">Updating…</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[320px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No data for this slice — try another.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="band-fill" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
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
                  fill="url(#band-fill)"
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
                <Scatter
                  dataKey="anomaly"
                  fill="var(--chart-5)"
                  shape="circle"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
