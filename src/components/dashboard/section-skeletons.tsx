import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ForecastSectionSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full" />
      </CardContent>
    </Card>
  );
}

export function RecommendationsSectionSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-3">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-72" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[420px] w-full" />
      </CardContent>
    </Card>
  );
}
