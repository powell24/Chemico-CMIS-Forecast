import { getKpis } from "@/lib/queries/kpis";
import { KpiTile } from "./kpi-tile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatPct } from "@/lib/format";

export async function KpiRow() {
  const kpis = await getKpis();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiTile
        hero
        label="Forecast Accuracy"
        value={formatPct(kpis.forecastAccuracy.value)}
        delta={kpis.forecastAccuracy.delta}
        deltaUnit="pp"
        spark={kpis.forecastAccuracy.spark}
        accent="accent"
        tooltip="Unit-weighted forecast accuracy across all assigned SKUs. A 5pp lift here is what unlocks the working capital, stockout, and freight wins below."
      />
      <KpiTile
        label="Working Capital Freed"
        value={formatMoney(kpis.workingCapitalFreed.value)}
        delta={kpis.workingCapitalFreed.delta}
        spark={kpis.workingCapitalFreed.spark}
        accent="primary"
        tooltip="Excess inventory (forecast > actual) valued at blended unit price × 12% annual carrying cost — what a tighter forecast releases to the balance sheet."
      />
      <KpiTile
        label="Stockout Risk"
        value={formatMoney(kpis.stockoutRisk.value)}
        delta={-kpis.stockoutRisk.delta}
        spark={kpis.stockoutRisk.spark}
        accent="destructive"
        tooltip="Under-forecasted demand (actual > forecast) × penalty per missing unit — estimated production-continuity exposure for this period."
      />
      <KpiTile
        label="Expedited Freight"
        value={formatMoney(kpis.expeditedFreight.value)}
        delta={-kpis.expeditedFreight.delta}
        spark={kpis.expeditedFreight.spark}
        accent="chart-2"
        tooltip="Anomaly-flagged rows × expedited freight surcharge. What reactive shipping is costing when a forecast miss forces same-day freight."
      />
    </div>
  );
}

export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-28" />
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4 pt-0">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
