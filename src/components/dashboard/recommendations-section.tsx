import { getRecommendations } from "@/lib/queries/recommendations";
import { getFilterOptions } from "@/lib/queries/filter-options";
import {
  listSuppliers,
  getPoDashboardCounts,
} from "@/lib/queries/purchase-orders";
import { RecommendationsTable } from "./recommendations-table";

export async function RecommendationsSection() {
  const [rows, filterOptions, suppliers, poCounts] = await Promise.all([
    getRecommendations(),
    getFilterOptions(),
    listSuppliers(),
    getPoDashboardCounts(),
  ]);
  return (
    <RecommendationsTable
      rows={rows}
      filterOptions={filterOptions}
      suppliers={suppliers}
      poCounts={poCounts}
    />
  );
}
