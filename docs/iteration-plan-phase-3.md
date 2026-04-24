# CMIS Forecast — Iteration Plan, Phase 3

Extension to `docs/iteration-plan.md` and `docs/iteration-plan-phase-2.md`. Phase 3 closes the demo loop: after the dashboard surfaces the problem, chat explains it, scenarios quantify it, and sites locates it — **PO Workflow** lets the user act on it, and **SDS Integration** keeps the action safe and compliant.

Ground rules unchanged — shadcn/ui only, no custom primitives, RSC + server actions, `pnpm tsc --noEmit` before every push, one step at a time.

Ship Iteration 8 (PO Workflow) first; it plugs directly into the dashboard's reorder table. Iteration 9 (SDS) layers on top once the SKU detail surface exists.

---

## Iteration 8 — PO Workflow

**Goal:** from any open reorder recommendation on the dashboard, the user clicks **Create PO**, reviews an auto-filled draft (supplier, quantities, dates), and advances it through `draft → sent → received`. The "sent" action is simulated (no live SMTP) but produces a downloadable PDF and a status timeline.

### Steps

**A. Schema + seed**

1. Supabase migration via MCP: new tables
   - `suppliers` (id, name, contact_email, lead_time_days, payment_terms)
   - `purchase_orders` (id, po_number, supplier_id, site_id, status enum `draft|sent|received|cancelled`, subtotal, created_by, created_at, sent_at, received_at)
   - `purchase_order_lines` (id, po_id, sku_id, quantity, unit_price, line_total)
   - `purchase_order_events` (id, po_id, event enum `created|sent|received|cancelled|note`, actor_email, note, occurred_at)
2. Enable RLS on all four tables; policies: authenticated users can read/write rows where `created_by = auth.uid()` or where the site is in the same org (mockup-level, not production-grade).
3. Extend `scripts/seed.ts` — insert one supplier (**DuBois Chemicals**) plus 2–3 alternates with realistic lead times (7, 14, 21 days). Pre-seed ~20 historical POs across a mix of statuses so the `/orders` index isn't empty on first load.
4. `pnpm dlx supabase gen types typescript` — regenerate `src/lib/supabase/types.ts`.

**B. Query layer**

5. Create `src/lib/queries/purchase-orders.ts`:
   - `listPurchaseOrders({ status?, siteId?, supplierId? })` → paginated list for `/orders`
   - `getPurchaseOrder(id)` → full PO + lines + events + supplier + site
   - `getSupplierForSku(skuId)` → default supplier for a SKU (first match; mockup-simple)
   Wrap in `withCache` with 60s TTL except `getPurchaseOrder` which stays uncached (status changes need to be immediately visible).

**C. Draft from recommendation**

6. Install shadcn primitives: `pnpm dlx shadcn@latest add dialog form`.
7. Add a **Create PO** action (three-dot menu or row button) to each row in `src/components/dashboard/recommendations-table.tsx`. Opens a Dialog with the draft preview.
8. Build `src/components/orders/po-draft-dialog.tsx` — client component. On open, server action `draftPoFromRecommendation(recId)` computes:
   - Supplier: default for the SKU
   - Quantity: `reorderPoint * 2 - currentStock` rounded up to supplier's pack size (seed a `pack_size` column on `skus` or hard-code 50)
   - Unit price: reuse `UNIT_PRICE` from `src/lib/queries/kpis.ts`
   - Expected delivery: `today + supplier.lead_time_days`
9. Dialog body renders an editable form (react-hook-form + zod): supplier select, quantity, unit price, notes. Footer: **Cancel**, **Save as draft**, **Save & send**.
10. Server actions `savePoDraft(input)` and `sendPo(id)` persist the row, append a `purchase_order_events` entry, and revalidate `/orders`.

**D. `/orders` index**

11. New route `src/app/(app)/orders/page.tsx` — server component fetching `listPurchaseOrders` with search-param filters. Renders `<PurchaseOrdersTable data={…} />`.
12. `src/components/orders/purchase-orders-table.tsx` — shadcn Table, columns: PO number, supplier, site, status badge, subtotal, created date, expected delivery. Filters: status, supplier, date range. Row click → `/orders/[id]`.
13. Sidebar nav entry **Orders** (lucide `FileText`), active on `pathname.startsWith("/orders")`.

**E. `/orders/[id]` detail**

14. Route `src/app/(app)/orders/[id]/page.tsx`. Layout:
    - Header: PO number, status badge, supplier name, site, total
    - Line items table (read-only once sent)
    - Status timeline (vertical, built from `purchase_order_events`) — created → sent → received, with actor email + relative timestamps
    - Action buttons per status: draft shows **Send**, sent shows **Mark received** + **Cancel**, received/cancelled show nothing
15. `sendPo` action flips status to `sent`, records `sent_at`, inserts event. `receivePo` flips to `received` + decrements site stock counters in the recommendation/inventory tables so the dashboard reflects the fill.
16. **Send PO** is simulated — show a toast "PO-0042 sent to orders@duboischem.com (simulated)" via sonner. No SMTP call. A small "Demo mode" helper line in the dialog keeps it honest.

**F. PDF export**

17. Install: `pnpm add @react-pdf/renderer`.
18. Build `src/components/orders/po-pdf.tsx` — `<Document>` with Chemico header, PO number, supplier block, bill-to (Chemico HQ), ship-to (site), line items, subtotal, notes, footer. Keep styling minimal and printable.
19. Add **Download PDF** button on the detail page. Renders client-side via `@react-pdf/renderer`'s `PDFDownloadLink` to avoid server bundling overhead.

**G. Polish**

20. Dashboard KPI: add a small inline stat on the recommendations card — "**3 POs in draft · 5 sent this week**" — linking to `/orders?status=draft`.
21. Empty states: `/orders` when no POs match filter; dialog when the recommendation has no supplier mapping.
22. Loading states: Suspense + skeletons for the index and detail pages.
23. Error boundary per page section.
24. `pnpm tsc --noEmit`; smoke-test the full path (dashboard row → Create PO → Save & send → detail page → Mark received → dashboard KPI updates); push to GitHub.

### Acceptance

- A recommendations-table row has a **Create PO** action that opens an auto-filled draft dialog.
- Saving a draft creates a row visible at `/orders` with status `draft`.
- **Send** flips status, shows a toast, records an event, and disables line editing.
- **Mark received** decrements stock so the originating recommendation resolves on the dashboard.
- `/orders/[id]` shows a complete status timeline with actor + timestamps.
- PDF export downloads a formatted one-page PO.
- Sidebar nav entry is active on `/orders`.
- `pnpm tsc --noEmit` passes.

---

## Iteration 9 — SDS Integration

**Goal:** every SKU has a linked Safety Data Sheet. Users can open it in a modal, see extracted hazards + expiration, and the dashboard surfaces **expiring / expired SDS** as a first-class risk signal alongside stockout risk.

Scope is deliberately tight: **no `/compliance` page** — SDS lives inline on SKU detail (a new surface added here) plus one dashboard-level expiration alert. That keeps the nav at 5 items.

### Steps

**A. Schema + storage**

1. Create a `sds-documents` Supabase Storage bucket (private, signed URLs only).
2. Migration via MCP:
   - `sds_documents` (id, sku_id FK, revision, issued_at, expires_at, storage_path, sha256, created_at)
   - `sds_extracted` (id, sds_id FK, hazard_codes text[], signal_word `danger|warning|null`, pictograms text[], ppe text[], disposal_notes text, first_aid_notes text)
3. RLS: authenticated read on both; writes locked to service role (mockup — real app would use an ingestion pipeline).
4. Drop **10 sample SDS PDFs** into `docs/sds-samples/` covering 2 per category (solvents, coolants, deicers, lubricants, cleaners). Any public manufacturer SDS is fine for mockup purposes.
5. Extend `scripts/seed.ts` to upload each PDF to storage and insert `sds_documents` + `sds_extracted` rows with hand-curated data: correct GHS hazard codes (H226 flammable, H315 skin irritation, etc.), realistic expiration dates (mix of valid / expiring-in-7-days / expired), pictograms by code.

**B. Query layer**

6. `src/lib/queries/sds.ts`:
   - `getSdsForSku(skuId)` → latest SDS + extracted fields + signed URL (15-min expiry)
   - `listExpiringSds({ withinDays = 30 })` → SDS rows where `expires_at` is in the window or already past, joined with SKU for display
   Wrap `listExpiringSds` in `withCache` 300s; `getSdsForSku` uncached (signed URL must be fresh).

**C. SKU detail surface**

7. New route `src/app/(app)/skus/[code]/page.tsx` — server component fetching SKU + forecast + open recommendations + SDS. (This is also the drill-down target other pages will eventually link to.)
8. Link SKU codes throughout the app (recommendations table, site detail's top-SKUs, chat citations) to `/skus/[code]`.
9. Layout: header (SKU code, name, category, unit), three cards
   - Forecast mini-chart (next 12 months, reuse existing forecast chart primitives)
   - Open recommendations list
   - **Safety (SDS)** card — signal word badge, pictogram row, hazard chips, expiration with colored status, **View full SDS** button

**D. SDS viewer**

10. `src/components/sds/sds-viewer-dialog.tsx` — shadcn Dialog, full-height on desktop. Embeds the PDF via `<iframe src={signedUrl}>` with a download fallback link underneath for browsers that block iframed PDFs.
11. Left sidebar inside the dialog lists the **extracted fields**: signal word, pictograms (visual + label tooltips), hazard codes with plain-English descriptions (maintain a small static map `H226 → Flammable liquid and vapour`), PPE list, disposal + first-aid notes.
12. Copy-button on each extracted field so plant managers can paste into incident reports.

**E. Dashboard alert**

13. Add a fifth KPI-adjacent banner or tile: **SDS Attention** — "3 SDS expire within 7 days · 1 expired". Click-through to `/skus?filter=sds-expiring`.
14. New query `src/lib/queries/recommendations.ts` gains a `sdsStatus` column join: each reorder row shows a small ⚠ icon if its SKU's SDS is expired or within 7 days, with tooltip "SDS expires 2026-05-01 — verify before ordering."
15. Small filter on the recommendations table: **SDS status** (all / valid / expiring / expired).

**F. SKU list page**

16. `src/app/(app)/skus/page.tsx` — lightweight index so the dashboard click-through has a target. Columns: code, name, category, next expected order, SDS status. Filters: category, SDS status. Row click → `/skus/[code]`.
17. Sidebar nav entry **Catalog** (lucide `FlaskConical`) pointing to `/skus`. Active on `pathname.startsWith("/skus")`. This brings nav to 6 entries — acceptable because `/skus` is the target for many cross-links.

**G. Polish**

18. Expiration colors match dashboard convention: `chart-4` valid (>30d), `chart-3` expiring (≤30d), `chart-5` expired.
19. Pictograms rendered as SVGs bundled in `public/sds-pictograms/` — standard GHS set (flame, exclamation, health hazard, corrosion, environment, skull, explosive, gas cylinder, oxidizer). Keep one set, reference by code.
20. Loading state for the PDF iframe (Skeleton overlay until `onLoad`).
21. Error boundary: if the signed URL fetch fails, render "SDS is temporarily unavailable — contact EHS" rather than a broken iframe.
22. Ask CMIS (`/chat`): add a 6th tool `getSdsStatus({ skuCode })` returning expiration + hazard summary so the assistant can answer "Is the Glycol Deicer SDS current?" with a real citation.
23. `pnpm tsc --noEmit`; smoke-test: dashboard banner → SKU list → SKU detail → SDS viewer → close, plus recommendations row's SDS warning icon + filter; push to GitHub.

### Acceptance

- Every seeded SKU has at least one SDS document with extracted fields.
- `/skus/[code]` surfaces the SDS card with signal word, pictograms, hazards, expiration.
- Clicking **View full SDS** opens a modal with the PDF + extracted sidebar.
- Dashboard shows an **SDS Attention** banner counting expiring + expired SDS.
- Recommendations table rows show a ⚠ icon when the SKU's SDS is expiring/expired.
- Ask CMIS can answer an SDS-status question using the new tool, with a citation.
- Sidebar nav has a **Catalog** entry active on `/skus`.
- `pnpm tsc --noEmit` passes.

---

## After Phase 3

The demo loop is complete: **see → understand → quantify → locate → act → stay compliant**. Return to iteration 5's **Polish & Deploy** checklist and re-run smoke tests across all seven surfaces (login, dashboard, chat, scenarios, sites, orders, skus) before the Vercel deploy. Ship once.
