import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";

export type HorizonDays = 30 | 60 | 90;
export type DriverMetric = "stockouts" | "freight" | "excess";

export type SiteRiskRow = {
  customer: string;
  site: string;
  sku: string;
  period: string;
  projectedStockout: string;
  currentStock: number;
  reorderPoint: number;
  daysUntilStockout: number;
};

export type SkuDriverRow = {
  customer: string;
  site: string;
  sku: string;
  period: string;
  value: number;
  unit: string;
};

export type CustomerExposureRow = {
  customer: string;
  atRiskSites: number;
  atRiskSkus: number;
  projectedShortfallUsd: number;
  earliestStockout: string | null;
};

export type SeasonalPatternResult = {
  sku: string;
  byQuarter: {
    winter: number;
    spring: number;
    summer: number;
    fall: number;
  };
  peakQuarter: "winter" | "spring" | "summer" | "fall";
  peakOverTrough: number;
  sampleMonths: number;
};

const UNIT_PRICE = 14.5;

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function quarterOf(monthIndex: number): "winter" | "spring" | "summer" | "fall" {
  if (monthIndex <= 1 || monthIndex === 11) return "winter";
  if (monthIndex <= 4) return "spring";
  if (monthIndex <= 7) return "summer";
  return "fall";
}

export async function getSiteRisk(
  horizonDays: HorizonDays = 30,
): Promise<SiteRiskRow[]> {
  return withCache(`chat:site-risk:${horizonDays}`, 300, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("recommendations")
      .select(
        `
        projected_stockout_date,
        current_stock,
        reorder_point,
        status,
        customers:customer_id ( name ),
        sites:site_id ( name, city, state ),
        skus:sku_id ( code, name )
      `,
      )
      .in("status", ["risk", "nearing"])
      .not("projected_stockout_date", "is", null)
      .order("projected_stockout_date", { ascending: true });

    if (error) throw error;

    type Row = {
      projected_stockout_date: string;
      current_stock: number;
      reorder_point: number;
      status: "nearing" | "risk";
      customers: { name: string } | null;
      sites: { name: string; city: string; state: string } | null;
      skus: { code: string; name: string } | null;
    };

    const rows = (data ?? []) as unknown as Row[];
    const now = new Date();
    return rows
      .map((r) => {
        const d = new Date(r.projected_stockout_date);
        return {
          customer: r.customers?.name ?? "—",
          site: r.sites
            ? `${r.sites.name} (${r.sites.city}, ${r.sites.state})`
            : "—",
          sku: r.skus ? `${r.skus.code} · ${r.skus.name}` : "—",
          period: "current",
          projectedStockout: r.projected_stockout_date,
          currentStock: Number(r.current_stock),
          reorderPoint: Number(r.reorder_point),
          daysUntilStockout: daysBetween(d, now),
        };
      })
      .filter((r) => r.daysUntilStockout <= horizonDays)
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  });
}

export async function getSkuDrivers(
  metric: DriverMetric,
  limit: number,
): Promise<SkuDriverRow[]> {
  const safeLimit = Math.min(Math.max(1, limit), 20);
  return withCache(`chat:drivers:${metric}:${safeLimit}`, 300, async () => {
    const supabase = await createClient();

    const { data: forecasts, error: fErr } = await supabase
      .from("forecasts")
      .select(
        "period_start, forecast_qty, actual_qty, anomaly_flag, customer_id, site_id, sku_id",
      );
    if (fErr) throw fErr;

    const [{ data: customers }, { data: sites }, { data: skus }] =
      await Promise.all([
        supabase.from("customers").select("id, name"),
        supabase.from("sites").select("id, name, city, state"),
        supabase.from("skus").select("id, code, name"),
      ]);
    const custName = new Map((customers ?? []).map((c) => [c.id, c.name]));
    const siteName = new Map(
      (sites ?? []).map((s) => [s.id, `${s.name} (${s.city}, ${s.state})`]),
    );
    const skuName = new Map(
      (skus ?? []).map((s) => [s.id, `${s.code} · ${s.name}`]),
    );

    const grouped = new Map<
      string,
      {
        customer: string;
        site: string;
        sku: string;
        latestPeriod: string;
        value: number;
      }
    >();

    for (const f of forecasts ?? []) {
      const key = `${f.customer_id}::${f.site_id}::${f.sku_id}`;
      const forecast = Number(f.forecast_qty);
      const actual = Number(f.actual_qty);
      const contribution =
        metric === "stockouts"
          ? Math.max(0, actual - forecast)
          : metric === "excess"
            ? Math.max(0, forecast - actual)
            : f.anomaly_flag
              ? 1
              : 0;

      const bucket = grouped.get(key) ?? {
        customer: custName.get(f.customer_id) ?? "—",
        site: siteName.get(f.site_id) ?? "—",
        sku: skuName.get(f.sku_id) ?? "—",
        latestPeriod: f.period_start as string,
        value: 0,
      };
      bucket.value += contribution;
      if ((f.period_start as string) > bucket.latestPeriod)
        bucket.latestPeriod = f.period_start as string;
      grouped.set(key, bucket);
    }

    const unit =
      metric === "freight" ? "anomaly events" : "units";

    return [...grouped.values()]
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, safeLimit)
      .map((r) => ({
        customer: r.customer,
        site: r.site,
        sku: r.sku,
        period: `through ${r.latestPeriod}`,
        value: Math.round(r.value),
        unit,
      }));
  });
}

export async function getCustomerExposure(args: {
  customerId?: string;
  horizonDays?: HorizonDays;
}): Promise<CustomerExposureRow[]> {
  const horizon = args.horizonDays ?? 30;
  const cacheKey = `chat:exposure:${args.customerId ?? "all"}:${horizon}`;
  return withCache(cacheKey, 300, async () => {
    const supabase = await createClient();

    let recQuery = supabase
      .from("recommendations")
      .select(
        `
        current_stock,
        reorder_point,
        projected_stockout_date,
        status,
        customer_id,
        site_id,
        sku_id,
        customers:customer_id ( name )
      `,
      )
      .in("status", ["risk", "nearing"])
      .not("projected_stockout_date", "is", null);

    if (args.customerId) recQuery = recQuery.eq("customer_id", args.customerId);

    const { data, error } = await recQuery;
    if (error) throw error;

    type Row = {
      current_stock: number;
      reorder_point: number;
      projected_stockout_date: string;
      status: "nearing" | "risk";
      customer_id: string;
      site_id: string;
      sku_id: string;
      customers: { name: string } | null;
    };

    const rows = (data ?? []) as unknown as Row[];
    const now = new Date();

    type Agg = {
      name: string;
      sites: Set<string>;
      skus: Set<string>;
      shortfall: number;
      earliest: string | null;
    };
    const byCustomer = new Map<string, Agg>();

    for (const r of rows) {
      const d = new Date(r.projected_stockout_date);
      if (daysBetween(d, now) > horizon) continue;
      const agg = byCustomer.get(r.customer_id) ?? {
        name: r.customers?.name ?? "—",
        sites: new Set<string>(),
        skus: new Set<string>(),
        shortfall: 0,
        earliest: null as string | null,
      };
      agg.sites.add(r.site_id);
      agg.skus.add(r.sku_id);
      const missing = Math.max(
        0,
        Number(r.reorder_point) - Number(r.current_stock),
      );
      agg.shortfall += missing * UNIT_PRICE;
      if (!agg.earliest || r.projected_stockout_date < agg.earliest) {
        agg.earliest = r.projected_stockout_date;
      }
      byCustomer.set(r.customer_id, agg);
    }

    return [...byCustomer.values()]
      .map((a) => ({
        customer: a.name,
        atRiskSites: a.sites.size,
        atRiskSkus: a.skus.size,
        projectedShortfallUsd: Math.round(a.shortfall),
        earliestStockout: a.earliest,
      }))
      .sort((a, b) => b.projectedShortfallUsd - a.projectedShortfallUsd);
  });
}

export async function getSeasonalPattern(
  skuId: string,
): Promise<SeasonalPatternResult | null> {
  return withCache(`chat:seasonal:${skuId}`, 600, async () => {
    const supabase = await createClient();

    const [{ data: forecasts, error: fErr }, { data: sku }] = await Promise.all(
      [
        supabase
          .from("forecasts")
          .select("period_start, actual_qty")
          .eq("sku_id", skuId),
        supabase.from("skus").select("code, name").eq("id", skuId).single(),
      ],
    );
    if (fErr) throw fErr;
    if (!sku) return null;

    const byQuarter = { winter: 0, spring: 0, summer: 0, fall: 0 };
    const countByQuarter = { winter: 0, spring: 0, summer: 0, fall: 0 };
    let sampleMonths = 0;

    for (const f of forecasts ?? []) {
      const d = new Date(f.period_start as string);
      const q = quarterOf(d.getMonth());
      byQuarter[q] += Number(f.actual_qty);
      countByQuarter[q] += 1;
      sampleMonths += 1;
    }

    const avg = {
      winter: countByQuarter.winter
        ? byQuarter.winter / countByQuarter.winter
        : 0,
      spring: countByQuarter.spring
        ? byQuarter.spring / countByQuarter.spring
        : 0,
      summer: countByQuarter.summer
        ? byQuarter.summer / countByQuarter.summer
        : 0,
      fall: countByQuarter.fall ? byQuarter.fall / countByQuarter.fall : 0,
    };

    const entries = Object.entries(avg) as Array<
      ["winter" | "spring" | "summer" | "fall", number]
    >;
    const peak = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
    const trough = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
    const peakOverTrough = trough[1] > 0 ? peak[1] / trough[1] : 0;

    return {
      sku: `${sku.code} · ${sku.name}`,
      byQuarter: {
        winter: Math.round(avg.winter),
        spring: Math.round(avg.spring),
        summer: Math.round(avg.summer),
        fall: Math.round(avg.fall),
      },
      peakQuarter: peak[0],
      peakOverTrough: Number(peakOverTrough.toFixed(2)),
      sampleMonths,
    };
  });
}
