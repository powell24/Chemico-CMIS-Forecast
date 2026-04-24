import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/redis";

export type SdsSignalWord = "danger" | "warning" | "none";
export type SdsExpirationStatus = "expired" | "expiring" | "valid";

export type SdsDocument = {
  id: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  skuCategory: string;
  revision: string;
  issuedAt: string;
  expiresAt: string;
  status: SdsExpirationStatus;
  daysUntilExpiry: number;
  signalWord: SdsSignalWord;
  pictograms: string[];
  hazardCodes: string[];
  ppe: string[];
  disposalNotes: string | null;
  firstAidNotes: string | null;
};

export type SdsCounts = {
  expired: number;
  expiring: number;
  valid: number;
  total: number;
};

const MS_PER_DAY = 24 * 3600 * 1000;

function computeStatus(expiresAt: string): {
  status: SdsExpirationStatus;
  daysUntilExpiry: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const days = Math.floor(diffMs / MS_PER_DAY);
  if (days < 0) return { status: "expired", daysUntilExpiry: days };
  if (days <= 30) return { status: "expiring", daysUntilExpiry: days };
  return { status: "valid", daysUntilExpiry: days };
}

export async function getSdsForSku(
  skuId: string,
): Promise<SdsDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sds_documents")
    .select(
      `
      id,
      sku_id,
      revision,
      issued_at,
      expires_at,
      skus:sku_id ( code, name, category ),
      sds_extracted (
        signal_word,
        pictograms,
        hazard_codes,
        ppe,
        disposal_notes,
        first_aid_notes
      )
    `,
    )
    .eq("sku_id", skuId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type Joined = {
    id: string;
    sku_id: string;
    revision: string;
    issued_at: string;
    expires_at: string;
    skus: { code: string; name: string; category: string } | null;
    sds_extracted:
      | {
          signal_word: SdsSignalWord;
          pictograms: string[] | null;
          hazard_codes: string[] | null;
          ppe: string[] | null;
          disposal_notes: string | null;
          first_aid_notes: string | null;
        }[]
      | null;
  };

  const row = data as unknown as Joined;
  const ex = row.sds_extracted?.[0];
  const { status, daysUntilExpiry } = computeStatus(row.expires_at);

  return {
    id: row.id,
    skuId: row.sku_id,
    skuCode: row.skus?.code ?? "—",
    skuName: row.skus?.name ?? "—",
    skuCategory: row.skus?.category ?? "—",
    revision: row.revision,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    status,
    daysUntilExpiry,
    signalWord: ex?.signal_word ?? "warning",
    pictograms: ex?.pictograms ?? [],
    hazardCodes: ex?.hazard_codes ?? [],
    ppe: ex?.ppe ?? [],
    disposalNotes: ex?.disposal_notes ?? null,
    firstAidNotes: ex?.first_aid_notes ?? null,
  };
}

export async function listSdsStatusBySku(): Promise<
  Map<string, SdsExpirationStatus>
> {
  return withCache("sds:status-by-sku:v1", 300, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sds_documents")
      .select("sku_id, expires_at");
    if (error) throw error;
    const map = new Map<string, SdsExpirationStatus>();
    for (const r of data ?? []) {
      const { status } = computeStatus(r.expires_at as string);
      // If multiple SDS per SKU, keep the "worst" status (expired > expiring > valid)
      const prev = map.get(r.sku_id as string);
      const rank = (s: SdsExpirationStatus) =>
        s === "expired" ? 2 : s === "expiring" ? 1 : 0;
      if (!prev || rank(status) > rank(prev)) {
        map.set(r.sku_id as string, status);
      }
    }
    return map;
  });
}

// withCache can't serialize Maps directly; keep a JSON-friendly variant too.
export async function getSdsStatusRecord(): Promise<
  Record<string, SdsExpirationStatus>
> {
  return withCache("sds:status-record:v1", 300, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sds_documents")
      .select("sku_id, expires_at");
    if (error) throw error;
    const rec: Record<string, SdsExpirationStatus> = {};
    for (const r of data ?? []) {
      const { status } = computeStatus(r.expires_at as string);
      const prev = rec[r.sku_id as string];
      const rank = (s: SdsExpirationStatus) =>
        s === "expired" ? 2 : s === "expiring" ? 1 : 0;
      if (!prev || rank(status) > rank(prev)) {
        rec[r.sku_id as string] = status;
      }
    }
    return rec;
  });
}

export async function getSdsCounts(): Promise<SdsCounts> {
  return withCache("sds:counts:v1", 300, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sds_documents")
      .select("expires_at");
    if (error) throw error;
    const counts: SdsCounts = {
      expired: 0,
      expiring: 0,
      valid: 0,
      total: 0,
    };
    for (const r of data ?? []) {
      const { status } = computeStatus(r.expires_at as string);
      counts[status] += 1;
      counts.total += 1;
    }
    return counts;
  });
}

export type ExpiringSdsRow = {
  skuId: string;
  skuCode: string;
  skuName: string;
  category: string;
  expiresAt: string;
  daysUntilExpiry: number;
  status: SdsExpirationStatus;
  signalWord: SdsSignalWord;
};

export async function listExpiringSds(
  withinDays = 30,
): Promise<ExpiringSdsRow[]> {
  const supabase = await createClient();
  const horizon = new Date(Date.now() + withinDays * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("sds_documents")
    .select(
      `
      sku_id,
      expires_at,
      skus:sku_id ( code, name, category ),
      sds_extracted ( signal_word )
    `,
    )
    .lte("expires_at", horizon)
    .order("expires_at", { ascending: true });

  if (error) throw error;

  type Joined = {
    sku_id: string;
    expires_at: string;
    skus: { code: string; name: string; category: string } | null;
    sds_extracted: { signal_word: SdsSignalWord }[] | null;
  };

  const rows = (data ?? []) as unknown as Joined[];

  return rows.map((r) => {
    const { status, daysUntilExpiry } = computeStatus(r.expires_at);
    return {
      skuId: r.sku_id,
      skuCode: r.skus?.code ?? "—",
      skuName: r.skus?.name ?? "—",
      category: r.skus?.category ?? "—",
      expiresAt: r.expires_at,
      daysUntilExpiry,
      status,
      signalWord: r.sds_extracted?.[0]?.signal_word ?? "warning",
    };
  });
}
