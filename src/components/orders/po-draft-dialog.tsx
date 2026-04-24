"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatNumber } from "@/lib/format";
import type { SupplierOption } from "@/lib/queries/purchase-orders";
import {
  draftPoFromRecommendationAction,
  savePoDraftAction,
  type PoDraft,
} from "@/app/(app)/orders/actions";

export function PoDraftDialog({
  open,
  onOpenChange,
  recommendationId,
  suppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendationId: string | null;
  suppliers: SupplierOption[];
}) {
  const [draft, setDraft] = useState<PoDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [supplierId, setSupplierId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !recommendationId) return;
    let cancelled = false;
    setLoading(true);
    setDraft(null);
    draftPoFromRecommendationAction(recommendationId)
      .then((d) => {
        if (cancelled) return;
        setDraft(d);
        if (d) {
          setSupplierId(d.supplierId ?? suppliers[0]?.id ?? "");
          setQuantity(String(d.suggestedQuantity));
          setUnitPrice(String(d.unitPrice));
          setNotes("");
        }
      })
      .catch((err) => {
        console.error("Failed to load PO draft:", err);
        toast.error("Couldn't load the draft — please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, recommendationId, suppliers]);

  const subtotal = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(unitPrice) || 0;
    return q * p;
  }, [quantity, unitPrice]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const validQty = parseFloat(quantity) > 0;
  const validPrice = parseFloat(unitPrice) > 0;
  const canSubmit = !!draft && !!supplierId && validQty && validPrice && !pending;

  function handleSubmit(sendImmediately: boolean) {
    if (!draft || !canSubmit) return;
    startTransition(async () => {
      try {
        const res = await savePoDraftAction({
          recommendationId: draft.recommendationId,
          siteId: draft.siteId,
          skuId: draft.skuId,
          supplierId,
          quantity: parseFloat(quantity),
          unitPrice: parseFloat(unitPrice),
          notes: notes.trim(),
          sendImmediately,
        });
        toast.success(
          sendImmediately
            ? `${res.poNumber} sent to ${selectedSupplier?.name ?? "supplier"} (simulated)`
            : `${res.poNumber} saved as draft`,
          {
            action: {
              label: "View",
              onClick: () => {
                window.location.href = `/orders/${res.id}`;
              },
            },
          },
        );
        onOpenChange(false);
      } catch (err) {
        console.error("Save PO failed:", err);
        toast.error("Couldn't save the PO — please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create purchase order</DialogTitle>
          <DialogDescription>
            Auto-filled from the reorder recommendation. Review and send.
          </DialogDescription>
        </DialogHeader>

        {loading || !draft ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {draft.skuCode} · {draft.skuName}
                  </p>
                  <p className="text-muted-foreground">
                    {draft.siteName} — {draft.siteCity}, {draft.siteState}
                  </p>
                </div>
                <div className="text-right text-muted-foreground">
                  <p>Stock {formatNumber(draft.currentStock)}</p>
                  <p>Reorder @ {formatNumber(draft.reorderPoint)}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Suggested qty rounded up to supplier pack size of{" "}
                {draft.packSize} {draft.skuUnit}.
              </p>
            </div>

            {!draft.supplierId && (
              <div className="flex items-start gap-2 rounded-md border border-chart-3/40 bg-chart-3/10 p-2 text-[11px] text-chart-3">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  No default supplier on file for this SKU — pick one below.
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="po-supplier">Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="po-supplier">
                    <SelectValue placeholder="Choose a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.leadTimeDays}d lead
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="po-qty">Quantity ({draft.skuUnit})</Label>
                <Input
                  id="po-qty"
                  type="number"
                  min={1}
                  step={draft.packSize}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="po-price">Unit price (USD)</Label>
                <Input
                  id="po-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="tabular-nums"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="po-notes">Notes (optional)</Label>
                <Textarea
                  id="po-notes"
                  placeholder="Expedited per forecast alert…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(subtotal)}
              </span>
            </div>

            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">
                Demo mode
              </Badge>
              <span>
                Sending simulates email to{" "}
                {selectedSupplier?.contactEmail ?? "the supplier"} — no real
                mail is dispatched.
              </span>
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={!canSubmit}
          >
            {pending ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : null}
            Save as draft
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={!canSubmit}>
            {pending ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : null}
            Save &amp; send
          </Button>
        </DialogFooter>

        {draft && (
          <p className="text-center text-[10px] text-muted-foreground">
            After saving, open in{" "}
            <Link
              href="/orders"
              className="underline hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Orders
            </Link>
            .
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
