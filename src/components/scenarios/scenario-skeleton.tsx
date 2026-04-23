import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ScenarioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2 space-y-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="pt-0">
                  <Skeleton className="h-7 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
