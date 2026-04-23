import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";

export type RecStatus = "healthy" | "nearing" | "risk";

export type RecommendationRow = {
  id: string;
  customerId: string;
  customerName: string;
  siteId: string;
  siteName: string;
  siteCity: string;
  siteState: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  currentStock: number;
  reorderPoint: number;
  projectedStockout: string | null;
  status: RecStatus;
};

export async function getRecommendations(): Promise<RecommendationRow[]> {
  return withCache("recs:v1", 300, fetchRecommendations);
}

async function fetchRecommendations(): Promise<RecommendationRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recommendations")
    .select(
      `
      id,
      current_stock,
      reorder_point,
      projected_stockout_date,
      status,
      customer_id,
      site_id,
      sku_id,
      customers:customer_id ( name ),
      sites:site_id ( name, city, state ),
      skus:sku_id ( code, name )
    `,
    )
    .order("projected_stockout_date", { ascending: true, nullsFirst: false });

  if (error) throw error;

  type JoinedRow = {
    id: string;
    current_stock: number;
    reorder_point: number;
    projected_stockout_date: string | null;
    status: RecStatus;
    customer_id: string;
    site_id: string;
    sku_id: string;
    customers: { name: string } | null;
    sites: { name: string; city: string; state: string } | null;
    skus: { code: string; name: string } | null;
  };

  const rows = (data ?? []) as unknown as JoinedRow[];

  return rows.map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customers?.name ?? "—",
    siteId: r.site_id,
    siteName: r.sites?.name ?? "—",
    siteCity: r.sites?.city ?? "",
    siteState: r.sites?.state ?? "",
    skuId: r.sku_id,
    skuCode: r.skus?.code ?? "—",
    skuName: r.skus?.name ?? "—",
    currentStock: Number(r.current_stock),
    reorderPoint: Number(r.reorder_point),
    projectedStockout: r.projected_stockout_date,
    status: r.status,
  }));
}
