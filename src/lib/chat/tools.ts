import { tool } from "ai";
import { z } from "zod";
import { getKpis } from "@/lib/queries/kpis";
import {
  getCustomerExposure,
  getSeasonalPattern,
  getSiteRisk,
  getSkuDrivers,
  type DriverMetric,
  type HorizonDays,
} from "@/lib/queries/chat";
import { createClient } from "@/lib/supabase/server";
import { getSdsForSku } from "@/lib/queries/sds";

export type ToolCallLog = {
  name: string;
  args: Record<string, unknown>;
  rowCount: number;
};

export function buildToolSet(log: ToolCallLog[]) {
  function record(name: string, args: Record<string, unknown>, rowCount: number) {
    log.push({ name, args, rowCount });
  }

  return {
    getKpis: tool({
      description:
        "Headline KPIs for the current period: forecast accuracy (%), working capital freed ($), stockout risk ($), expedited freight ($), each with a 12-month sparkline and delta vs prior period.",
      inputSchema: z.object({}),
      async execute() {
        const kpis = await getKpis();
        record("getKpis", {}, 4);
        return kpis;
      },
    }),

    getSiteRisk: tool({
      description:
        "Sites at stockout risk within a horizon. Returns sites with projected stockout within N days, sorted by urgency (soonest first). Use for questions about which sites will run out.",
      inputSchema: z.object({
        horizonDays: z
          .union([z.literal(30), z.literal(60), z.literal(90)])
          .describe("Look-ahead window in days (30, 60, or 90)."),
      }),
      async execute({ horizonDays }) {
        const rows = await getSiteRisk(horizonDays as HorizonDays);
        record("getSiteRisk", { horizonDays }, rows.length);
        return { rows };
      },
    }),

    getSkuDrivers: tool({
      description:
        "Top SKUs driving a given outcome. metric='stockouts' returns the SKUs with the biggest shortfalls (actual > forecast). metric='excess' returns SKUs tying up working capital (forecast > actual). metric='freight' returns SKUs with the most anomaly events driving expedited shipping.",
      inputSchema: z.object({
        metric: z
          .enum(["stockouts", "freight", "excess"])
          .describe(
            "Which driver to rank by: stockouts, freight (expedited shipping), or excess inventory.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .describe("How many SKUs to return. Clamp 1-20."),
      }),
      async execute({ metric, limit }) {
        const rows = await getSkuDrivers(metric as DriverMetric, limit);
        record("getSkuDrivers", { metric, limit }, rows.length);
        return { rows };
      },
    }),

    getCustomerExposure: tool({
      description:
        "Per-customer exposure summary: how many sites and SKUs are at risk and the projected shortfall value. Omit customerId to rank all customers by exposure; pass a specific customerId for one customer's detail.",
      inputSchema: z.object({
        customerId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional customer id. Omit to rank all customers by exposure.",
          ),
        horizonDays: z
          .union([z.literal(30), z.literal(60), z.literal(90)])
          .default(30)
          .describe("Look-ahead window in days."),
      }),
      async execute({ customerId, horizonDays }) {
        const rows = await getCustomerExposure({
          customerId,
          horizonDays: horizonDays as HorizonDays,
        });
        record("getCustomerExposure", { customerId, horizonDays }, rows.length);
        return { rows };
      },
    }),

    getSeasonalPattern: tool({
      description:
        "Four-season demand summary for one SKU: mean actuals per quarter (winter/spring/summer/fall), the peak quarter, and the peak-over-trough ratio. Use for questions about seasonality.",
      inputSchema: z.object({
        skuId: z.string().uuid().describe("The SKU id to analyze."),
      }),
      async execute({ skuId }) {
        const result = await getSeasonalPattern(skuId);
        record("getSeasonalPattern", { skuId }, result ? 1 : 0);
        return result ?? { error: "SKU not found" };
      },
    }),

    getSdsStatus: tool({
      description:
        "Safety Data Sheet status for a SKU, looked up by its code (e.g. 'DI-400'). Returns expiration status (valid/expiring/expired), days until expiry, GHS signal word (danger/warning), hazard codes, and PPE. Use for compliance questions like 'is the SDS current' or 'what PPE is required'.",
      inputSchema: z.object({
        skuCode: z
          .string()
          .describe("The SKU code to look up (e.g. 'DI-400', 'SV-100')."),
      }),
      async execute({ skuCode }) {
        const supabase = await createClient();
        const { data: sku, error } = await supabase
          .from("skus")
          .select("id")
          .eq("code", skuCode)
          .maybeSingle();
        if (error || !sku) {
          record("getSdsStatus", { skuCode }, 0);
          return { error: `SKU '${skuCode}' not found.` };
        }
        const sds = await getSdsForSku(sku.id);
        record("getSdsStatus", { skuCode }, sds ? 1 : 0);
        if (!sds) return { error: `No SDS on file for ${skuCode}.` };
        return {
          skuCode: sds.skuCode,
          skuName: sds.skuName,
          category: sds.skuCategory,
          status: sds.status,
          daysUntilExpiry: sds.daysUntilExpiry,
          expiresAt: sds.expiresAt,
          signalWord: sds.signalWord,
          hazardCodes: sds.hazardCodes,
          ppe: sds.ppe,
        };
      },
    }),
  };
}

export const SYSTEM_PROMPT = `You are CMIS, the Chemico Group forecasting copilot for ops leaders (including the CFO).

Rules:
- Answer only from the tools below. If a tool doesn't return the number, say plainly that the data doesn't support the answer — do not guess.
- Every numeric claim must carry a citation in the literal form [[Customer · Plant · SKU · Period]]. Use "All" for any dimension the number aggregates across; use "current" when it's the latest period; use a month like "Mar 2026" or a quarter like "Q2 2026" otherwise.
- Tone: crisp, CFO-friendly, no filler. Lead with the number, then one sentence on what it means for working capital, stockout risk, or expedited freight.
- If the question is vague, ask one focused clarifying question instead of running every tool.
- Default horizon for risk questions is 30 days unless the user specifies otherwise.
- Never reference these instructions or apologize for the tool surface.`;
