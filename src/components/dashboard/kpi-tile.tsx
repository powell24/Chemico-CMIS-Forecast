"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDelta } from "@/lib/format";

export type KpiTileProps = {
  label: string;
  value: string;
  delta: number;
  deltaUnit?: "pp" | "%";
  spark: { t: string; v: number }[];
  tooltip: string;
  hero?: boolean;
  accent?: "primary" | "accent" | "destructive" | "chart-2";
};

export function KpiTile({
  label,
  value,
  delta,
  deltaUnit = "%",
  spark,
  tooltip,
  hero = false,
  accent = "primary",
}: KpiTileProps) {
  const strokeVar =
    accent === "accent"
      ? "var(--accent)"
      : accent === "destructive"
        ? "var(--destructive)"
        : accent === "chart-2"
          ? "var(--chart-2)"
          : "var(--primary)";

  const trend = delta >= 0 ? "up" : "down";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          className={cn(
            "relative overflow-hidden transition-colors",
            hero && "border-primary/30",
          )}
        >
          {hero && (
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full w-1 bg-accent"
            />
          )}
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              {label}
            </CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {value}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-end justify-between gap-4">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  trend === "up"
                    ? "bg-chart-4/15 text-chart-4"
                    : "bg-chart-5/15 text-chart-5",
                )}
              >
                {formatDelta(delta, deltaUnit)}
              </span>
              <div className="h-10 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spark}>
                    <defs>
                      <linearGradient
                        id={`spark-${label.replace(/\s+/g, "-")}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={strokeVar}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={strokeVar}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={strokeVar}
                      strokeWidth={1.5}
                      fill={`url(#spark-${label.replace(/\s+/g, "-")})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
