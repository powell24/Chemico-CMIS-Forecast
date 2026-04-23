import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";
import type { RecStatus } from "@/lib/queries/recommendations";

export type SiteStatus = RecStatus | "unknown";

export type SiteSummary = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  worstStatus: SiteStatus;
  customerCount: number;
  openRecCount: number;
  earliestStockout: string | null;
  customerIds: string[];
};

const STATUS_RANK: Record<SiteStatus, number> = {
  risk: 3,
  nearing: 2,
  healthy: 1,
  unknown: 0,
};

export async function getSiteSummaries(): Promise<SiteSummary[]> {
  return withCache("sites:summaries:v1", 600, computeSiteSummaries);
}

async function computeSiteSummaries(): Promise<SiteSummary[]> {
  const supabase = await createClient();

  const [sitesRes, recsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, city, state, lat, lng")
      .order("name", { ascending: true }),
    supabase
      .from("recommendations")
      .select("site_id, status, projected_stockout_date"),
    supabase.from("customer_site_skus").select("site_id, customer_id"),
  ]);

  if (sitesRes.error) throw sitesRes.error;
  if (recsRes.error) throw recsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  type SiteRow = {
    id: string;
    name: string;
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
  };
  type RecRow = {
    site_id: string;
    status: RecStatus;
    projected_stockout_date: string | null;
  };
  type AssignmentRow = {
    site_id: string;
    customer_id: string;
  };

  const sites = (sitesRes.data ?? []) as SiteRow[];
  const recs = (recsRes.data ?? []) as RecRow[];
  const assignments = (assignmentsRes.data ?? []) as AssignmentRow[];

  const worstBySite = new Map<string, SiteStatus>();
  const openRecBySite = new Map<string, number>();
  const earliestStockoutBySite = new Map<string, string>();

  for (const r of recs) {
    const prev = worstBySite.get(r.site_id) ?? "unknown";
    if (STATUS_RANK[r.status] > STATUS_RANK[prev]) {
      worstBySite.set(r.site_id, r.status);
    }
    if (r.status === "risk" || r.status === "nearing") {
      openRecBySite.set(
        r.site_id,
        (openRecBySite.get(r.site_id) ?? 0) + 1,
      );
    }
    if (r.projected_stockout_date) {
      const prevDate = earliestStockoutBySite.get(r.site_id);
      if (!prevDate || r.projected_stockout_date < prevDate) {
        earliestStockoutBySite.set(r.site_id, r.projected_stockout_date);
      }
    }
  }

  const customersBySite = new Map<string, Set<string>>();
  for (const a of assignments) {
    const set = customersBySite.get(a.site_id) ?? new Set<string>();
    set.add(a.customer_id);
    customersBySite.set(a.site_id, set);
  }

  return sites
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city,
      state: s.state,
      lat: Number(s.lat),
      lng: Number(s.lng),
      worstStatus: worstBySite.get(s.id) ?? "unknown",
      customerCount: customersBySite.get(s.id)?.size ?? 0,
      openRecCount: openRecBySite.get(s.id) ?? 0,
      earliestStockout: earliestStockoutBySite.get(s.id) ?? null,
      customerIds: [...(customersBySite.get(s.id) ?? new Set<string>())],
    }));
}

export type SiteDetailSku = {
  code: string;
  name: string;
  category: string;
  openRecCount: number;
};

export type SiteDetailRec = {
  id: string;
  skuCode: string;
  skuName: string;
  customerName: string;
  currentStock: number;
  reorderPoint: number;
  projectedStockout: string | null;
  status: RecStatus;
};

export type SiteDetail = {
  site: {
    id: string;
    name: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  };
  customers: string[];
  topSkus: SiteDetailSku[];
  recommendations: SiteDetailRec[];
};

export async function getSiteDetail(id: string): Promise<SiteDetail | null> {
  return withCache(`sites:detail:${id}:v1`, 300, () => fetchSiteDetail(id));
}

async function fetchSiteDetail(id: string): Promise<SiteDetail | null> {
  const supabase = await createClient();

  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("id, name, city, state, lat, lng")
    .eq("id", id)
    .single();
  if (siteErr || !site) return null;

  const [recsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("recommendations")
      .select(
        `
        id, current_stock, reorder_point, projected_stockout_date, status,
        customers:customer_id ( name ),
        skus:sku_id ( code, name, category )
      `,
      )
      .eq("site_id", id)
      .in("status", ["risk", "nearing", "healthy"])
      .order("projected_stockout_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("customer_site_skus")
      .select("customer_id, customers:customer_id ( name )")
      .eq("site_id", id),
  ]);

  if (recsRes.error) throw recsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  type RecJoinRow = {
    id: string;
    current_stock: number;
    reorder_point: number;
    projected_stockout_date: string | null;
    status: RecStatus;
    customers: { name: string } | null;
    skus: { code: string; name: string; category: string } | null;
  };
  type AssignmentJoinRow = {
    customer_id: string;
    customers: { name: string } | null;
  };

  const recsRaw = (recsRes.data ?? []) as unknown as RecJoinRow[];
  const assignments = (assignmentsRes.data ?? []) as unknown as AssignmentJoinRow[];

  const customers = [
    ...new Set(
      assignments.map((a) => a.customers?.name ?? "").filter((n) => n.length > 0),
    ),
  ].sort();

  const skuAgg = new Map<
    string,
    { code: string; name: string; category: string; count: number }
  >();
  for (const r of recsRaw) {
    if (!r.skus) continue;
    if (r.status === "healthy") continue;
    const key = r.skus.code;
    const bucket = skuAgg.get(key) ?? {
      code: r.skus.code,
      name: r.skus.name,
      category: r.skus.category,
      count: 0,
    };
    bucket.count += 1;
    skuAgg.set(key, bucket);
  }

  const topSkus: SiteDetailSku[] = [...skuAgg.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((s) => ({
      code: s.code,
      name: s.name,
      category: s.category,
      openRecCount: s.count,
    }));

  const recommendations: SiteDetailRec[] = recsRaw
    .filter((r) => r.status !== "healthy")
    .slice(0, 12)
    .map((r) => ({
      id: r.id,
      skuCode: r.skus?.code ?? "—",
      skuName: r.skus?.name ?? "—",
      customerName: r.customers?.name ?? "—",
      currentStock: Number(r.current_stock),
      reorderPoint: Number(r.reorder_point),
      projectedStockout: r.projected_stockout_date,
      status: r.status,
    }));

  return {
    site: {
      id: site.id,
      name: site.name,
      city: site.city,
      state: site.state,
      lat: Number(site.lat),
      lng: Number(site.lng),
    },
    customers,
    topSkus,
    recommendations,
  };
}
