"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  Banknote,
  ChevronDown,
  Gauge,
  RotateCcw,
  ShieldAlert,
  Truck,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  computeScenario,
  SCENARIO_DEFAULTS,
  type ScenarioBaselineBucket,
} from "@/lib/scenario/math";
import { formatMoney, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const chartConfig = {
  workingCap: { label: "Working capital", color: "var(--primary)" },
  stockout: { label: "Stockout risk", color: "var(--chart-5)" },
  freight: { label: "Expedited freight", color: "var(--chart-2)" },
} satisfies ChartConfig;

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ScenarioPlanner({
  baseline,
  baselineAccuracy,
}: {
  baseline: ScenarioBaselineBucket[];
  baselineAccuracy: number;
}) {
  const [accuracyLiftPct, setAccuracyLiftPct] = useState(
    SCENARIO_DEFAULTS.accuracyLiftPct,
  );
  const [carryingCostPct, setCarryingCostPct] = useState(
    SCENARIO_DEFAULTS.carryingCostPct,
  );
  const [horizonMonths, setHorizonMonths] = useState<12 | 24>(
    SCENARIO_DEFAULTS.horizonMonths,
  );
  const [explainerOpen, setExplainerOpen] = useState(false);

  const outcome = useMemo(
    () =>
      computeScenario(
        { accuracyLiftPct, carryingCostPct, horizonMonths },
        baseline,
      ),
    [accuracyLiftPct, carryingCostPct, horizonMonths, baseline],
  );

  const chartData = useMemo(
    () =>
      outcome.breakdown.map((b) => ({
        category: titleCase(b.category),
        workingCap: Math.round(b.workingCap),
        stockout: Math.round(b.stockout),
        freight: Math.round(b.freight),
      })),
    [outcome.breakdown],
  );

  function handleReset() {
    setAccuracyLiftPct(SCENARIO_DEFAULTS.accuracyLiftPct);
    setCarryingCostPct(SCENARIO_DEFAULTS.carryingCostPct);
    setHorizonMonths(SCENARIO_DEFAULTS.horizonMonths);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          What-If: Forecast Accuracy
        </h1>
        <p className="text-sm text-muted-foreground">
          Sandbox — dial the forecast-accuracy lift and see what it unlocks for
          Chemico. Uses the same unit economics as the dashboard KPIs.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dials</CardTitle>
            <CardDescription className="text-xs">
              Today's forecast accuracy is {formatPct(baselineAccuracy)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="accuracy-lift"
                  className="text-sm font-medium"
                >
                  Forecast accuracy lift
                </label>
                <span className="text-sm font-semibold tabular-nums text-primary">
                  +{accuracyLiftPct.toFixed(1)} pp
                </span>
              </div>
              <Slider
                id="accuracy-lift"
                value={[accuracyLiftPct]}
                onValueChange={(v) => setAccuracyLiftPct(v[0])}
                min={0}
                max={10}
                step={0.5}
              />
              <p className="text-xs text-muted-foreground">
                Projected accuracy at this lift:{" "}
                <span className="font-medium text-foreground">
                  {formatPct(
                    Math.min(100, baselineAccuracy + accuracyLiftPct),
                  )}
                </span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <label htmlFor="carrying-cost" className="text-sm font-medium">
                  Carrying cost rate
                </label>
                <span className="text-sm font-semibold tabular-nums">
                  {carryingCostPct}%
                </span>
              </div>
              <Slider
                id="carrying-cost"
                value={[carryingCostPct]}
                onValueChange={(v) => setCarryingCostPct(v[0])}
                min={6}
                max={15}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                The rate finance charges for holding excess inventory.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Horizon</label>
              <Select
                value={String(horizonMonths)}
                onValueChange={(v) =>
                  setHorizonMonths(Number(v) as 12 | 24)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="w-full cursor-pointer gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Reset to proposal baseline
            </Button>
          </CardContent>
        </Card>

        {/* Outcomes */}
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OutcomeCard
              icon={<Wallet className="size-4" />}
              label="Working capital freed"
              value={formatMoney(outcome.workingCapitalFreed)}
              tint="primary"
            />
            <OutcomeCard
              icon={<ShieldAlert className="size-4" />}
              label="Stockout risk reduced"
              value={formatMoney(outcome.stockoutRiskReduced)}
              tint="destructive"
            />
            <OutcomeCard
              icon={<Truck className="size-4" />}
              label="Expedited freight avoided"
              value={formatMoney(outcome.expeditedFreightAvoided)}
              tint="chart-2"
            />
            <OutcomeCard
              icon={<Banknote className="size-4" />}
              label="Total annual win"
              value={formatMoney(outcome.totalAnnualWin)}
              tint="accent"
              emphasized
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Where the win comes from</CardTitle>
              <CardDescription className="text-xs">
                Stacked contribution by SKU category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ||
              outcome.totalAnnualWin === 0 ? (
                <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Gauge className="size-4" />
                    Dial the accuracy lift above zero to project a win.
                  </span>
                </div>
              ) : (
                <ChartContainer
                  config={chartConfig}
                  className="h-[280px] w-full"
                >
                  <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={56}
                      tickFormatter={(v: number) => formatMoney(v)}
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                {chartConfig[name as keyof typeof chartConfig]
                                  ?.label ?? String(name)}
                              </span>
                              <span className="font-medium text-foreground tabular-nums">
                                {formatMoney(Number(value))}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="workingCap"
                      stackId="win"
                      fill="var(--color-workingCap)"
                      radius={[0, 0, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="stockout"
                      stackId="win"
                      fill="var(--color-stockout)"
                      radius={[0, 0, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="freight"
                      stackId="win"
                      fill="var(--color-freight)"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardContent className="flex items-start gap-3 p-4">
              <ArrowRight
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <p className="text-sm leading-relaxed">
                At{" "}
                <span className="font-semibold text-primary">
                  +{accuracyLiftPct.toFixed(1)} pp
                </span>{" "}
                accuracy, Chemico frees{" "}
                <span className="font-semibold">
                  {formatMoney(outcome.workingCapitalFreed)}
                </span>{" "}
                in working capital, avoids{" "}
                <span className="font-semibold">
                  {formatMoney(outcome.stockoutRiskReduced)}
                </span>{" "}
                in stockouts, and cuts{" "}
                <span className="font-semibold">
                  {formatMoney(outcome.expeditedFreightAvoided)}
                </span>{" "}
                in expedited freight across the next{" "}
                <span className="font-semibold">{horizonMonths} months</span>.
                Total win:{" "}
                <span className="font-semibold">
                  {formatMoney(outcome.totalAnnualWin)}
                </span>
                .
              </p>
            </CardContent>
          </Card>

          <Card>
            <button
              type="button"
              onClick={() => setExplainerOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 px-6 py-4 text-left"
              aria-expanded={explainerOpen}
            >
              <span className="text-sm font-medium">
                How we got these numbers
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  explainerOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {explainerOpen && (
              <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
                <p>
                  The baseline is derived from 24 months of seeded forecasts
                  for 30 SKUs across 50 sites. For each forecast row we
                  compute three primitives: excess units (forecast &gt;
                  actual), shortage units (actual &gt; forecast), and
                  anomaly count.
                </p>
                <p>
                  At the selected horizon we scale those primitives to the
                  timeframe, then apply a proportional{" "}
                  <em>accuracy-lift reduction factor</em>: each percentage
                  point of lift eliminates 10% of the baseline error
                  magnitude (a 5 pp lift eliminates half the miss).
                </p>
                <ul className="space-y-1">
                  <li>
                    <span className="font-medium text-foreground">
                      Working capital freed
                    </span>{" "}
                    = excess units × $14.50 unit price × carrying cost rate
                    × reduction
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Stockout risk reduced
                    </span>{" "}
                    = shortage units × $38 penalty per unit × reduction
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Expedited freight avoided
                    </span>{" "}
                    = anomaly count × $2,400 expedited-freight surcharge ×
                    reduction
                  </li>
                </ul>
                <p>
                  The total win is the sum of the three. Constants match
                  those used by the dashboard KPI row so the two surfaces
                  never disagree.
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function OutcomeCard({
  icon,
  label,
  value,
  tint,
  emphasized,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "primary" | "destructive" | "chart-2" | "accent";
  emphasized?: boolean;
}) {
  const tintClass =
    tint === "primary"
      ? "text-primary bg-primary/10"
      : tint === "destructive"
        ? "text-destructive bg-destructive/10"
        : tint === "chart-2"
          ? "text-chart-2 bg-chart-2/10"
          : "text-accent bg-accent/10";
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        emphasized && "border-accent/40",
      )}
    >
      {emphasized && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-1 bg-accent"
        />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md",
              tintClass,
            )}
            aria-hidden
          >
            {icon}
          </span>
          <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
            {label}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
