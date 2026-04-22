# CMIS Forecast — Iteration Plan

Companion to `docs/PRD.md`. Five iterations, demo-ready at the end of iteration 4. Each iteration is broken into **atomic, numbered steps** — do them in order, complete one before starting the next, tick the acceptance at the end. **Don't overengineer** — if a step isn't on this list, don't build it.

**Overall target:** a single ops dashboard that lands Solution #01 — predict consumption by customer/plant/SKU/season, recommend reorder points, flag anomalies, backed by an Ask CMIS chat. Deployed on Vercel.

## Ground Rules (apply to every iteration)

- **shadcn/ui is installed via the CLI — never hand-written.** Every primitive we use must come from `pnpm dlx shadcn@latest add <component>`. Do not copy source into the repo manually, do not reimplement a shadcn primitive, do not wrap a missing one. If something isn't in shadcn's catalog, **stop and ask Powell before building anything**.
- **Iterations 3 (Dashboard) and 4 (Ask CMIS) are the hero iterations.** Budget extra time for polish. Iterations 1, 2, 5 support them and must not eat their runway.
- **No custom components at any level.** Compose shadcn primitives; never author a new primitive.
- **RSC + server actions only.** No TanStack Query or other client-side fetching libs.
- **All 4 RLS policies (SELECT/INSERT/UPDATE/DELETE) on every table.** Applied via Supabase MCP.
- **`pnpm tsc --noEmit` passes before every push.**
- **One step at a time.** Don't pre-load work from later steps. If a step uncovers something bigger than the step, stop and ask.

---

## Iteration 1 — Scaffold & Infrastructure Setup

**Goal:** a runnable Next.js 16 app wired to Supabase (auth + DB), Upstash, and OpenAI, with the layout shell and theme tokens in place. No features yet.

### Steps

1. Verify local tooling: `node --version` (must be ≥20), `pnpm --version`. Fix before continuing.
2. Scaffold the Next app at repo root: `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm`. Confirm Next 16 in `package.json`.
3. Run `pnpm dev` once; open `http://localhost:3000`; confirm the default Next page renders; stop the server.
4. Init shadcn/ui: `pnpm dlx shadcn@latest init`. Pick `new-york` style, `neutral` base color. Confirm `components.json` and `src/components/ui/` exist.
5. Install shadcn primitives needed through iteration 2: `pnpm dlx shadcn@latest add button card input label sonner sidebar separator`. Do not hand-edit these files.
6. Install runtime deps in one command: `pnpm add @supabase/supabase-js @supabase/ssr @upstash/redis ai @ai-sdk/openai react-hook-form zod @hookform/resolvers date-fns lucide-react`.
7. Add `next/font` loaders for Inter (sans) and Geist Mono (mono) in `src/app/layout.tsx`. Apply as CSS variables on `<html>`.
8. Create `src/app/globals.css` token block from `docs/theme-guide.md` — OKLCH values for Brand Blue, Teal, Critical Red, Amber, Green, neutrals, plus radius scale — exposed via `@theme inline`. Light mode only. Dark block stubbed but unused.
9. Create the Supabase project in the dashboard (region: US East). Copy URL + anon key + service role key into `.env.local`. Commit a matching `.env.example` with blank values.
10. Create the Upstash Redis DB (same region). Copy REST URL + token into `.env.local` and `.env.example`.
11. Add the OpenAI API key Powell provided into `.env.local` and `.env.example`.
12. Wire Supabase MCP for this project so future schema/RLS/seed work goes through MCP.
    *(Vercel provisioning is deferred to iteration 5 — we deploy only after polish.)*
13. Create `src/lib/supabase/server.ts` (SSR client via `@supabase/ssr`) and `src/lib/supabase/client.ts` (browser client). Nothing else in them yet.
14. Create `src/lib/redis.ts` — exports an Upstash client + a `withCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>)` helper. Implementation is real, not stubbed — we'll use it in iteration 3.
15. Create `src/lib/openai.ts` — exports the Vercel AI SDK provider configured for OpenAI. Nothing else.
16. Create `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`; function name is `proxy`, runtime is `nodejs` only). Reads the Supabase session cookie, redirects unauthed users from `/` to `/login`, redirects authed users away from `/login`. Matcher config excludes `/_next`, static assets, and health endpoints.
17. Create `src/app/(app)/layout.tsx` — auth-protected wrapper that hosts the sidebar + main content. Use shadcn `SidebarProvider` + `Sidebar`.
18. Build the sidebar (`src/components/layout/app-sidebar.tsx`) — branded blue (sidebar tokens from theme), CMIS wordmark at the top, one live nav entry "Forecast" linking to `/`, user/email + Log out button at the bottom. No dead or "Coming soon" items.
19. Create `src/app/(app)/page.tsx` — empty dashboard page with a single `<h1>Forecast</h1>` placeholder body. Real content comes in iteration 3.
20. Create `src/app/login/page.tsx` — blank `<main>` with `<h1>Sign in</h1>`. Real form comes in iteration 2.
21. Mount the shadcn `Toaster` globally in `src/app/layout.tsx`.
22. Read through `node_modules/next/dist/docs/` for Next 16 specifics on App Router, middleware, and metadata. Note anything that differs from Next 14/15 habit.
23. Run `pnpm tsc --noEmit` — fix any errors.
24. Local smoke test: `pnpm dev`; hit `/` (redirects to `/login`); hit `/login` (renders); sidebar does not show on the login page. Push to GitHub when satisfied.

### Acceptance

- `pnpm dev` runs without errors.
- Visiting `/` while unauthed redirects to `/login`.
- `/login` renders the placeholder header.
- Sidebar is branded blue with the CMIS wordmark + one nav entry.
- `pnpm tsc --noEmit` passes.
- Code is pushed to GitHub (no Vercel deploy yet — deferred to iteration 5).

---

## Iteration 2 — Login & Mock Data Seed

**Goal:** auth works end-to-end with a single demo account; the database has deterministic mock forecasting data covering all four proposal dimensions.

### Steps

1. Install shadcn primitives needed this iteration: `pnpm dlx shadcn@latest add form alert`.
2. Via Supabase MCP, create the single demo user account (email + password). Record the credentials.
3. Build the login form (`src/components/auth/login-form.tsx`) using shadcn `Form` + `Input` + `Label` + `Button`, with react-hook-form + zod schema `{ email, password }`.
4. Create the server action `src/app/login/actions.ts` → calls `supabase.auth.signInWithPassword`; on success redirects to `/`; on error returns a plain-language message.
5. Wire the form to the server action; render errors inline using shadcn `Alert`. No toasts.
6. Add a Log out server action; wire the sidebar's Log out button to call it.
7. Verify middleware: logging in lands on `/`; logging out returns to `/login`; direct-navigating to `/` while logged out redirects.
8. Design the Supabase schema. Author the migration SQL:
   - `customers (id, name, industry, fortune_100 bool, created_at)`
   - `sites (id, name, city, state, region, lat, lng, created_at)`
   - `skus (id, code, name, category, unit, created_at)`
   - `customer_site_skus (customer_id, site_id, sku_id, primary key on all three)`
   - `forecasts (id, customer_id, site_id, sku_id, period_start date, forecast_qty, actual_qty, lower_bound, upper_bound, anomaly_flag bool)`
   - `recommendations (id, customer_id, site_id, sku_id, current_stock, reorder_point, projected_stockout_date, status enum('healthy','nearing','risk'))`
   - `chat_sessions (id, user_id, created_at, updated_at)`
   - `chat_messages (id, session_id, role, content, tool_calls jsonb, created_at)`
9. Apply the migration via Supabase MCP. Verify tables exist.
10. Apply RLS via Supabase MCP — on each table add SELECT + INSERT + UPDATE + DELETE policies:
    - `customers/sites/skus/customer_site_skus/forecasts/recommendations`: read-open to `authenticated`, writes restricted to service role
    - `chat_sessions/chat_messages`: read/write scoped by `auth.uid()`
11. Create `src/scripts/seed.ts` — deterministic seed script using a fixed-seed RNG. It must be idempotent (truncate + re-insert) so re-running produces the same rows.
12. In the seed: generate ~12 customers with Chemico-plausible names and industries (automotive 5, aerospace 2, biopharma 2, government 2, other 1). Mark 8 as `fortune_100`.
13. In the seed: generate 50 sites distributed across US states (include lat/lng for possible future map).
14. In the seed: generate ~30 SKUs across categories (cleaners, solvents, coolants, deicers, lubricants, reagents, etc.) — at least two visibly seasonal SKUs (e.g., deicer, summer coolant).
15. In the seed: generate `customer_site_skus` assignments with realistic sparsity — each customer uses 5–15 SKUs across 2–8 sites. Not every customer-site-sku combination exists.
16. In the seed: generate 24 months of `forecasts` per assigned triple. Base demand has a trend + seasonality component (for seasonal SKUs, 3–5× summer/winter ratio). `actual_qty` = `forecast_qty` ± noise; flag ~3% of rows as anomalies and bump `actual_qty` beyond bounds there.
17. In the seed: generate `recommendations` from the latest forecast period — `current_stock` / `reorder_point` / `projected_stockout_date` / `status` so the status mix lands roughly 60% healthy / 25% nearing / 15% risk.
18. Add `"seed": "tsx src/scripts/seed.ts"` to `package.json` scripts. Install `tsx` as a dev dep if needed.
19. Run `pnpm seed`. Verify counts via Supabase MCP: 12 customers, 50 sites, ~30 SKUs, assignment rows, 24 months of forecasts per assignment, recommendations match latest period.
20. Via Supabase MCP, spot-check: pick one seasonal SKU and verify forecasts show clear seasonal pattern; pick one triple and verify 24 months of data.
21. Run `pnpm seed` again; verify row counts are identical (idempotent).
22. Run `pnpm tsc --noEmit`; smoke-test login locally with the demo account; push to GitHub.

### Acceptance

- Logging in with the demo account lands on `/` (blank dashboard for now).
- Logging out returns to `/login`; re-navigating to `/` redirects back.
- `pnpm seed` populates the DB deterministically; re-running produces the same rows.
- Raw queries via MCP show expected counts and seasonal patterns.
- `pnpm tsc --noEmit` passes.

---

## Iteration 3 — Dashboard (HERO)

**Goal:** the single ops dashboard from PRD §6.1 — three polished zones reading from Supabase with Upstash caching, covering all four proposal dimensions.

### Steps

**A. shadcn primitives**

1. Install all primitives needed this iteration in one command: `pnpm dlx shadcn@latest add card chart tabs select badge table skeleton tooltip dropdown-menu scroll-area`.

**B. Query layer**

2. Create `src/lib/queries/kpis.ts` → `getKpis()` returns `{ forecastAccuracy: { value, delta, spark[] }, workingCapitalFreed: {…}, stockoutRisk: {…}, expeditedFreight: {…} }`. Compute from Supabase; wrap in `withCache("kpis:v1", 600, …)`.
3. Create `src/lib/queries/forecast.ts` → `getForecastSeries({ dimension, horizon, mode, filter })` returns `{ points: Array<{ periodStart, forecast, actual, lower, upper, anomaly }>, meta: {…} }`. Cache per-arg.
4. Create `src/lib/queries/recommendations.ts` → `getRecommendations({ filters, sort })` returns full list (client paginates). Include customer/site/sku names joined. Cache with short TTL (300s).
5. Create `src/lib/queries/filter-options.ts` → `getFilterOptions()` returns `{ customers: [{ id, name, count }], sites: [...], skus: [...] }` filtered to entries with non-zero data. Cache 600s.
6. Create a small `src/lib/format.ts` with helpers: `formatMoney(n)` → `$1.2M`/`$340k`/`$0`, `formatPct(n)` → `87.3%`, `formatDelta(n)` → `+0.4pp`/`-2.1%`, `formatRelativeDate(d)`.

**C. Layout**

7. Rewrite `src/app/(app)/page.tsx` to compose four zones: `<KpiRow />`, `<ForecastChart />`, `<RecommendationsTable />`, plus the Ask CMIS entry button in the page header (panel itself comes in iteration 4 — render the button as a disabled placeholder? **no** — wait until iteration 4 and leave the button out for now).
8. Add a `<DashboardHeader />` at the top of the page: title "Forecast", subtle subtitle "Demand forecasting and inventory optimization across all customers and sites." No action buttons yet.
9. Use a 12-column grid for layout: KPI row full-width (4 cards), Forecast chart full-width below, Recommendations table full-width below that.

**D. KPI row**

10. Build `src/components/dashboard/kpi-tile.tsx` — shadcn `Card` with: label, big metric, delta pill, small sparkline using shadcn `Chart` (area variant). Tooltip on the whole tile via shadcn `Tooltip` explains the calculation.
11. Build `src/components/dashboard/kpi-row.tsx` — server component that calls `getKpis()` and renders four `<KpiTile>`s in a responsive grid. Forecast Accuracy gets a subtle branded accent (e.g., teal underline strip or brand-blue icon) to make it the visual hero.
12. Write the per-tile tooltip copy — the Forecast Accuracy tooltip says "Projected working capital freed assumes a 5% accuracy lift across assigned SKUs" (or similar — ties to the proposal's headline).
13. Build a matching `KpiRowSkeleton` that renders four skeleton cards of identical dimensions.

**E. Forecast chart**

14. Build `src/components/dashboard/forecast-chart.tsx` as a client component. Props: initial series + filter options.
15. Card header contents: title "Forecast vs. Actual", shadcn `Tabs` for dimension (`All · by Customer · by Plant · by SKU`), shadcn `Tabs` for view mode (`Timeline · Seasonal`), shadcn `Select` for horizon (visible only in Timeline), shadcn `Select` for the active slice (visible only when dimension ≠ All).
16. Inside the card body, render a shadcn `Chart` (recharts line chart) with: forecast line (primary), actual line (muted-foreground), soft confidence band between lower/upper, anomaly dots on anomaly rows.
17. Style anomaly markers distinctly (larger dot, `chart-5` color). On hover, `ChartTooltip` groups rows: forecast, actual, delta, anomaly reason.
18. Seasonal view: re-map data into four seasonal bands (winter / spring / summer / fall) for the selected slice; overlay them with `chart-1..4`; pin a legend to the top-right of the card.
19. Axis formatting: short month labels on 12mo horizon, full date on 30d; abbreviated y-axis (`1.2k` / `34k`).
20. Debounce the `ResizeObserver` inside the chart container (150ms) so sidebar toggles don't thrash it.
21. Empty slice state: when a (dimension, slice, horizon) returns zero points, show a small inline empty card with "No data for this slice — try another."
22. Entrance animation: 300ms fade + 8px rise on mount; respect `prefers-reduced-motion` (instant on).
23. Server-side wrapper `forecast-chart.server.tsx` (or pass initial data via a server component page) that calls `getForecastSeries` with sensible defaults and passes data down.

**F. Reorder recommendations table**

24. Build `src/components/dashboard/recommendations-table.tsx` as a client component — receives the full list from the server.
25. Header row above the table: shadcn `Select` filters for Customer, Site, Status. Options come from `getFilterOptions`; zero-count options are hidden.
26. shadcn `Table` with columns: SKU, Customer, Site, Current Stock, Reorder Point, Projected Stockout, Status. Every column (except Status) is sortable — click header toggles asc/desc via `useState` + `useMemo`.
27. Status cell is a shadcn `Badge` — `chart-4` for healthy, `chart-3` for nearing, `chart-5` for risk. Include a short tooltip.
28. Projected Stockout cell shows relative date ("in 4 days") with absolute date in a shadcn `Tooltip`.
29. Client-side pagination (`useState` for page, `useMemo` for slice). Page size 10. Show "x–y of N" and prev/next buttons (shadcn `Button`, icon variant).
30. Ghost rows on the last page: render invisible `<TableRow>`s to keep the container height stable.
31. Empty-filter state: when filters return zero rows, show an inline row with "No recommendations match — clear filters to see everything" and a "Clear filters" button.
32. Row hover state: subtle `bg-muted/40`; keyboard focus visible on the row.

**G. Shared polish**

33. Per-zone error boundaries (`error.tsx` at the route or local `<ErrorBoundary>` wrappers) — if a query fails, show "Couldn't load this section · Retry" with a retry button instead of breaking the whole page.
34. Loading states: each zone renders its skeleton while its data streams (use RSC + `<Suspense>`).
35. Keyboard traversal test: tab through KPI tiles → chart controls → chart (escape) → table filters → table → pagination. Focus must always be visible; tab order left-to-right, top-to-bottom.
36. `prefers-reduced-motion` test: with OS-level reduced-motion enabled, no entrance animations, no sparkline draw-in, no hover scale.
37. `pnpm tsc --noEmit`; local smoke-test the dashboard with the demo account; push to GitHub.

### Acceptance

- Dashboard renders real data from Supabase through Upstash.
- Four KPIs populate; Forecast Accuracy is visually prominent; every tile has a tooltip.
- Chart dimension toggle (All/Customer/Plant/SKU) and view mode (Timeline/Seasonal) update smoothly with no jump or resize jitter.
- Seasonal view shows clear winter/spring/summer/fall patterns on a seasonal SKU (e.g., deicer).
- Chart tooltip groups forecast/actual/delta/anomaly; anomaly markers are interactive.
- Reorder table sorts, filters, paginates client-side; last page doesn't collapse height.
- Filter dropdowns never show zero-result options.
- Error boundaries trigger cleanly when Supabase/Upstash are offline.
- Keyboard: full flow operable without a mouse; focus always visible.
- `prefers-reduced-motion` disables non-essential animation.
- `pnpm tsc --noEmit` passes.

---

## Iteration 4 — Ask CMIS (HERO)

**Goal:** the collapsible Ask CMIS panel from PRD §6.3 — streaming Q&A with plain-text citations over forecast data.

### Steps

**A. shadcn primitives**

1. Install primitives for this iteration: `pnpm dlx shadcn@latest add sheet textarea`.

**B. Affordances**

2. Add an "Ask CMIS" button in the dashboard header (shadcn `Button` + `lucide:Sparkles` icon). Controls a local `open` state on the dashboard page (client component for the header).
3. Wire a keyboard shortcut: `⌘K` / `Ctrl+K` toggles the panel open/closed. `Escape` closes. Cursor lands on the composer when the panel opens.
4. Build the panel shell `src/components/chat/ask-cmis.tsx` as a shadcn `Sheet` pinned right, width ~440px on desktop. Inside: header, message list (shadcn `ScrollArea`), composer pinned to the bottom.

**C. Sessions & persistence**

5. Add a `src/lib/chat/session.ts` helper: `getOrCreateSession(userId)` using Supabase — returns the active session id. Store the active session id in `sessionStorage` under `cmis:sessionId`. Module-level `hasInitialized` prevents double-init.
6. On panel open, if `sessionStorage.cmis:sessionId` exists, fetch that session's messages from Supabase and render. Otherwise show the empty state.
7. Add a "Clear thread" item in a shadcn `DropdownMenu` in the panel header — wipes `sessionStorage.cmis:sessionId` and creates a new session on the next message.

**D. Empty state**

8. Build the empty-state component: three shadcn `Card`s, one per ROI pillar:
   - "Where is excess inventory tying up cash?"
   - "Which sites are at risk of stockout in the next 30 days?"
   - "Which SKUs are driving expedited shipments this quarter?"
9. Clicking a suggestion fills the composer with the text and submits on the next tick.

**E. Composer**

10. Build the composer: shadcn `Textarea` (autogrow up to ~6 lines), shadcn `Button` (Send) + `Button` (Stop, visible only while streaming). `Enter` submits; `Shift+Enter` inserts a newline.
11. Character counter (muted, bottom-right of composer) that turns amber at ≥3600 chars; submit disabled at ≥4000.

**F. Tool-backed API route**

12. Create `src/app/api/chat/route.ts` — POST handler using Vercel AI SDK `streamText` with `@ai-sdk/openai`.
13. Author the system prompt: the model is the Chemico forecasting copilot; it only answers from tool output; every numeric claim must include a citation in the literal form `[[Customer · Plant · SKU · Period]]` (period may be a month, quarter, or "current"); if the data doesn't support an answer, it says so plainly; tone is crisp, CFO-friendly.
14. Implement tool `getKpis` — wraps the existing query.
15. Implement tool `getSiteRisk({ horizonDays: 30 | 60 | 90 })` — returns sites at stockout risk within N days, sorted by urgency.
16. Implement tool `getSkuDrivers({ metric: "stockouts" | "freight" | "excess", limit: number })` — top N SKUs driving that metric.
17. Implement tool `getCustomerExposure({ customerId?, horizonDays? })` — per-customer risk summary; when `customerId` is omitted, return all customers ranked by exposure.
18. Implement tool `getSeasonalPattern({ skuId })` — four-season demand summary for a specific SKU.
19. Each tool reads through the same cached `withCache` query layer used by the dashboard (so the dashboard and chat answers agree).
20. Log each tool call (name + args + result row count) with the assistant message so it can be surfaced in the UI.
21. Persist every user + assistant message to `chat_messages` (include `tool_calls` JSON for assistant messages).

**G. Rendering**

22. Build `src/components/chat/message.tsx` — user bubble (right-aligned, muted surface) vs. assistant bubble (left-aligned, card surface). Assistant content rendered as markdown using `prose prose-sm` from `@tailwindcss/typography`.
23. Streaming cursor: a thin CSS-only blinking caret at the end of the currently-streaming assistant message. Respects `prefers-reduced-motion`.
24. Citation pill rendering: client-side pass that replaces `[[…]]` tokens with an inline shadcn `Badge`. No navigation, just a styled marker.
25. Collapsed tool-call badge under each assistant message: small shadcn `Badge` like "🔧 `getSiteRisk(horizon: 30)` · 4 rows". Click expands to show full args + row count.
26. Per-message hover actions (shadcn `Tooltip` + icon buttons): Copy (plain text to clipboard + sonner toast) and Regenerate (last assistant message only — re-runs the last user prompt).

**H. Scroll behavior**

27. Message list auto-scrolls to the bottom on each new token **only if** the user was already near the bottom (threshold ~80px). If the user scrolled up, show a floating "↓ Jump to latest" pill that scrolls them down on click.
28. On panel open, jump to the bottom of the list.

**I. Streaming control**

29. Wire `Stop` to an `AbortController` — aborts the fetch; server persists the partial assistant message (marked `stopped: true` or just saves what streamed).
30. Wire `Regenerate` to re-submit the previous user message; discard the previous assistant message in the UI (it stays in the DB as history).
31. Network-interruption handling: if the stream errors mid-flight, render an inline "Connection lost · Retry" pill beneath the partial message; clicking retry re-runs the last user message.
32. Rate-limit / model errors: render an inline plain-language message ("The model is busy — try again in a moment.") with a Retry button. No toasts for these.

**J. Final polish**

33. Run each of the three suggestion questions end-to-end: verify tool calls fire, citations render as pills, tool-call badges appear, scroll-stick works.
34. Confirm `⌘K` / `Ctrl+K`, `Esc`, focus-on-open, and keyboard-only message submission all work.
35. Run `pnpm tsc --noEmit`; local smoke-test chat with the demo account; push to GitHub.

### Acceptance

- `⌘K` / `Ctrl+K` opens the panel; `Esc` closes it; focus lands on the composer on open.
- Empty state shows three ROI-pillar suggestions; clicking one sends immediately.
- Streaming is token-by-token at a steady cadence; Stop halts within ~200ms and persists the partial message.
- Each of the three suggestion questions returns a cited, grounded answer using at least one tool call.
- Tool-call badges render under each assistant message and expand on click.
- Scroll-stick works: sticks to bottom while streaming if user was at the bottom; otherwise shows the "Jump to latest" pill.
- Navigating away and back restores the active thread.
- Clear thread starts a new session.
- Copy copies plain text; Regenerate re-runs the last prompt.
- Network interruption and rate-limit errors surface inline, not as crashes.
- Citations render as styled pills, not raw `[[…]]`.
- Keyboard: whole flow operable without a mouse; focus always visible.
- `prefers-reduced-motion` disables the streaming caret animation.
- `pnpm tsc --noEmit` passes.

**Demo-ready after this iteration.**

---

## Iteration 5 — Polish & Deploy

**Goal:** empty/loading/error states across all surfaces, accessibility pass, and a production deploy ready for the demo.

### Steps

1. Walk every surface (login, dashboard, chat panel) and confirm each data-reading region has a **loading** state (shadcn `Skeleton`), an **empty** state (plain-language + suggested action), and an **error** state (inline retry).
2. Replace any lingering raw spinners with shadcn `Skeleton` matching final dimensions to eliminate CLS.
3. Keyboard pass: tab through every surface. Fix any focus traps, missing focus rings, or illogical tab orders.
4. Focus-ring audit: confirm every interactive element uses `--ring` (Brand Blue). No custom or removed focus rings.
5. Touch-target audit: every interactive element ≥ 24×24 CSS px. Fix anything smaller (usually icon buttons).
6. Semantics audit: interactive = real `<button>`/`<a>`, not `div`. Every `<input>` has a real `<label>`.
7. Status announcements: streaming content has `role="status"`; error regions have `role="alert"` where appropriate.
8. Motion pass: enable `prefers-reduced-motion` at the OS level and verify chart entrance, KPI sparkline, chat caret, panel open/close, and sidebar collapse all respect it.
9. Copy pass: verb-first CTAs, plain-language errors, no placeholder-as-label, helper text in `muted-foreground`. Fix anything corporate-sounding.
10. Run a full demo rehearsal end-to-end with a fresh browser profile:
    1. Log in as the demo account.
    2. Point to Forecast Accuracy — explain the 5% = millions story via tooltip.
    3. Scan the KPI row.
    4. Toggle the forecast chart across dimensions (Customer → Plant → SKU).
    5. Switch to Seasonal view on a seasonal SKU.
    6. Skim the reorder table; filter by one at-risk customer.
    7. Open Ask CMIS with ⌘K; ask an unscripted ROI question.
11. **First and only Vercel deploy** — create the Vercel project, import the GitHub repo, set region `iad1`, add every env var from `.env.example`, trigger the initial build. Fix any build warnings.
12. Write `README.md` — one-paragraph description + setup steps (install, env vars, seed, run, deploy). Reference PRD + iteration plan.
13. Final `.env.example` review — every required key present, no secrets leaked.
14. `pnpm tsc --noEmit` clean on main.

### Acceptance

- All dashboard zones and chat surfaces have loading + empty + error states.
- Keyboard traversal works everywhere; focus always visible.
- All targets ≥ 24×24 CSS px.
- `prefers-reduced-motion` disables non-essential animation.
- Production deploy resolves; demo account logs in; dashboard renders; chat streams.
- 3-minute walkthrough lands all three ROI pillars without narration gaps.

---

## Post-Demo (deferred, out of scope)

- Dark mode
- Optional sites map
- Multi-tenant auth
- Real forecasting model
- ERP integrations
- PDF ingestion (belongs to Solution #02)

None of these are in scope for the demo build.
