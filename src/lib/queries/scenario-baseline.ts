import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";
import type { ScenarioBaselineBucket } from "@/lib/scenario/math";

export type ScenarioBaseline = {
  buckets: ScenarioBaselineBucket[];
  baselineAccuracy: number;
};

export async function getScenarioBaseline(): Promise<ScenarioBaseline> {
  return withCache("scenario-baseline:v1", 600, computeBaseline);
}

async function computeBaseline(): Promise<ScenarioBaseline> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forecasts")
    .select(
      "forecast_qty, actual_qty, anomaly_flag, skus:sku_id ( category )",
    );
  if (error) throw error;

  type Row = {
    forecast_qty: number;
    actual_qty: number;
    anomaly_flag: boolean;
    skus: { category: string } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  const byCategory = new Map<string, ScenarioBaselineBucket>();
  let totalForecast = 0;
  let totalAbsError = 0;

  for (const r of rows) {
    const cat = r.skus?.category ?? "other";
    const f = Number(r.forecast_qty);
    const a = Number(r.actual_qty);
    totalForecast += f;
    totalAbsError += Math.abs(f - a);

    const bucket = byCategory.get(cat) ?? {
      category: cat,
      excessUnits: 0,
      shortageUnits: 0,
      anomalyCount: 0,
      totalForecast: 0,
    };
    bucket.totalForecast += f;
    if (f > a) bucket.excessUnits += f - a;
    else bucket.shortageUnits += a - f;
    if (r.anomaly_flag) bucket.anomalyCount += 1;
    byCategory.set(cat, bucket);
  }

  const buckets = [...byCategory.values()].sort(
    (a, b) => b.totalForecast - a.totalForecast,
  );

  const baselineAccuracy =
    totalForecast > 0
      ? Math.max(0, 100 - (totalAbsError / totalForecast) * 100)
      : 0;

  return { buckets, baselineAccuracy };
}
