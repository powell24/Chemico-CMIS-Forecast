import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KpiRow, KpiRowSkeleton } from "@/components/dashboard/kpi-row";
import { ForecastSection } from "@/components/dashboard/forecast-section";
import { RecommendationsSection } from "@/components/dashboard/recommendations-section";
import {
  ForecastSectionSkeleton,
  RecommendationsSectionSkeleton,
} from "@/components/dashboard/section-skeletons";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      <Suspense fallback={<KpiRowSkeleton />}>
        <KpiRow />
      </Suspense>
      <Suspense fallback={<ForecastSectionSkeleton />}>
        <ForecastSection />
      </Suspense>
      <Suspense fallback={<RecommendationsSectionSkeleton />}>
        <RecommendationsSection />
      </Suspense>
    </div>
  );
}
