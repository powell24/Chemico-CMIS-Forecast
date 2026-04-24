"use client";

import { Download } from "lucide-react";
import {
  Document,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { formatMoney, formatNumber } from "@/lib/format";
import type { PoDetail } from "@/lib/queries/purchase-orders";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#111",
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
  poNum: {
    fontSize: 14,
    fontWeight: 700,
  },
  poMeta: {
    fontSize: 9,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
  },
  addressRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 20,
  },
  addressBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 10,
  },
  addressLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  addressName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 9,
    color: "#333",
    marginBottom: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colSku: { flex: 3, fontSize: 9 },
  colQty: { flex: 1.2, fontSize: 9, textAlign: "right" },
  colPrice: { flex: 1.2, fontSize: 9, textAlign: "right" },
  colTotal: { flex: 1.4, fontSize: 9, textAlign: "right" },
  colHeader: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#666",
  },
  skuCode: { fontSize: 9, fontWeight: 700 },
  skuName: { fontSize: 8, color: "#666", marginTop: 1 },
  totalsBlock: {
    alignSelf: "flex-end",
    width: 200,
    marginBottom: 20,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#111",
    marginTop: 4,
  },
  totalsLabel: { fontSize: 9, color: "#333" },
  totalsValue: { fontSize: 10, fontWeight: 700 },
  notes: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderStyle: "dashed",
    padding: 10,
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notesText: { fontSize: 9, color: "#333" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#888",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
  },
});

function PoDocument({ po }: { po: PoDetail }) {
  const createdDate = new Date(po.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const expected = po.expectedDelivery
    ? new Date(po.expectedDelivery).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CHEMICO</Text>
            <Text style={styles.brandSub}>Purchase Order</Text>
          </View>
          <View>
            <Text style={styles.poNum}>{po.poNumber}</Text>
            <Text style={styles.poMeta}>Issued: {createdDate}</Text>
            <Text style={styles.poMeta}>Expected: {expected}</Text>
            <Text style={styles.poMeta}>
              Terms: {po.supplier.paymentTerms}
            </Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Supplier</Text>
            <Text style={styles.addressName}>{po.supplier.name}</Text>
            {po.supplier.contactEmail ? (
              <Text style={styles.addressLine}>{po.supplier.contactEmail}</Text>
            ) : null}
            <Text style={styles.addressLine}>
              Lead time: {po.supplier.leadTimeDays} days
            </Text>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Ship to</Text>
            <Text style={styles.addressName}>{po.site.name}</Text>
            <Text style={styles.addressLine}>
              {po.site.city}, {po.site.state}
            </Text>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Bill to</Text>
            <Text style={styles.addressName}>The Chemico Group</Text>
            <Text style={styles.addressLine}>AP Department</Text>
            <Text style={styles.addressLine}>ap@chemicogroup.com</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colSku}>
              <Text style={styles.colHeader}>SKU</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.colHeader}>Quantity</Text>
            </View>
            <View style={styles.colPrice}>
              <Text style={styles.colHeader}>Unit price</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.colHeader}>Line total</Text>
            </View>
          </View>
          {po.lines.map((l, i) => (
            <View
              key={l.id}
              style={
                i === po.lines.length - 1 ? styles.tableRowLast : styles.tableRow
              }
            >
              <View style={styles.colSku}>
                <Text style={styles.skuCode}>{l.skuCode}</Text>
                <Text style={styles.skuName}>{l.skuName}</Text>
              </View>
              <View style={styles.colQty}>
                <Text>
                  {formatNumber(l.quantity)} {l.skuUnit}
                </Text>
              </View>
              <View style={styles.colPrice}>
                <Text>{formatMoney(l.unitPrice)}</Text>
              </View>
              <View style={styles.colTotal}>
                <Text>{formatMoney(l.lineTotal)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatMoney(po.subtotal)}</Text>
          </View>
          <View style={styles.totalsRowGrand}>
            <Text style={styles.totalsLabel}>Total due</Text>
            <Text style={styles.totalsValue}>{formatMoney(po.subtotal)}</Text>
          </View>
        </View>

        {po.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{po.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Generated by CMIS Forecast · Chemico Mockup · Not a legally binding
          purchase order.
        </Text>
      </Page>
    </Document>
  );
}

export function PoPdfDownload({ po }: { po: PoDetail }) {
  return (
    <PDFDownloadLink
      document={<PoDocument po={po} />}
      fileName={`${po.poNumber}.pdf`}
    >
      {({ loading }) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={loading}
          asChild={false}
        >
          <Download className="size-3.5" />
          {loading ? "Preparing…" : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
