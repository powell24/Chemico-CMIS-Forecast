import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KpiRow, KpiRowSkeleton } from "@/components/dashboard/kpi-row";
import { ForecastSection } from "@/components/dashboard/forecast-section";
import { RecommendationsSection } from "@/components/dashboard/recommendations-section";
import {
  ForecastSectionSkeleton,
  RecommendationsSectionSkeleton,
} from "@/components/dashboard/section-skeletons";
import { SectionErrorBoundary } from "@/components/dashboard/section-error-boundary";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      <SectionErrorBoundary label="the dashboard">
        <Suspense
          fallback={
            <div className="space-y-6">
              <KpiRowSkeleton />
              <ForecastSectionSkeleton />
              <RecommendationsSectionSkeleton />
            </div>
          }
        >
          <DashboardBody />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}

async function DashboardBody() {
  // Kick off all three fetches in parallel, but only flush to the client once
  // all three are ready so the dashboard lands as one unit.
  const [kpis, forecast, recs] = await Promise.all([
    KpiRow(),
    ForecastSection(),
    RecommendationsSection(),
  ]);
  return (
    <div className="space-y-6">
      {kpis}
      {forecast}
      {recs}
    </div>
  );
}
