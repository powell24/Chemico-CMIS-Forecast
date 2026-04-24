import { notFound } from "next/navigation";
import { getPurchaseOrder } from "@/lib/queries/purchase-orders";
import { PurchaseOrderDetail } from "@/components/orders/purchase-order-detail";
import { SectionErrorBoundary } from "@/components/dashboard/section-error-boundary";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getPurchaseOrder(id);
  if (!po) notFound();

  return (
    <SectionErrorBoundary label="this purchase order">
      <PurchaseOrderDetail po={po} />
    </SectionErrorBoundary>
  );
}
