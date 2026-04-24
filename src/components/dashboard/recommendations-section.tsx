import { getRecommendations } from "@/lib/queries/recommendations";
import { getFilterOptions } from "@/lib/queries/filter-options";
import {
  listSuppliers,
  getPoDashboardCounts,
} from "@/lib/queries/purchase-orders";
import {
  getSdsStatusRecord,
  getSdsCounts,
} from "@/lib/queries/sds";
import { RecommendationsTable } from "./recommendations-table";

export async function RecommendationsSection() {
  const [rows, filterOptions, suppliers, poCounts, sdsStatus, sdsCounts] =
    await Promise.all([
      getRecommendations(),
      getFilterOptions(),
      listSuppliers(),
      getPoDashboardCounts(),
      getSdsStatusRecord(),
      getSdsCounts(),
    ]);
  return (
    <RecommendationsTable
      rows={rows}
      filterOptions={filterOptions}
      suppliers={suppliers}
      poCounts={poCounts}
      sdsStatusBySku={sdsStatus}
      sdsCounts={sdsCounts}
    />
  );
}
