import {
  listPurchaseOrders,
  listSuppliers,
  type PoStatus,
} from "@/lib/queries/purchase-orders";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { PurchaseOrdersTable } from "@/components/orders/purchase-orders-table";
import { SectionErrorBoundary } from "@/components/dashboard/section-error-boundary";

const VALID_STATUSES: PoStatus[] = ["draft", "sent", "received", "cancelled"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    supplier?: string;
    site?: string;
  }>;
}) {
  const params = await searchParams;
  const statusParam = VALID_STATUSES.includes(params.status as PoStatus)
    ? (params.status as PoStatus)
    : undefined;
  const supplierId =
    params.supplier && params.supplier !== "__all__" ? params.supplier : undefined;
  const siteId =
    params.site && params.site !== "__all__" ? params.site : undefined;

  const [pos, suppliers, filterOptions] = await Promise.all([
    listPurchaseOrders(),
    listSuppliers(),
    getFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Purchase Orders
        </h1>
        <p className="text-sm text-muted-foreground">
          Create, send, and track reorders from forecast to delivery.
        </p>
      </header>
      <SectionErrorBoundary label="purchase orders">
        <PurchaseOrdersTable
          pos={pos}
          suppliers={suppliers}
          sites={filterOptions.sites}
          initialStatus={statusParam ?? "__all__"}
          initialSupplier={supplierId ?? "__all__"}
          initialSite={siteId ?? "__all__"}
        />
      </SectionErrorBoundary>
    </div>
  );
}
