import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SkusLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-72" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-[180px]" />
              <Skeleton className="h-9 w-[160px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="px-6">
            <Skeleton className="h-[420px] w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
