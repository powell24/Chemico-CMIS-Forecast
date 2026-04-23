"use server";

import {
  getForecastSeries,
  type ForecastArgs,
  type ForecastSeries,
} from "@/lib/queries/forecast";

export async function getForecastSeriesAction(
  args: ForecastArgs,
): Promise<ForecastSeries> {
  return getForecastSeries(args);
}
