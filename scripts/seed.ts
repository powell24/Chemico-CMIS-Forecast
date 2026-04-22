/**
 * Deterministic seed for CMIS Forecast.
 * Run with: pnpm seed
 *
 * Produces a reproducible dataset covering all four proposal dimensions
 * (customer / plant / SKU / season) with realistic sparsity and
 * plausible seasonal patterns.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// ---------- deterministic RNG ----------
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(0xca5c); // fixed seed
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const range = (min: number, max: number) => min + rng() * (max - min);
const intRange = (min: number, max: number) =>
  Math.floor(range(min, max + 1));
const shuffle = <T>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// ---------- fixture data ----------
const CUSTOMERS = [
  { name: "General Motors", industry: "Automotive", fortune_100: true },
  { name: "Ford Motor Company", industry: "Automotive", fortune_100: true },
  { name: "Toyota North America", industry: "Automotive", fortune_100: true },
  { name: "Stellantis", industry: "Automotive", fortune_100: true },
  { name: "Honda Manufacturing", industry: "Automotive", fortune_100: true },
  { name: "Boeing", industry: "Aerospace", fortune_100: true },
  { name: "Honeywell Aerospace", industry: "Aerospace", fortune_100: true },
  { name: "Pfizer", industry: "Biopharma", fortune_100: true },
  { name: "Johnson & Johnson", industry: "Biopharma", fortune_100: true },
  {
    name: "U.S. Department of Defense",
    industry: "Government",
    fortune_100: false,
  },
  {
    name: "General Services Administration",
    industry: "Government",
    fortune_100: false,
  },
  { name: "Whirlpool", industry: "Manufacturing", fortune_100: true },
];

type SitePos = {
  city: string;
  state: string;
  region: string;
  lat: number;
  lng: number;
};

const SITES: SitePos[] = [
  // Midwest (18)
  { city: "Detroit", state: "MI", region: "Midwest", lat: 42.3314, lng: -83.0458 },
  { city: "Dearborn", state: "MI", region: "Midwest", lat: 42.3223, lng: -83.1763 },
  { city: "Flint", state: "MI", region: "Midwest", lat: 43.0125, lng: -83.6875 },
  { city: "Lansing", state: "MI", region: "Midwest", lat: 42.7325, lng: -84.5555 },
  { city: "Grand Rapids", state: "MI", region: "Midwest", lat: 42.9634, lng: -85.6681 },
  { city: "Toledo", state: "OH", region: "Midwest", lat: 41.6528, lng: -83.5379 },
  { city: "Columbus", state: "OH", region: "Midwest", lat: 39.9612, lng: -82.9988 },
  { city: "Cincinnati", state: "OH", region: "Midwest", lat: 39.1031, lng: -84.512 },
  { city: "Cleveland", state: "OH", region: "Midwest", lat: 41.4993, lng: -81.6944 },
  { city: "Akron", state: "OH", region: "Midwest", lat: 41.0814, lng: -81.519 },
  { city: "Indianapolis", state: "IN", region: "Midwest", lat: 39.7684, lng: -86.1581 },
  { city: "Fort Wayne", state: "IN", region: "Midwest", lat: 41.0793, lng: -85.1394 },
  { city: "Louisville", state: "KY", region: "Midwest", lat: 38.2527, lng: -85.7585 },
  { city: "Chicago", state: "IL", region: "Midwest", lat: 41.8781, lng: -87.6298 },
  { city: "Peoria", state: "IL", region: "Midwest", lat: 40.6936, lng: -89.589 },
  { city: "Milwaukee", state: "WI", region: "Midwest", lat: 43.0389, lng: -87.9065 },
  { city: "Minneapolis", state: "MN", region: "Midwest", lat: 44.9778, lng: -93.265 },
  { city: "St. Louis", state: "MO", region: "Midwest", lat: 38.627, lng: -90.1994 },

  // South (14)
  { city: "Nashville", state: "TN", region: "South", lat: 36.1627, lng: -86.7816 },
  { city: "Memphis", state: "TN", region: "South", lat: 35.1495, lng: -90.049 },
  { city: "Chattanooga", state: "TN", region: "South", lat: 35.0456, lng: -85.3097 },
  { city: "Birmingham", state: "AL", region: "South", lat: 33.5186, lng: -86.8104 },
  { city: "Huntsville", state: "AL", region: "South", lat: 34.7304, lng: -86.5861 },
  { city: "Atlanta", state: "GA", region: "South", lat: 33.749, lng: -84.388 },
  { city: "Savannah", state: "GA", region: "South", lat: 32.0809, lng: -81.0912 },
  { city: "Charleston", state: "SC", region: "South", lat: 32.7765, lng: -79.9311 },
  { city: "Greenville", state: "SC", region: "South", lat: 34.8526, lng: -82.394 },
  { city: "Charlotte", state: "NC", region: "South", lat: 35.2271, lng: -80.8431 },
  { city: "Raleigh", state: "NC", region: "South", lat: 35.7796, lng: -78.6382 },
  { city: "Jacksonville", state: "FL", region: "South", lat: 30.3322, lng: -81.6557 },
  { city: "Houston", state: "TX", region: "South", lat: 29.7604, lng: -95.3698 },
  { city: "Dallas", state: "TX", region: "South", lat: 32.7767, lng: -96.797 },

  // Northeast (8)
  { city: "Pittsburgh", state: "PA", region: "Northeast", lat: 40.4406, lng: -79.9959 },
  { city: "Philadelphia", state: "PA", region: "Northeast", lat: 39.9526, lng: -75.1652 },
  { city: "Buffalo", state: "NY", region: "Northeast", lat: 42.8864, lng: -78.8784 },
  { city: "Rochester", state: "NY", region: "Northeast", lat: 43.1566, lng: -77.6088 },
  { city: "Boston", state: "MA", region: "Northeast", lat: 42.3601, lng: -71.0589 },
  { city: "Hartford", state: "CT", region: "Northeast", lat: 41.7658, lng: -72.6734 },
  { city: "Trenton", state: "NJ", region: "Northeast", lat: 40.2206, lng: -74.7597 },
  { city: "Baltimore", state: "MD", region: "Northeast", lat: 39.2904, lng: -76.6122 },

  // West (10)
  { city: "Los Angeles", state: "CA", region: "West", lat: 34.0522, lng: -118.2437 },
  { city: "San Francisco", state: "CA", region: "West", lat: 37.7749, lng: -122.4194 },
  { city: "Sacramento", state: "CA", region: "West", lat: 38.5816, lng: -121.4944 },
  { city: "Phoenix", state: "AZ", region: "West", lat: 33.4484, lng: -112.074 },
  { city: "Tucson", state: "AZ", region: "West", lat: 32.2226, lng: -110.9747 },
  { city: "Las Vegas", state: "NV", region: "West", lat: 36.1699, lng: -115.1398 },
  { city: "Denver", state: "CO", region: "West", lat: 39.7392, lng: -104.9903 },
  { city: "Salt Lake City", state: "UT", region: "West", lat: 40.7608, lng: -111.891 },
  { city: "Seattle", state: "WA", region: "West", lat: 47.6062, lng: -122.3321 },
  { city: "Portland", state: "OR", region: "West", lat: 45.5152, lng: -122.6784 },
];

type SkuSpec = {
  code: string;
  name: string;
  category: string;
  unit: string;
  baseDemand: number;
  seasonalAmplitude: number;
  seasonalPeakMonth: number; // 1-12
};

const SKUS: SkuSpec[] = [
  { code: "CM-100", name: "Chemico Neutral Cleaner", category: "Cleaners", unit: "gal", baseDemand: 800, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "CM-110", name: "Degreaser Pro", category: "Cleaners", unit: "gal", baseDemand: 1200, seasonalAmplitude: 0.1, seasonalPeakMonth: 6 },
  { code: "CM-120", name: "Alkaline Industrial Cleaner", category: "Cleaners", unit: "gal", baseDemand: 500, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "SV-200", name: "Precision Solvent PS-40", category: "Solvents", unit: "gal", baseDemand: 350, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "SV-210", name: "IPA Solvent 99%", category: "Solvents", unit: "gal", baseDemand: 400, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "SV-220", name: "Mineral Spirits", category: "Solvents", unit: "gal", baseDemand: 600, seasonalAmplitude: 0.15, seasonalPeakMonth: 4 },
  { code: "SV-230", name: "Acetone Blend A", category: "Solvents", unit: "gal", baseDemand: 300, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "CL-300", name: "Synthetic Coolant Z100", category: "Coolants", unit: "gal", baseDemand: 900, seasonalAmplitude: 0.55, seasonalPeakMonth: 7 },
  { code: "CL-310", name: "Water-Soluble Coolant WS-30", category: "Coolants", unit: "gal", baseDemand: 700, seasonalAmplitude: 0.45, seasonalPeakMonth: 7 },
  { code: "CL-320", name: "Semi-Synthetic Coolant SX", category: "Coolants", unit: "gal", baseDemand: 500, seasonalAmplitude: 0.4, seasonalPeakMonth: 7 },
  { code: "DI-400", name: "Glycol Deicer GD-1", category: "Deicers", unit: "gal", baseDemand: 1100, seasonalAmplitude: 0.8, seasonalPeakMonth: 1 },
  { code: "DI-410", name: "Magnesium Chloride Pellets", category: "Deicers", unit: "lb", baseDemand: 8000, seasonalAmplitude: 0.85, seasonalPeakMonth: 1 },
  { code: "DI-420", name: "Calcium Chloride Brine", category: "Deicers", unit: "gal", baseDemand: 1400, seasonalAmplitude: 0.8, seasonalPeakMonth: 2 },
  { code: "LB-500", name: "Industrial Oil #40", category: "Lubricants", unit: "gal", baseDemand: 450, seasonalAmplitude: 0.1, seasonalPeakMonth: 10 },
  { code: "LB-510", name: "Gear Oil SAE 90", category: "Lubricants", unit: "gal", baseDemand: 300, seasonalAmplitude: 0.1, seasonalPeakMonth: 10 },
  { code: "LB-520", name: "Way Lube 68", category: "Lubricants", unit: "gal", baseDemand: 200, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "RG-600", name: "pH Adjuster Acid", category: "Reagents", unit: "gal", baseDemand: 250, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "RG-610", name: "Corrosion Inhibitor CI-2", category: "Reagents", unit: "gal", baseDemand: 180, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "PS-700", name: "Methylene Chloride Stripper", category: "Paint Strippers", unit: "gal", baseDemand: 220, seasonalAmplitude: 0.15, seasonalPeakMonth: 4 },
  { code: "PS-710", name: "Citrus Paint Stripper", category: "Paint Strippers", unit: "gal", baseDemand: 160, seasonalAmplitude: 0.15, seasonalPeakMonth: 4 },
  { code: "WT-800", name: "Boiler Treatment B-10", category: "Water Treatment", unit: "gal", baseDemand: 500, seasonalAmplitude: 0.3, seasonalPeakMonth: 1 },
  { code: "WT-810", name: "Cooling Tower Treatment CT-5", category: "Water Treatment", unit: "gal", baseDemand: 620, seasonalAmplitude: 0.35, seasonalPeakMonth: 7 },
  { code: "WT-820", name: "Wastewater Polymer", category: "Water Treatment", unit: "lb", baseDemand: 1800, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "AT-900", name: "Paint Wash", category: "Automotive", unit: "gal", baseDemand: 380, seasonalAmplitude: 0.25, seasonalPeakMonth: 5 },
  { code: "AT-910", name: "Wheel Cleaner", category: "Automotive", unit: "gal", baseDemand: 260, seasonalAmplitude: 0.35, seasonalPeakMonth: 6 },
  { code: "AT-920", name: "Windshield Fluid Concentrate", category: "Automotive", unit: "gal", baseDemand: 540, seasonalAmplitude: 0.6, seasonalPeakMonth: 1 },
  { code: "FL-950", name: "Kerosene K-1", category: "Fuels", unit: "gal", baseDemand: 700, seasonalAmplitude: 0.5, seasonalPeakMonth: 1 },
  { code: "FL-960", name: "Diesel Additive DA-3", category: "Fuels", unit: "gal", baseDemand: 320, seasonalAmplitude: 0.2, seasonalPeakMonth: 12 },
  { code: "SP-970", name: "Aircraft Hydraulic Fluid", category: "Specialty", unit: "gal", baseDemand: 140, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
  { code: "SP-980", name: "Electronics Cleaner EC-1", category: "Specialty", unit: "gal", baseDemand: 90, seasonalAmplitude: 0, seasonalPeakMonth: 1 },
];

// ---------- main ----------
async function seed() {
  console.log("Clearing existing data (cascades through FK)…");
  // FK CASCADE on customers/sites/skus will wipe dependent rows
  for (const table of ["customers", "sites", "skus"] as const) {
    const { error } = await supabase
      .from(table)
      .delete()
      .gte("created_at", "1900-01-01");
    if (error) throw new Error(`delete ${table}: ${error.message}`);
  }

  console.log(`Inserting ${CUSTOMERS.length} customers…`);
  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .insert(CUSTOMERS)
    .select();
  if (custErr || !customers) throw custErr ?? new Error("customers insert failed");

  console.log(`Inserting ${SITES.length} sites…`);
  const sitesPayload = SITES.map((s) => ({
    name: `Chemico Site — ${s.city}`,
    city: s.city,
    state: s.state,
    region: s.region,
    lat: s.lat,
    lng: s.lng,
  }));
  const { data: sites, error: sitesErr } = await supabase
    .from("sites")
    .insert(sitesPayload)
    .select();
  if (sitesErr || !sites) throw sitesErr ?? new Error("sites insert failed");

  console.log(`Inserting ${SKUS.length} SKUs…`);
  const skusPayload = SKUS.map(
    ({ baseDemand, seasonalAmplitude, seasonalPeakMonth, ...rest }) => rest,
  );
  const { data: skus, error: skusErr } = await supabase
    .from("skus")
    .insert(skusPayload)
    .select();
  if (skusErr || !skus) throw skusErr ?? new Error("skus insert failed");

  const skuByCode = new Map(skus.map((s) => [s.code, s]));

  // ---- assignments ----
  type Assignment = {
    customer_id: string;
    site_id: string;
    sku_id: string;
    spec: SkuSpec;
  };
  const assignments: Assignment[] = [];
  for (const customer of customers) {
    const skuCount = intRange(8, 14);
    const siteCount = intRange(3, 6);
    const chosenSkus = shuffle([...SKUS]).slice(0, skuCount);
    const chosenSites = shuffle([...sites]).slice(0, siteCount);
    for (const spec of chosenSkus) {
      const sku = skuByCode.get(spec.code)!;
      for (const site of chosenSites) {
        if (rng() < 0.7) {
          assignments.push({
            customer_id: customer.id,
            site_id: site.id,
            sku_id: sku.id,
            spec,
          });
        }
      }
    }
  }
  console.log(`Inserting ${assignments.length} customer_site_skus…`);
  const cssRows = assignments.map((a) => ({
    customer_id: a.customer_id,
    site_id: a.site_id,
    sku_id: a.sku_id,
  }));
  for (const batch of chunk(cssRows, 1000)) {
    const { error } = await supabase.from("customer_site_skus").insert(batch);
    if (error) throw new Error(`customer_site_skus: ${error.message}`);
  }

  // ---- forecasts (24 months of history) ----
  const today = new Date();
  const firstOfThisMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  const periodStarts: string[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(firstOfThisMonth);
    d.setUTCMonth(d.getUTCMonth() - i);
    periodStarts.push(d.toISOString().slice(0, 10));
  }

  type ForecastRow = {
    customer_id: string;
    site_id: string;
    sku_id: string;
    period_start: string;
    forecast_qty: number;
    actual_qty: number | null;
    lower_bound: number;
    upper_bound: number;
    anomaly_flag: boolean;
  };
  const forecasts: ForecastRow[] = [];

  for (const a of assignments) {
    const siteScale = range(0.7, 1.3); // per-assignment magnitude
    for (let m = 0; m < 24; m++) {
      const period = periodStarts[m];
      const monthOfYear =
        new Date(period + "T00:00:00Z").getUTCMonth() + 1; // 1-12
      const trendFactor = 1 + (m / 23) * 0.08; // +8% drift over 24 months
      const phase =
        ((monthOfYear - a.spec.seasonalPeakMonth) / 12) * 2 * Math.PI;
      const seasonalFactor = 1 + a.spec.seasonalAmplitude * Math.cos(phase);
      const forecast_qty = Math.max(
        1,
        Math.round(
          a.spec.baseDemand * trendFactor * seasonalFactor * siteScale,
        ),
      );
      const lower_bound = Math.round(forecast_qty * 0.85);
      const upper_bound = Math.round(forecast_qty * 1.15);

      let actual_qty: number = Math.round(
        forecast_qty * (1 + range(-0.08, 0.08)),
      );
      const isAnomaly = rng() < 0.03;
      if (isAnomaly) {
        actual_qty =
          rng() < 0.5
            ? Math.round(upper_bound * range(1.15, 1.45))
            : Math.round(lower_bound * range(0.45, 0.82));
      }

      forecasts.push({
        customer_id: a.customer_id,
        site_id: a.site_id,
        sku_id: a.sku_id,
        period_start: period,
        forecast_qty,
        actual_qty,
        lower_bound,
        upper_bound,
        anomaly_flag: isAnomaly,
      });
    }
  }

  console.log(
    `Inserting ${forecasts.length} forecasts in batches of 1000…`,
  );
  for (const [i, batch] of chunk(forecasts, 1000).entries()) {
    const { error } = await supabase.from("forecasts").insert(batch);
    if (error) throw new Error(`forecasts batch ${i}: ${error.message}`);
  }

  // ---- recommendations from the latest period per assignment ----
  const latestByKey = new Map<string, ForecastRow>();
  for (const f of forecasts) {
    const key = `${f.customer_id}|${f.site_id}|${f.sku_id}`;
    const cur = latestByKey.get(key);
    if (!cur || cur.period_start < f.period_start) latestByKey.set(key, f);
  }

  type RecRow = {
    customer_id: string;
    site_id: string;
    sku_id: string;
    current_stock: number;
    reorder_point: number;
    projected_stockout_date: string | null;
    status: "healthy" | "nearing" | "risk";
  };
  const recommendations: RecRow[] = [];

  for (const a of assignments) {
    const key = `${a.customer_id}|${a.site_id}|${a.sku_id}`;
    const latest = latestByKey.get(key);
    if (!latest) continue;
    const reorder_point = Math.max(1, Math.round(latest.forecast_qty * 1.5));

    const bucket = rng();
    let current_stock: number;
    let status: RecRow["status"];
    let projected_stockout_date: string | null = null;

    if (bucket < 0.6) {
      current_stock = Math.round(reorder_point * range(1.2, 2.0));
      status = "healthy";
    } else if (bucket < 0.85) {
      current_stock = Math.round(reorder_point * range(0.7, 1.0));
      status = "nearing";
      const days = intRange(14, 30);
      const d = new Date();
      d.setDate(d.getDate() + days);
      projected_stockout_date = d.toISOString().slice(0, 10);
    } else {
      current_stock = Math.round(reorder_point * range(0.1, 0.5));
      status = "risk";
      const days = intRange(1, 13);
      const d = new Date();
      d.setDate(d.getDate() + days);
      projected_stockout_date = d.toISOString().slice(0, 10);
    }

    recommendations.push({
      customer_id: a.customer_id,
      site_id: a.site_id,
      sku_id: a.sku_id,
      current_stock,
      reorder_point,
      projected_stockout_date,
      status,
    });
  }

  console.log(`Inserting ${recommendations.length} recommendations…`);
  for (const batch of chunk(recommendations, 1000)) {
    const { error } = await supabase.from("recommendations").insert(batch);
    if (error) throw new Error(`recommendations: ${error.message}`);
  }

  console.log(
    `\n✓ Seed complete — ${customers.length} customers · ${sites.length} sites · ${skus.length} SKUs · ${assignments.length} assignments · ${forecasts.length} forecasts · ${recommendations.length} recommendations`,
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
