import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";

export type PoStatus = "draft" | "sent" | "received" | "cancelled";
export type PoEventKind = "created" | "sent" | "received" | "cancelled" | "note";

export type PoSummary = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  siteId: string;
  siteName: string;
  siteCity: string;
  siteState: string;
  status: PoStatus;
  subtotal: number;
  lineCount: number;
  createdAt: string;
  expectedDelivery: string | null;
};

export type PoLine = {
  id: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  skuUnit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PoEvent = {
  id: string;
  event: PoEventKind;
  actorEmail: string | null;
  note: string | null;
  occurredAt: string;
};

export type PoDetail = {
  id: string;
  poNumber: string;
  status: PoStatus;
  subtotal: number;
  notes: string | null;
  createdAt: string;
  sentAt: string | null;
  receivedAt: string | null;
  expectedDelivery: string | null;
  supplier: {
    id: string;
    name: string;
    contactEmail: string | null;
    leadTimeDays: number;
    paymentTerms: string;
  };
  site: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  lines: PoLine[];
  events: PoEvent[];
};

export type SupplierOption = {
  id: string;
  name: string;
  contactEmail: string | null;
  leadTimeDays: number;
  paymentTerms: string;
};

export type PoDashboardCounts = {
  draft: number;
  sentThisWeek: number;
  receivedThisMonth: number;
};

export async function listPurchaseOrders(filters: {
  status?: PoStatus;
  siteId?: string;
  supplierId?: string;
} = {}): Promise<PoSummary[]> {
  const key = `pos:list:${filters.status ?? "all"}:${filters.siteId ?? "all"}:${filters.supplierId ?? "all"}:v1`;
  return withCache(key, 60, () => fetchPurchaseOrders(filters));
}

async function fetchPurchaseOrders(filters: {
  status?: PoStatus;
  siteId?: string;
  supplierId?: string;
}): Promise<PoSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("purchase_orders")
    .select(
      `
      id,
      po_number,
      supplier_id,
      site_id,
      status,
      subtotal,
      created_at,
      expected_delivery,
      suppliers:supplier_id ( name ),
      sites:site_id ( name, city, state ),
      purchase_order_lines ( id )
    `,
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.siteId) query = query.eq("site_id", filters.siteId);
  if (filters.supplierId) query = query.eq("supplier_id", filters.supplierId);

  const { data, error } = await query;
  if (error) throw error;

  type JoinedRow = {
    id: string;
    po_number: string;
    supplier_id: string;
    site_id: string;
    status: PoStatus;
    subtotal: number;
    created_at: string;
    expected_delivery: string | null;
    suppliers: { name: string } | null;
    sites: { name: string; city: string; state: string } | null;
    purchase_order_lines: { id: string }[] | null;
  };

  const rows = (data ?? []) as unknown as JoinedRow[];

  return rows.map((r) => ({
    id: r.id,
    poNumber: r.po_number,
    supplierId: r.supplier_id,
    supplierName: r.suppliers?.name ?? "—",
    siteId: r.site_id,
    siteName: r.sites?.name ?? "—",
    siteCity: r.sites?.city ?? "",
    siteState: r.sites?.state ?? "",
    status: r.status,
    subtotal: Number(r.subtotal),
    lineCount: r.purchase_order_lines?.length ?? 0,
    createdAt: r.created_at,
    expectedDelivery: r.expected_delivery,
  }));
}

export async function getPurchaseOrder(id: string): Promise<PoDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      `
      id,
      po_number,
      status,
      subtotal,
      notes,
      created_at,
      sent_at,
      received_at,
      expected_delivery,
      supplier:supplier_id ( id, name, contact_email, lead_time_days, payment_terms ),
      site:site_id ( id, name, city, state ),
      purchase_order_lines (
        id,
        quantity,
        unit_price,
        line_total,
        sku:sku_id ( id, code, name, unit )
      ),
      purchase_order_events (
        id,
        event,
        actor_email,
        note,
        occurred_at
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type Joined = {
    id: string;
    po_number: string;
    status: PoStatus;
    subtotal: number;
    notes: string | null;
    created_at: string;
    sent_at: string | null;
    received_at: string | null;
    expected_delivery: string | null;
    supplier: {
      id: string;
      name: string;
      contact_email: string | null;
      lead_time_days: number;
      payment_terms: string;
    } | null;
    site: {
      id: string;
      name: string;
      city: string;
      state: string;
    } | null;
    purchase_order_lines:
      | {
          id: string;
          quantity: number;
          unit_price: number;
          line_total: number | null;
          sku: { id: string; code: string; name: string; unit: string } | null;
        }[]
      | null;
    purchase_order_events:
      | {
          id: string;
          event: PoEventKind;
          actor_email: string | null;
          note: string | null;
          occurred_at: string;
        }[]
      | null;
  };

  const row = data as unknown as Joined;

  return {
    id: row.id,
    poNumber: row.po_number,
    status: row.status,
    subtotal: Number(row.subtotal),
    notes: row.notes,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    receivedAt: row.received_at,
    expectedDelivery: row.expected_delivery,
    supplier: {
      id: row.supplier?.id ?? "",
      name: row.supplier?.name ?? "—",
      contactEmail: row.supplier?.contact_email ?? null,
      leadTimeDays: row.supplier?.lead_time_days ?? 14,
      paymentTerms: row.supplier?.payment_terms ?? "Net 30",
    },
    site: {
      id: row.site?.id ?? "",
      name: row.site?.name ?? "—",
      city: row.site?.city ?? "",
      state: row.site?.state ?? "",
    },
    lines: (row.purchase_order_lines ?? []).map((l) => ({
      id: l.id,
      skuId: l.sku?.id ?? "",
      skuCode: l.sku?.code ?? "—",
      skuName: l.sku?.name ?? "—",
      skuUnit: l.sku?.unit ?? "",
      quantity: Number(l.quantity),
      unitPrice: Number(l.unit_price),
      lineTotal: Number(l.line_total ?? Number(l.quantity) * Number(l.unit_price)),
    })),
    events: (row.purchase_order_events ?? [])
      .map((e) => ({
        id: e.id,
        event: e.event,
        actorEmail: e.actor_email,
        note: e.note,
        occurredAt: e.occurred_at,
      }))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
  };
}

export async function listSuppliers(): Promise<SupplierOption[]> {
  return withCache("suppliers:v1", 600, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, contact_email, lead_time_days, payment_terms")
      .order("name");
    if (error) throw error;
    return (data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      contactEmail: s.contact_email,
      leadTimeDays: s.lead_time_days,
      paymentTerms: s.payment_terms,
    }));
  });
}

export async function getSupplierForSku(
  skuId: string,
): Promise<SupplierOption | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skus")
    .select(
      "default_supplier_id, supplier:default_supplier_id ( id, name, contact_email, lead_time_days, payment_terms )",
    )
    .eq("id", skuId)
    .maybeSingle();
  if (error) throw error;
  const joined = data as unknown as
    | {
        supplier: {
          id: string;
          name: string;
          contact_email: string | null;
          lead_time_days: number;
          payment_terms: string;
        } | null;
      }
    | null;
  const s = joined?.supplier;
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    contactEmail: s.contact_email,
    leadTimeDays: s.lead_time_days,
    paymentTerms: s.payment_terms,
  };
}

export async function getPoDashboardCounts(): Promise<PoDashboardCounts> {
  return withCache("pos:dashboard-counts:v1", 60, async () => {
    const supabase = await createClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const [draftRes, sentRes, receivedRes] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft"),
      supabase
        .from("purchase_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", sevenDaysAgo),
      supabase
        .from("purchase_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "received")
        .gte("received_at", thirtyDaysAgo),
    ]);

    return {
      draft: draftRes.count ?? 0,
      sentThisWeek: sentRes.count ?? 0,
      receivedThisMonth: receivedRes.count ?? 0,
    };
  });
}
