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
      <SectionErrorBoundary label="KPIs">
        <Suspense fallback={<KpiRowSkeleton />}>
          <KpiRow />
        </Suspense>
      </SectionErrorBoundary>
      <SectionErrorBoundary label="the forecast chart">
        <Suspense fallback={<ForecastSectionSkeleton />}>
          <ForecastSection />
        </Suspense>
      </SectionErrorBoundary>
      <SectionErrorBoundary label="reorder recommendations">
        <Suspense fallback={<RecommendationsSectionSkeleton />}>
          <RecommendationsSection />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}
