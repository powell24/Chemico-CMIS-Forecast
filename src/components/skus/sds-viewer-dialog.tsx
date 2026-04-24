"use client";

import { Copy, Download, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { SdsDocument } from "@/lib/queries/sds";

const SIGNAL_CLASS = {
  danger: "bg-chart-5 text-white",
  warning: "bg-chart-3 text-chart-3-foreground",
  none: "bg-muted text-muted-foreground",
};

const STATUS_TEXT = {
  valid: "text-chart-4",
  expiring: "text-chart-3",
  expired: "text-chart-5",
};

const PICTOGRAM_MEANING: Record<string, string> = {
  flame: "Flammable",
  exclamation: "Health hazard / irritant",
  health: "Serious health hazard",
  corrosion: "Corrosive",
  environment: "Environmental hazard",
  skull: "Acute toxicity",
  explosive: "Explosive",
  gas: "Gas under pressure",
  oxidizer: "Oxidizer",
};

const H_STATEMENTS: Record<string, string> = {
  H226: "Flammable liquid and vapour",
  H304: "May be fatal if swallowed and enters airways",
  H314: "Causes severe skin burns and eye damage",
  H315: "Causes skin irritation",
  H318: "Causes serious eye damage",
  H319: "Causes serious eye irritation",
  H336: "May cause drowsiness or dizziness",
};

export function SdsViewerDialog({
  open,
  onOpenChange,
  sds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sds: SdsDocument;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copy(label: string, text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedField(label);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => setCopiedField(null), 2000);
      })
      .catch(() => {
        toast.error("Couldn't copy to clipboard");
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4" />
                Safety Data Sheet · {sds.skuCode}
              </DialogTitle>
              <DialogDescription>
                {sds.skuName} · {sds.skuCategory}
              </DialogDescription>
            </div>
            <Badge
              variant="secondary"
              className={cn("text-[10px]", SIGNAL_CLASS[sds.signalWord])}
            >
              {sds.signalWord.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 text-sm">
            <section className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={cn("font-medium", STATUS_TEXT[sds.status])}>
                    {sds.status === "expired"
                      ? `Expired ${Math.abs(sds.daysUntilExpiry)} days ago`
                      : sds.status === "expiring"
                        ? `Expires in ${sds.daysUntilExpiry} ${sds.daysUntilExpiry === 1 ? "day" : "days"}`
                        : `Valid · expires in ${sds.daysUntilExpiry} days`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sds.revision} · Issued{" "}
                    {new Date(sds.issuedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · Expires{" "}
                    {new Date(sds.expiresAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1.5"
                  title="Demo mode: PDF not included"
                >
                  <Download className="size-3.5" />
                  Source PDF (demo)
                </Button>
              </div>
            </section>

            {sds.pictograms.length > 0 && (
              <section>
                <SectionHeading label="Pictograms" />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sds.pictograms.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="capitalize text-xs"
                      title={PICTOGRAM_MEANING[p] ?? p}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {sds.hazardCodes.length > 0 && (
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading label="Hazard statements" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px]"
                    onClick={() =>
                      copy(
                        "Hazards",
                        sds.hazardCodes
                          .map(
                            (h) =>
                              `${h}${H_STATEMENTS[h] ? " – " + H_STATEMENTS[h] : ""}`,
                          )
                          .join("\n"),
                      )
                    }
                  >
                    <Copy className="size-3" />
                    {copiedField === "Hazards" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {sds.hazardCodes.map((h) => (
                    <li key={h} className="text-sm">
                      <span className="font-mono font-medium">{h}</span>
                      {H_STATEMENTS[h] ? (
                        <span className="text-muted-foreground">
                          {" "}
                          — {H_STATEMENTS[h]}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {sds.ppe.length > 0 && (
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading label="Required PPE" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px]"
                    onClick={() => copy("PPE", sds.ppe.join(", "))}
                  >
                    <Copy className="size-3" />
                    {copiedField === "PPE" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sds.ppe.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {sds.firstAidNotes && (
              <>
                <Separator />
                <section>
                  <div className="flex items-center justify-between">
                    <SectionHeading label="First-aid" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[11px]"
                      onClick={() => copy("First-aid", sds.firstAidNotes ?? "")}
                    >
                      <Copy className="size-3" />
                      {copiedField === "First-aid" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {sds.firstAidNotes}
                  </p>
                </section>
              </>
            )}

            {sds.disposalNotes && (
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading label="Disposal" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px]"
                    onClick={() => copy("Disposal", sds.disposalNotes ?? "")}
                  >
                    <Copy className="size-3" />
                    {copiedField === "Disposal" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {sds.disposalNotes}
                </p>
              </section>
            )}
          </div>
        </ScrollArea>

        <p className="border-t pt-2 text-center text-[10px] text-muted-foreground">
          Demo mode · SDS data seeded for mockup purposes. In production, this
          dialog would embed the manufacturer PDF from Supabase Storage.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
  );
}
