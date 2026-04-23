import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";

export type Dimension = "all" | "customer" | "plant" | "sku";
export type ViewMode = "timeline" | "seasonal";
export type Horizon = "30d" | "90d" | "12mo";

export type ForecastPoint = {
  periodStart: string;
  forecast: number;
  actual: number;
  lower: number;
  upper: number;
  anomaly: boolean;
};

export type ForecastSeries = {
  points: ForecastPoint[];
  meta: {
    dimension: Dimension;
    mode: ViewMode;
    horizon: Horizon;
    filter: string | null;
    sliceLabel: string;
  };
};

export type ForecastArgs = {
  dimension: Dimension;
  mode: ViewMode;
  horizon: Horizon;
  filter: string | null;
};

const HORIZON_MONTHS: Record<Horizon, number> = {
  "30d": 1,
  "90d": 3,
  "12mo": 12,
};

export async function getForecastSeries(
  args: ForecastArgs,
): Promise<ForecastSeries> {
  const key = `forecast:v1:${args.dimension}:${args.mode}:${args.horizon}:${args.filter ?? "all"}`;
  return withCache(key, 600, () => computeForecastSeries(args));
}

async function computeForecastSeries(
  args: ForecastArgs,
): Promise<ForecastSeries> {
  const supabase = await createClient();

  let query = supabase
    .from("forecasts")
    .select(
      "period_start, forecast_qty, actual_qty, lower_bound, upper_bound, anomaly_flag, customer_id, site_id, sku_id",
    )
    .order("period_start", { ascending: true });

  if (args.filter) {
    if (args.dimension === "customer") query = query.eq("customer_id", args.filter);
    else if (args.dimension === "plant") query = query.eq("site_id", args.filter);
    else if (args.dimension === "sku") query = query.eq("sku_id", args.filter);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];

  const months = HORIZON_MONTHS[args.horizon];
  const allPeriods = [...new Set(rows.map((r) => r.period_start as string))].sort();
  const periods =
    args.mode === "timeline" ? allPeriods.slice(-months) : allPeriods;
  const periodSet = new Set(periods);
  const filtered = rows.filter((r) => periodSet.has(r.period_start as string));

  const grouped = new Map<
    string,
    {
      forecast: number;
      actual: number;
      lower: number;
      upper: number;
      anomaly: boolean;
    }
  >();

  for (const r of filtered) {
    const p = r.period_start as string;
    const bucket = grouped.get(p) ?? {
      forecast: 0,
      actual: 0,
      lower: 0,
      upper: 0,
      anomaly: false,
    };
    bucket.forecast += Number(r.forecast_qty);
    bucket.actual += Number(r.actual_qty);
    bucket.lower += Number(r.lower_bound);
    bucket.upper += Number(r.upper_bound);
    if (r.anomaly_flag) bucket.anomaly = true;
    grouped.set(p, bucket);
  }

  const points: ForecastPoint[] = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodStart, b]) => ({
      periodStart,
      forecast: Math.round(b.forecast),
      actual: Math.round(b.actual),
      lower: Math.round(b.lower),
      upper: Math.round(b.upper),
      anomaly: b.anomaly,
    }));

  const sliceLabel = args.filter
    ? await resolveSliceLabel(args.dimension, args.filter)
    : "All customers, plants, SKUs";

  return {
    points,
    meta: {
      dimension: args.dimension,
      mode: args.mode,
      horizon: args.horizon,
      filter: args.filter,
      sliceLabel,
    },
  };
}

async function resolveSliceLabel(
  dimension: Dimension,
  id: string,
): Promise<string> {
  const supabase = await createClient();
  if (dimension === "customer") {
    const { data } = await supabase.from("customers").select("name").eq("id", id).single();
    return data?.name ?? "Unknown customer";
  }
  if (dimension === "plant") {
    const { data } = await supabase
      .from("sites")
      .select("name, city, state")
      .eq("id", id)
      .single();
    return data ? `${data.name} — ${data.city}, ${data.state}` : "Unknown plant";
  }
  if (dimension === "sku") {
    const { data } = await supabase.from("skus").select("code, name").eq("id", id).single();
    return data ? `${data.code} · ${data.name}` : "Unknown SKU";
  }
  return "All";
}
