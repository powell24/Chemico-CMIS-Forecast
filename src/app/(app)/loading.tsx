import { KpiRowSkeleton } from "@/components/dashboard/kpi-row";
import {
  ForecastSectionSkeleton,
  RecommendationsSectionSkeleton,
} from "@/components/dashboard/section-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <KpiRowSkeleton />
      <ForecastSectionSkeleton />
      <RecommendationsSectionSkeleton />
    </div>
  );
}
