import { getForecastSeries } from "@/lib/queries/forecast";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { ForecastChart } from "./forecast-chart";

export async function ForecastSection() {
  const [initial, filterOptions] = await Promise.all([
    getForecastSeries({
      dimension: "all",
      mode: "timeline",
      horizon: "12mo",
      filter: null,
    }),
    getFilterOptions(),
  ]);

  return <ForecastChart initial={initial} filterOptions={filterOptions} />;
}
