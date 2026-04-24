import { listSkus } from "@/lib/queries/skus";
import { getSdsStatusRecord } from "@/lib/queries/sds";
import { SkusTable } from "@/components/skus/skus-table";
import { SectionErrorBoundary } from "@/components/dashboard/section-error-boundary";

export default async function SkusPage({
  searchParams,
}: {
  searchParams: Promise<{ sds?: string; category?: string }>;
}) {
  const params = await searchParams;
  const [skus, sdsStatus] = await Promise.all([
    listSkus(),
    getSdsStatusRecord(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-sm text-muted-foreground">
          All SKUs, open reorder risk, and Safety Data Sheet status.
        </p>
      </header>
      <SectionErrorBoundary label="the catalog">
        <SkusTable
          skus={skus}
          sdsStatusBySku={sdsStatus}
          initialSds={params.sds ?? "__all__"}
          initialCategory={params.category ?? "__all__"}
        />
      </SectionErrorBoundary>
    </div>
  );
}
