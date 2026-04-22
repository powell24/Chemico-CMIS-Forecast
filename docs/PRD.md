# CMIS Forecast — Product Requirements Document

**Status:** Draft · **Owner:** Powell (Zaigo) · **Audience:** The Chemico Group (CFO, Ops, Leon Richardson)
**Type:** Pitch mockup — not a production system. Keep it simple and user-friendly.

---

## 1. Overview

CMIS Forecast is a mockup of an AI-powered demand forecasting and inventory optimization tool for The Chemico Group, corresponding to **Solution #01** of Zaigo's AI strategy proposal (`docs/pdfs/Chemico_Proposal.pdf` §01).

It is a **single ops dashboard** that predicts chemical consumption by customer, plant, SKU, and season; recommends reorder points; and flags sudden demand spikes or drops — everything a CFO or ops lead needs on one screen. Business data is mocked; Supabase, Upstash, and OpenAI are real under the hood but invisible to the user unless they're doing useful work.

## 2. Problem (from the proposal)

Chemico manages chemicals across **50 sites** for Fortune 100 customers. Without AI forecasting:

- **Cuts working capital** — excess inventory across 50 sites ties up significant cash.
- **Eliminates stockouts** — prevents costly production disruptions for Fortune 100 customers.
- **Reduces expedited freight** — fastest-payback AI use case for an ops-heavy business.

**Headline ROI:**
> Even a 5% improvement in forecast accuracy across Chemico's 50 sites can free up millions in working capital — immediately visible on the balance sheet.

The dashboard's job is to make that sentence feel true in under three minutes.

## 3. Goals

| # | Goal |
|---|---|
| G1 | A first-time viewer understands the primary insight in ~3 seconds. |
| G2 | The three ROI pillars (working capital, stockouts, freight) are visible on one screen. |
| G3 | The forecast chart delivers all four proposal dimensions: customer, plant, SKU, season. |
| G4 | Forecast accuracy is a visible metric that ties the "5% = millions" story to what's on screen. |
| G5 | Ask CMIS answers natural-language questions about the forecast with citations. |
| G6 | Brand matches Chemico's marketing site (`docs/screenshots/`, `docs/theme-guide.md`). |

## 4. Non-Goals

- Not a real forecasting engine (no model training).
- Not a multi-page app. **One dashboard.**
- **No PDF ingestion** — that's Solution #02 territory (SDS Copilot), not §01.
- No ERP integrations.
- No admin/user-management UI beyond Supabase defaults.
- No cache-hit badges or infra-theater UI — infrastructure stays quiet.
- No mobile app (desktop-first; responsive if cheap).
- Scope is Solution #01 only. Ignore the other 4 proposal solutions.

## 5. Audience

- **Primary:** Leon Richardson — frame as *protecting what he built*, not cost-cutting.
- **Secondary:** CFO + Ops — cash-flow language.

## 6. Product Surface

### 6.1 Single Dashboard (the only insight surface)

Four zones, nothing more:

1. **KPI row (4 tiles)** — each ties directly to a line in the proposal:
   - **Forecast Accuracy** (lead tile) — current %, with delta vs. baseline. Headline metric — the 5% story.
   - **Working Capital Freed** — projected $, derived from the accuracy delta.
   - **Stockout Risk** — count of sites at risk in the next 30 days.
   - **Expedited Freight Avoided** — $/month.
2. **Forecast chart** — predicted chemical consumption over time. Two controls that deliver the proposal's four dimensions:
   - **Dimension toggle:** All · by Customer · by Plant · by SKU
   - **View mode:** Timeline (default; 30d / 90d / 12mo horizons) · Seasonal (winter/spring/summer/fall bands overlaid for the selected slice)

   Anomaly spikes/drops appear inline as markers — no separate anomaly panel.
3. **Reorder recommendations table** — SKU, customer, site, current stock, recommended reorder point, projected stockout date. Color-coded status (green/amber/red). Client-side paginated.
4. **Ask CMIS** — collapsible side panel (chat). See §6.3.

That's it. No separate anomaly panel, no data-sources card, no sites map. Keep it scannable.

### 6.2 Supporting Surfaces

- **Login** (`/login`) — Supabase Auth, email + password. Single seeded demo account; no signup flow, no password reset, no account UI elsewhere.
- **Auth middleware** → redirects unauthenticated users to `/login`.

### 6.3 "Ask CMIS" (AI Chat)

Minimal scope:

| Feature | In |
|---|---|
| Natural-language Q&A over forecast data | ✅ |
| Citations as plain text (e.g., "Plant 12, SKU-1234, Mar 2026") | ✅ |
| Streaming tokens with stop button | ✅ |
| Collapsible side panel on dashboard | ✅ |
| Thread persists during the session | ✅ (via `sessionStorage`) |
| Everything else (follow-up chips, cross-session history, CFO-mode toggle, deep-links into charts) | ❌ |

**Example prompts it must handle (one per ROI pillar):**

| Pillar | Question |
|---|---|
| Working capital | "Where is excess inventory tying up cash?" |
| Stockouts | "Which sites are at risk in the next 30 days?" |
| Expedited freight | "Which SKUs are driving expedited shipments this quarter?" |

## 7. Data Model

| Table | Purpose | Source |
|---|---|---|
| `users` | Supabase Auth | real |
| `chat_sessions` / `chat_messages` | Ask CMIS threads | real |
| `customers`, `sites`, `skus`, `customer_site_skus`, `forecasts`, `recommendations` | forecasting data (customer / plant / SKU / season) | **seeded mock**, deterministic — ~12 customers × 50 sites × ~30 SKUs × 24 months of history |

**RLS:** all 4 policies (SELECT/INSERT/UPDATE/DELETE) on every table from day one.

Upstash caches expensive read queries with a `withCache(key, TTL, fn)` wrapper — TTL 5–30 min. Implementation detail, not a UI feature.

## 8. Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 16, Server Components only |
| Language / runtime | TypeScript, Node 20+ |
| Package manager | pnpm |
| Styling | Tailwind v4 |
| Components | **shadcn/ui only** (never hand-rolled) |
| Charts | shadcn charts (recharts) |
| Icons | lucide-react |
| Toasts | sonner |
| Forms + validation | react-hook-form + zod |
| Dates | date-fns |
| Auth | Supabase Auth (cookie middleware from iteration 1) |
| Database | Supabase Postgres |
| DB admin | **Supabase MCP** — used for migrations, RLS policies, seed operations, and ad-hoc SQL during development |
| Cache | Upstash Redis |
| AI | OpenAI (key supplied by Powell) |
| AI SDK | **Vercel AI SDK** (`ai` package) |
| Hosting | Vercel, region `iad1` |

**Rendering:** RSC + server actions everywhere; client components only for interactive slices (filters, pagination, chat panel). `sessionStorage` for navigation-surviving state (active chat, active filters).

## 9. Brand & UI

Sources of truth:

- `docs/theme-guide.md` — design tokens (`src/app/globals.css` via Tailwind `@theme inline`)
- `docs/ui-ux-design-guide.md` — grid, spacing, typography, a11y, motion
- `docs/screenshots/` — Chemico marketing-site references

**Palette:** Brand Blue `#0071BC` (sidebar, primary, focus), Teal `#00B2A9` (accent), Critical Red `#DC2626` (CTAs, destructive), Amber (warn), Green (healthy), near-white canvas.

**Status semantics:** green = healthy stock · amber = nearing reorder · red = stockout risk.

**Feel:** white and airy (marketing-site calm density). Branded blue sidebar; don't reuse sidebar tokens elsewhere.

**A11y:** WCAG 2.2 AA is a ship-blocker. Keyboard nav end-to-end, visible focus, 24×24 min targets, `prefers-reduced-motion` respected.

## 10. Engineering Best Practices

General defaults for this stack. `docs/breaks-and-fixes.md` is a reference for common pitfalls on similar stacks — treat it as best practices, not as project history.

- **Next 16:** read `node_modules/next/dist/docs/` before writing framework code.
- **Supabase RLS:** define all four policies (SELECT/INSERT/UPDATE/DELETE) on every table — silent DELETE is the most common "looks fine, did nothing" bug.
- **Auth middleware:** wire it in iteration 1, even as a stub.
- **SSR-hostile libs:** use `dynamic({ ssr: false })`, not `"use client"` alone.
- **Tables:** client-side pagination with invisible ghost rows to prevent layout jump on the last page.
- **Filter dropdowns:** never show zero-result options — join options against counts.
- **Animations:** CSS `data-[state=...]` variants + debounced `ResizeObserver`.
- **Upstash:** `withCache(key, TTL, fn)` at the query level, not component level.
- **Vercel region:** match Supabase (`iad1`).
- **`tsc --noEmit` before every push.**

## 11. Iteration Plan

| # | Deliverable |
|---|---|
| 1 | Scaffold: Next 16 + Tailwind + shadcn, Supabase + Upstash + OpenAI provisioning, auth middleware stub, sidebar + layout shell, theme tokens wired |
| 2 | Auth + seeded mock data (customers / sites / skus / assignments / forecasts / recommendations) |
| 3 | Dashboard: KPI row (incl. Forecast Accuracy), forecast chart (dimension + view-mode toggles), reorder table — with Upstash caching |
| 4 | Ask CMIS side panel: streaming, stop, citations, sessionStorage persistence |
| 5 | Polish: empty/loading/error states, reduced-motion, a11y pass, Vercel deploy |

Full detail in `docs/iteration-plan.md`. **Demo-ready at the end of iteration 4; iteration 5 is production polish.**

## 12. Success Criteria

- 3-minute live walkthrough lands all three ROI pillars.
- Forecast Accuracy KPI sells the "5% improvement = millions in working capital" story at a glance.
- Viewer can toggle the chart across all four proposal dimensions (customer / plant / SKU / season) without friction.
- Ask CMIS answers an unscripted ROI question with citations.
- Brand looks unmistakably Chemico.
- No visible spinner longer than ~1s; streaming feels immediate.

## 13. Resolved Decisions

| Question | Decision |
|---|---|
| AI SDK | **Vercel AI SDK** (`ai` package) |
| Theme | **Light only** for demo; dark mode deferred post-demo |
| "CMIS" naming | **Use directly** in UI headings and nav |
| Login | Single seeded demo account, `/login` only — no signup, no password reset, no account UI |
| Mock data scale | ~12 customers × 50 sites × ~30 SKUs × 24 months of history |
| Environment | Supabase project, Upstash DB, OpenAI key, Vercel project — **not yet provisioned**; part of iteration 1 setup |

---

**Sources:** `docs/pdfs/Chemico_Proposal.pdf` §01 · `docs/ui-ux-design-guide.md` · `docs/theme-guide.md` · `docs/screenshots/`
