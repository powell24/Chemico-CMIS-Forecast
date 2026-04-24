import { notFound } from "next/navigation";
import { getSkuByCode } from "@/lib/queries/skus";
import { getSdsForSku } from "@/lib/queries/sds";
import { SkuDetailView } from "@/components/skus/sku-detail-view";
import { SectionErrorBoundary } from "@/components/dashboard/section-error-boundary";

export default async function SkuDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);

  const sku = await getSkuByCode(decoded);
  if (!sku) notFound();

  const sds = await getSdsForSku(sku.id);

  return (
    <SectionErrorBoundary label="this SKU">
      <SkuDetailView sku={sku} sds={sds} />
    </SectionErrorBoundary>
  );
}
