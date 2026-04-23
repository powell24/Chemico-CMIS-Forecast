import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";

export type FilterOption = { id: string; name: string; count: number };

export type FilterOptions = {
  customers: FilterOption[];
  sites: FilterOption[];
  skus: FilterOption[];
};

export async function getFilterOptions(): Promise<FilterOptions> {
  return withCache("filter-options:v1", 600, fetchFilterOptions);
}

async function fetchFilterOptions(): Promise<FilterOptions> {
  const supabase = await createClient();

  const [customersRes, sitesRes, skusRes, assignmentsRes] = await Promise.all([
    supabase.from("customers").select("id, name"),
    supabase.from("sites").select("id, name, city, state"),
    supabase.from("skus").select("id, code, name"),
    supabase.from("customer_site_skus").select("customer_id, site_id, sku_id"),
  ]);

  if (customersRes.error) throw customersRes.error;
  if (sitesRes.error) throw sitesRes.error;
  if (skusRes.error) throw skusRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const customerCounts = new Map<string, number>();
  const siteCounts = new Map<string, number>();
  const skuCounts = new Map<string, number>();

  for (const a of assignmentsRes.data ?? []) {
    customerCounts.set(a.customer_id, (customerCounts.get(a.customer_id) ?? 0) + 1);
    siteCounts.set(a.site_id, (siteCounts.get(a.site_id) ?? 0) + 1);
    skuCounts.set(a.sku_id, (skuCounts.get(a.sku_id) ?? 0) + 1);
  }

  const customers: FilterOption[] = (customersRes.data ?? [])
    .map((c) => ({ id: c.id, name: c.name, count: customerCounts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sites: FilterOption[] = (sitesRes.data ?? [])
    .map((s) => ({
      id: s.id,
      name: `${s.name} — ${s.city}, ${s.state}`,
      count: siteCounts.get(s.id) ?? 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const skus: FilterOption[] = (skusRes.data ?? [])
    .map((s) => ({
      id: s.id,
      name: `${s.code} · ${s.name}`,
      count: skuCounts.get(s.id) ?? 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { customers, sites, skus };
}
