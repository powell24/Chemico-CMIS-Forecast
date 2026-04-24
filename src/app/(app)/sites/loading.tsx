import { Skeleton } from "@/components/ui/skeleton";

export default function SitesLoading() {
  return (
    <div className="flex h-[calc(100svh-3rem)] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-[160px]" />
        </div>
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden">
        <Skeleton className="flex-1 rounded-lg" />
        <Skeleton className="w-80 rounded-lg" />
      </div>
    </div>
  );
}
