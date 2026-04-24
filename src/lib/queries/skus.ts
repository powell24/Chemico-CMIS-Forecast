import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";
import type { RecStatus } from "@/lib/queries/recommendations";

export type SkuRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  openRecCount: number;
  worstRecStatus: RecStatus | "none";
  // SDS is joined in the section that renders rows so we don't double-query.
};

export type SkuDetail = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  packSize: number;
  defaultSupplierName: string | null;
  openRecommendations: {
    id: string;
    siteName: string;
    siteCity: string;
    siteState: string;
    customerName: string;
    currentStock: number;
    reorderPoint: number;
    projectedStockout: string | null;
    status: RecStatus;
  }[];
  forecastByMonth: {
    month: string;
    forecast: number;
    actual: number | null;
    lower: number;
    upper: number;
  }[];
};

export async function listSkus(): Promise<SkuRow[]> {
  return withCache("skus:list:v1", 300, async () => {
    const supabase = await createClient();
    const [skusRes, recsRes] = await Promise.all([
      supabase.from("skus").select("id, code, name, category, unit").order("code"),
      supabase
        .from("recommendations")
        .select("sku_id, status")
        .neq("status", "healthy"),
    ]);
    if (skusRes.error) throw skusRes.error;
    if (recsRes.error) throw recsRes.error;

    const openCount = new Map<string, number>();
    const worst = new Map<string, RecStatus>();
    const rank = (s: RecStatus) => (s === "risk" ? 2 : s === "nearing" ? 1 : 0);

    for (const r of recsRes.data ?? []) {
      const id = r.sku_id as string;
      openCount.set(id, (openCount.get(id) ?? 0) + 1);
      const prev = worst.get(id);
      if (!prev || rank(r.status as RecStatus) > rank(prev)) {
        worst.set(id, r.status as RecStatus);
      }
    }

    return (skusRes.data ?? []).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      category: s.category,
      unit: s.unit,
      openRecCount: openCount.get(s.id) ?? 0,
      worstRecStatus: worst.get(s.id) ?? "none",
    }));
  });
}

export async function getSkuByCode(code: string): Promise<SkuDetail | null> {
  const supabase = await createClient();

  type SkuRow = {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    pack_size: number;
    suppliers: { name: string } | null;
  };

  const { data: skuData, error: skuErr } = await supabase
    .from("skus")
    .select(
      "id, code, name, category, unit, pack_size, suppliers:default_supplier_id ( name )",
    )
    .eq("code", code)
    .maybeSingle();
  if (skuErr) throw skuErr;
  const sku = skuData as unknown as SkuRow | null;
  if (!sku) return null;

  const [recsRes, forecastRes] = await Promise.all([
    supabase
      .from("recommendations")
      .select(
        `
        id,
        current_stock,
        reorder_point,
        projected_stockout_date,
        status,
        sites:site_id ( name, city, state ),
        customers:customer_id ( name )
      `,
      )
      .eq("sku_id", sku.id)
      .neq("status", "healthy")
      .order("projected_stockout_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("forecasts")
      .select("period_start, forecast_qty, actual_qty, lower_bound, upper_bound")
      .eq("sku_id", sku.id)
      .order("period_start", { ascending: true }),
  ]);

  if (recsRes.error) throw recsRes.error;
  if (forecastRes.error) throw forecastRes.error;

  type RecJoined = {
    id: string;
    current_stock: number;
    reorder_point: number;
    projected_stockout_date: string | null;
    status: RecStatus;
    sites: { name: string; city: string; state: string } | null;
    customers: { name: string } | null;
  };
  const recs = (recsRes.data ?? []) as unknown as RecJoined[];

  // Aggregate forecasts by month-start across all site/customer combos for this SKU
  const monthMap = new Map<
    string,
    {
      forecast: number;
      actual: number | null;
      lower: number;
      upper: number;
    }
  >();
  for (const f of forecastRes.data ?? []) {
    const key = f.period_start as string;
    const bucket = monthMap.get(key) ?? {
      forecast: 0,
      actual: null,
      lower: 0,
      upper: 0,
    };
    const fq = Number(f.forecast_qty);
    bucket.forecast += fq;
    bucket.lower += Number(f.lower_bound ?? fq * 0.85);
    bucket.upper += Number(f.upper_bound ?? fq * 1.15);
    const a = f.actual_qty;
    if (a !== null && a !== undefined) {
      bucket.actual = (bucket.actual ?? 0) + Number(a);
    }
    monthMap.set(key, bucket);
  }
  const forecastByMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({
      month,
      forecast: Math.round(v.forecast),
      actual: v.actual !== null ? Math.round(v.actual) : null,
      lower: Math.round(v.lower),
      upper: Math.round(v.upper),
    }));

  return {
    id: sku.id,
    code: sku.code,
    name: sku.name,
    category: sku.category,
    unit: sku.unit,
    packSize: sku.pack_size,
    defaultSupplierName: sku.suppliers?.name ?? null,
    openRecommendations: recs.map((r) => ({
      id: r.id,
      siteName: r.sites?.name ?? "—",
      siteCity: r.sites?.city ?? "",
      siteState: r.sites?.state ?? "",
      customerName: r.customers?.name ?? "—",
      currentStock: Number(r.current_stock),
      reorderPoint: Number(r.reorder_point),
      projectedStockout: r.projected_stockout_date,
      status: r.status,
    })),
    forecastByMonth,
  };
}
