import { getRecommendations } from "@/lib/queries/recommendations";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { RecommendationsTable } from "./recommendations-table";

export async function RecommendationsSection() {
  const [rows, filterOptions] = await Promise.all([
    getRecommendations(),
    getFilterOptions(),
  ]);
  return <RecommendationsTable rows={rows} filterOptions={filterOptions} />;
}
