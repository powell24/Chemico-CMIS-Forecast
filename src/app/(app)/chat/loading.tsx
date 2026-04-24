import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100svh-3rem)] w-full gap-4">
      <div className="flex w-72 shrink-0 flex-col gap-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        <Skeleton className="h-10 w-1/2" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="ml-auto h-16 w-1/2" />
          <Skeleton className="h-24 w-3/4" />
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
