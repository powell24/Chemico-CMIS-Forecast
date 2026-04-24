"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  PackageCheck,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber } from "@/lib/format";
import type {
  PoDetail,
  PoEventKind,
  PoStatus,
} from "@/lib/queries/purchase-orders";
import {
  cancelPoAction,
  receivePoAction,
  sendPoAction,
} from "@/app/(app)/orders/actions";
const PoPdfDownload = dynamic(
  () => import("./po-pdf-download").then((m) => m.PoPdfDownload),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" size="sm" disabled className="gap-1">
        <Download className="size-3.5" />
        Download PDF
      </Button>
    ),
  },
);

const STATUS_LABEL: Record<PoStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  received: "Received",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<PoStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  received: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  cancelled: "bg-chart-5/10 text-chart-5 border-chart-5/30",
};

const EVENT_LABEL: Record<PoEventKind, string> = {
  created: "Draft created",
  sent: "Sent to supplier",
  received: "Received at site",
  cancelled: "Cancelled",
  note: "Note added",
};

export function PurchaseOrderDetail({ po }: { po: PoDetail }) {
  const [pending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] =
    useState<null | "send" | "receive" | "cancel">(null);

  function runAction(action: "send" | "receive" | "cancel") {
    startTransition(async () => {
      try {
        if (action === "send") {
          await sendPoAction(po.id);
          toast.success(
            `${po.poNumber} sent to ${po.supplier.name} (simulated)`,
          );
        } else if (action === "receive") {
          await receivePoAction(po.id);
          toast.success(`${po.poNumber} received — inventory updated`);
        } else {
          await cancelPoAction(po.id);
          toast.success(`${po.poNumber} cancelled`);
        }
      } catch (err) {
        console.error(`${action} PO failed:`, err);
        toast.error("Something went wrong — please try again.");
      } finally {
        setConfirmAction(null);
      }
    });
  }

  const confirmCopy = {
    send: {
      title: `Send ${po.poNumber}?`,
      body: `This simulates sending the PO to ${po.supplier.contactEmail ?? po.supplier.name}. In demo mode, no email is dispatched.`,
      cta: "Send",
    },
    receive: {
      title: `Mark ${po.poNumber} as received?`,
      body: "Inventory at the destination site will be incremented and the originating reorder recommendation will be cleared.",
      cta: "Mark received",
    },
    cancel: {
      title: `Cancel ${po.poNumber}?`,
      body: "This cannot be undone. The PO will stay on file for audit history.",
      cta: "Cancel PO",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
            <Link href="/orders">
              <ArrowLeft className="size-3.5" />
              All orders
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {po.poNumber}
            </h1>
            <Badge
              variant="outline"
              className={cn("text-xs", STATUS_CLASS[po.status])}
            >
              {STATUS_LABEL[po.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {po.supplier.name} → {po.site.name}, {po.site.city} {po.site.state}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PoPdfDownload po={po} />
          {po.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction("cancel")}
                disabled={pending}
                className="gap-1"
              >
                <X className="size-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmAction("send")}
                disabled={pending}
                className="gap-1"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Send to supplier
              </Button>
            </>
          )}
          {po.status === "sent" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction("cancel")}
                disabled={pending}
                className="gap-1"
              >
                <X className="size-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmAction("receive")}
                disabled={pending}
                className="gap-1"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <PackageCheck className="size-3.5" />
                )}
                Mark received
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="px-6">
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-right text-xs">
                          Quantity
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Unit price
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Line total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {l.skuCode}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {l.skuName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(l.quantity)} {l.skuUnit}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(l.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(l.lineTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="text-right text-xs font-medium">
                          Subtotal
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatMoney(po.subtotal)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
              {po.notes && (
                <div className="mx-6 mt-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Notes: </span>
                  {po.notes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supplier &amp; shipping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Supplier
                  </p>
                  <p className="mt-1 font-medium">{po.supplier.name}</p>
                  {po.supplier.contactEmail && (
                    <p className="text-xs text-muted-foreground">
                      {po.supplier.contactEmail}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Lead time: {po.supplier.leadTimeDays} days ·{" "}
                    {po.supplier.paymentTerms}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Ship to
                  </p>
                  <p className="mt-1 font-medium">{po.site.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {po.site.city}, {po.site.state}
                  </p>
                  {po.expectedDelivery && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expected:{" "}
                      {new Date(po.expectedDelivery).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Status timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative ml-2 space-y-4 border-l pl-6">
              {po.events.map((e, i) => {
                const isLast = i === po.events.length - 1;
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[27px] flex size-4 items-center justify-center rounded-full bg-card ring-2",
                        isLast ? "ring-primary" : "ring-border",
                      )}
                      aria-hidden
                    >
                      {isLast ? (
                        <CheckCircle2 className="size-3 text-primary" />
                      ) : (
                        <Circle className="size-2 fill-muted-foreground text-muted-foreground" />
                      )}
                    </span>
                    <p className="text-sm font-medium">{EVENT_LABEL[e.event]}</p>
                    {e.note && (
                      <p className="text-xs text-muted-foreground">{e.note}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(e.occurredAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {e.actorEmail ? ` · ${e.actorEmail}` : ""}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          {confirmAction && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirmCopy[confirmAction].title}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmCopy[confirmAction].body}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    runAction(confirmAction);
                  }}
                  disabled={pending}
                  className={cn(
                    confirmAction === "cancel" &&
                      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  )}
                >
                  {pending ? (
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                  ) : null}
                  {confirmCopy[confirmAction].cta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
