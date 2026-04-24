"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redis } from "@/lib/redis";

const UNIT_PRICE = 14.5;

export type PoDraft = {
  recommendationId: string;
  siteId: string;
  siteName: string;
  siteCity: string;
  siteState: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  skuUnit: string;
  packSize: number;
  currentStock: number;
  reorderPoint: number;
  supplierId: string | null;
  supplierName: string | null;
  supplierLeadTimeDays: number | null;
  suggestedQuantity: number;
  unitPrice: number;
  expectedDelivery: string | null;
};

export async function draftPoFromRecommendationAction(
  recId: string,
): Promise<PoDraft | null> {
  const supabase = await createClient();

  type Joined = {
    id: string;
    current_stock: number;
    reorder_point: number;
    site_id: string;
    sku_id: string;
    sites: { name: string; city: string; state: string } | null;
    skus: {
      code: string;
      name: string;
      unit: string;
      pack_size: number;
      default_supplier_id: string | null;
      suppliers:
        | { id: string; name: string; lead_time_days: number }
        | null;
    } | null;
  };

  const { data, error } = await supabase
    .from("recommendations")
    .select(
      `
      id,
      current_stock,
      reorder_point,
      site_id,
      sku_id,
      sites:site_id ( name, city, state ),
      skus:sku_id (
        code, name, unit, pack_size, default_supplier_id,
        suppliers:default_supplier_id ( id, name, lead_time_days )
      )
    `,
    )
    .eq("id", recId)
    .maybeSingle();

  if (error) throw error;
  const row = data as unknown as Joined | null;
  if (!row) return null;

  const packSize = row.skus?.pack_size ?? 50;
  const currentStock = Number(row.current_stock);
  const reorderPoint = Number(row.reorder_point);

  const rawTarget = Math.max(reorderPoint * 2 - currentStock, packSize);
  const suggestedQuantity = Math.ceil(rawTarget / packSize) * packSize;

  const supplier = row.skus?.suppliers ?? null;
  const leadDays = supplier?.lead_time_days ?? null;
  const expectedDelivery =
    leadDays != null
      ? new Date(Date.now() + leadDays * 24 * 3600 * 1000)
          .toISOString()
          .slice(0, 10)
      : null;

  return {
    recommendationId: row.id,
    siteId: row.site_id,
    siteName: row.sites?.name ?? "—",
    siteCity: row.sites?.city ?? "",
    siteState: row.sites?.state ?? "",
    skuId: row.sku_id,
    skuCode: row.skus?.code ?? "—",
    skuName: row.skus?.name ?? "—",
    skuUnit: row.skus?.unit ?? "",
    packSize,
    currentStock,
    reorderPoint,
    supplierId: supplier?.id ?? null,
    supplierName: supplier?.name ?? null,
    supplierLeadTimeDays: leadDays,
    suggestedQuantity,
    unitPrice: UNIT_PRICE,
    expectedDelivery,
  };
}

async function nextPoNumber(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("po_number")
    .order("po_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.po_number as string | undefined;
  const m = last?.match(/PO-(\d+)/);
  const n = m ? parseInt(m[1], 10) + 1 : 1001;
  return `PO-${String(n).padStart(5, "0")}`;
}

async function invalidatePoCaches() {
  try {
    // Invalidate known list cache variants + dashboard counts.
    // Keys follow pos:list:<status>:<site>:<supplier>:v1 pattern.
    const keys = await redis.keys("pos:list:*");
    if (keys.length > 0) await redis.del(...keys);
    await redis.del("pos:dashboard-counts:v1");
  } catch {
    // Cache miss during invalidation is non-fatal.
  }
}

export type SavePoInput = {
  recommendationId: string;
  siteId: string;
  skuId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  notes: string;
  sendImmediately: boolean;
};

export async function savePoDraftAction(input: SavePoInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const poNumber = await nextPoNumber(supabase);

  const { data: supplier, error: supErr } = await supabase
    .from("suppliers")
    .select("lead_time_days")
    .eq("id", input.supplierId)
    .maybeSingle();
  if (supErr) throw supErr;

  const leadDays = supplier?.lead_time_days ?? 14;
  const expectedDelivery = new Date(Date.now() + leadDays * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const status: "draft" | "sent" = input.sendImmediately ? "sent" : "draft";
  const now = new Date().toISOString();

  const subtotal = Number(input.quantity) * Number(input.unitPrice);

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      po_number: poNumber,
      supplier_id: input.supplierId,
      site_id: input.siteId,
      status,
      subtotal,
      notes: input.notes || null,
      expected_delivery: expectedDelivery,
      created_by: user?.id ?? null,
      sent_at: status === "sent" ? now : null,
    })
    .select("id")
    .single();
  if (poErr) throw poErr;

  const { error: lineErr } = await supabase.from("purchase_order_lines").insert({
    po_id: po.id,
    sku_id: input.skuId,
    quantity: input.quantity,
    unit_price: input.unitPrice,
  });
  if (lineErr) throw lineErr;

  const events: {
    po_id: string;
    event: "created" | "sent";
    actor_email: string | null;
    note: string | null;
  }[] = [
    {
      po_id: po.id,
      event: "created",
      actor_email: user?.email ?? null,
      note: null,
    },
  ];
  if (status === "sent") {
    events.push({
      po_id: po.id,
      event: "sent",
      actor_email: user?.email ?? null,
      note: "Sent to supplier (simulated).",
    });
  }
  const { error: evtErr } = await supabase
    .from("purchase_order_events")
    .insert(events);
  if (evtErr) throw evtErr;

  await invalidatePoCaches();
  revalidatePath("/orders");
  revalidatePath("/");

  return { id: po.id, poNumber, status };
}

export async function sendPoAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const now = new Date().toISOString();

  const { error: upErr } = await supabase
    .from("purchase_orders")
    .update({ status: "sent", sent_at: now })
    .eq("id", id)
    .eq("status", "draft");
  if (upErr) throw upErr;

  await supabase.from("purchase_order_events").insert({
    po_id: id,
    event: "sent",
    actor_email: user?.email ?? null,
    note: "Sent to supplier (simulated).",
  });

  await invalidatePoCaches();
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/");
}

export async function receivePoAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const now = new Date().toISOString();

  type LineRow = {
    sku_id: string;
    quantity: number;
  };

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select("site_id, purchase_order_lines ( sku_id, quantity )")
    .eq("id", id)
    .maybeSingle();
  if (poErr) throw poErr;
  const joined = po as unknown as {
    site_id: string;
    purchase_order_lines: LineRow[] | null;
  } | null;
  if (!joined) throw new Error("PO not found");

  const { error: upErr } = await supabase
    .from("purchase_orders")
    .update({ status: "received", received_at: now })
    .eq("id", id)
    .eq("status", "sent");
  if (upErr) throw upErr;

  for (const line of joined.purchase_order_lines ?? []) {
    const { data: recs, error: recErr } = await supabase
      .from("recommendations")
      .select("id, current_stock")
      .eq("site_id", joined.site_id)
      .eq("sku_id", line.sku_id);
    if (recErr) throw recErr;
    for (const r of recs ?? []) {
      const newStock = Number(r.current_stock) + Number(line.quantity);
      await supabase
        .from("recommendations")
        .update({
          current_stock: newStock,
          status: "healthy",
          projected_stockout_date: null,
        })
        .eq("id", r.id);
    }
  }

  await supabase.from("purchase_order_events").insert({
    po_id: id,
    event: "received",
    actor_email: user?.email ?? null,
    note: "Received and logged into inventory.",
  });

  try {
    await redis.del("recs:v1", "kpis:v1");
  } catch {
    // non-fatal
  }
  await invalidatePoCaches();
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/");
}

export async function cancelPoAction(id: string, note?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: upErr } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["draft", "sent"]);
  if (upErr) throw upErr;

  await supabase.from("purchase_order_events").insert({
    po_id: id,
    event: "cancelled",
    actor_email: user?.email ?? null,
    note: note || "Cancelled.",
  });

  await invalidatePoCaches();
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
}
