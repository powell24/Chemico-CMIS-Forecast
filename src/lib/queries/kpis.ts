import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";

export type KpiPoint = { t: string; v: number };

export type KpiTile = {
  value: number;
  delta: number;
  spark: KpiPoint[];
};

export type KpiBundle = {
  forecastAccuracy: KpiTile;
  workingCapitalFreed: KpiTile;
  stockoutRisk: KpiTile;
  expeditedFreight: KpiTile;
};

const UNIT_PRICE = 14.5;
const STOCKOUT_PENALTY_PER_UNIT = 38;
const FREIGHT_PER_ANOMALY = 2400;

export async function getKpis(): Promise<KpiBundle> {
  return withCache("kpis:v1", 600, computeKpis);
}

async function computeKpis(): Promise<KpiBundle> {
  const supabase = await createClient();

  const { data: forecasts, error } = await supabase
    .from("forecasts")
    .select(
      "period_start, forecast_qty, actual_qty, lower_bound, upper_bound, anomaly_flag",
    )
    .order("period_start", { ascending: true });

  if (error) throw error;
  const rows = forecasts ?? [];

  const byPeriod = new Map<
    string,
    {
      forecast: number;
      actual: number;
      absErr: number;
      anomalies: number;
      excessUnits: number;
      shortUnits: number;
    }
  >();

  for (const r of rows) {
    const p = r.period_start as string;
    const f = Number(r.forecast_qty);
    const a = Number(r.actual_qty);
    const bucket = byPeriod.get(p) ?? {
      forecast: 0,
      actual: 0,
      absErr: 0,
      anomalies: 0,
      excessUnits: 0,
      shortUnits: 0,
    };
    bucket.forecast += f;
    bucket.actual += a;
    bucket.absErr += Math.abs(f - a);
    if (r.anomaly_flag) bucket.anomalies += 1;
    if (f > a) bucket.excessUnits += f - a;
    else bucket.shortUnits += a - f;
    byPeriod.set(p, bucket);
  }

  const periods = [...byPeriod.entries()].sort(([a], [b]) => a.localeCompare(b));

  const accSeries: KpiPoint[] = periods.map(([t, b]) => ({
    t,
    v: b.forecast > 0 ? Math.max(0, 100 - (b.absErr / b.forecast) * 100) : 0,
  }));

  const workingCapSeries: KpiPoint[] = periods.map(([t, b]) => ({
    t,
    v: b.excessUnits * UNIT_PRICE * 0.12,
  }));

  const stockoutSeries: KpiPoint[] = periods.map(([t, b]) => ({
    t,
    v: b.shortUnits * STOCKOUT_PENALTY_PER_UNIT,
  }));

  const freightSeries: KpiPoint[] = periods.map(([t, b]) => ({
    t,
    v: b.anomalies * FREIGHT_PER_ANOMALY,
  }));

  return {
    forecastAccuracy: tileFromSeries(accSeries),
    workingCapitalFreed: tileFromSeries(workingCapSeries),
    stockoutRisk: tileFromSeries(stockoutSeries),
    expeditedFreight: tileFromSeries(freightSeries),
  };
}

function tileFromSeries(series: KpiPoint[]): KpiTile {
  if (series.length === 0) return { value: 0, delta: 0, spark: [] };
  const last = series[series.length - 1].v;
  const prev = series.length > 1 ? series[series.length - 2].v : last;
  const delta = prev === 0 ? 0 : ((last - prev) / Math.abs(prev)) * 100;
  const spark = series.slice(-12);
  return { value: last, delta, spark };
}
