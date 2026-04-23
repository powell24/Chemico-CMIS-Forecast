# CMIS Forecast — Iteration Plan, Phase 2

Extension to `docs/iteration-plan.md`. Iterations 1–5 covered the core mockup (dashboard, chat, polish, deploy). Phase 2 adds two pages that strengthen the pitch: the **Scenario Planner** (the money slide) and the **Site Map** (the network slide). Ship the planner first; the map is the visual upgrade.

Everything in the **Ground Rules** section of the original plan still applies — shadcn/ui only, no custom primitives, RSC + server actions, `pnpm tsc --noEmit` before every push, one step at a time.

Run these before iteration 5's Vercel deploy so the deployed app ships with all five surfaces (dashboard, chat, scenarios, sites) in one go.

---

## Iteration 6 — Scenario Planner

**Goal:** a `/scenarios` page where the user dials forecast-accuracy lift and sees live-computed working capital freed, stockout risk reduced, and expedited freight avoided — using the exact math the dashboard KPIs use, so numbers reconcile.

### Steps

**A. shadcn primitives + math module**

1. Install the primitive needed this iteration: `pnpm dlx shadcn@latest add slider`.
2. Create `src/lib/scenario/math.ts` — a pure function `computeScenario({ accuracyLiftPct, carryingCostPct, horizonMonths }, baseline)` returning `{ workingCapitalFreed, stockoutRiskReduced, expeditedFreightAvoided, totalAnnualWin, breakdown: { [category]: { workingCap, stockout, freight } } }`. Reuse the `UNIT_PRICE`, `STOCKOUT_PENALTY_PER_UNIT`, and `FREIGHT_PER_ANOMALY` constants from `src/lib/queries/kpis.ts` so the dashboard and the planner never disagree.
3. Create `src/lib/queries/scenario-baseline.ts` → `getScenarioBaseline()` returns aggregated forecast stats by SKU category: `{ category, excessUnits, shortageUnits, anomalyCount, totalForecast }[]`. Wrap in `withCache("scenario-baseline:v1", 600, …)`.

**B. Page scaffold**

4. Add the route: `src/app/(app)/scenarios/page.tsx` — server component that fetches the baseline and renders `<ScenarioPlanner baseline={…} />`.
5. Create `src/components/scenarios/scenario-planner.tsx` as a client component — holds slider state and debounced recompute. No server round-trip per slider tick; all math runs client-side against the baseline passed in.
6. Add a sidebar nav entry "Scenarios" (lucide `TrendingUp` icon) pointing to `/scenarios`; active state on `pathname.startsWith("/scenarios")`.

**C. Controls (left column)**

7. Page header: "What-If: Forecast Accuracy" + one-line context explaining the page is a sandbox, not a prediction.
8. Slider — Forecast accuracy lift, 0% to 10%, step 0.5%, default +5%. Label shows today's baseline accuracy next to it (e.g., "You're at 84.3% today").
9. Slider — Carrying cost rate, 6% to 15%, step 1%, default 12%. Helper text: "The rate finance charges for holding excess inventory."
10. shadcn `Select` — Horizon, options 12 months / 24 months, default 12.
11. `Reset` button returns all controls to the proposal baseline (+5%, 12%, 12mo).

**D. Outcomes (right column)**

12. Build `<ScenarioOutcomeCard>` — shadcn `Card` with label, big number, delta pill vs baseline (i.e. vs the same scenario at 0% lift), one-line explainer.
13. Render four cards: Working Capital Freed, Stockout Risk Reduced, Expedited Freight Avoided, and Total Annual Win (the sum of the first three).
14. Stacked bar chart (shadcn `Chart`) below the cards: one bar per outcome, stacked by SKU category. Uses the `breakdown` field from `computeScenario`.
15. Plain-English summary line below the chart: "At +X% accuracy, Chemico frees $A in working capital, avoids $B in stockouts, cuts $C in freight. Total annual win: $D."

**E. Defensibility**

16. Collapsible "How we got these numbers" section at the bottom. Plain-English walk-through of the formulas — excess units × unit price × carrying cost → working capital; shortage units × penalty per unit → stockout risk; anomaly count × expedited-freight surcharge → freight. State that the lift scales all three proportionally.

**F. Polish**

17. Debounce the slider → recompute (50ms) so drag stays smooth.
18. Respect `prefers-reduced-motion` — no number-counter tweens; jump to the new value.
19. Loading state: Suspense + skeletons matching the final card dimensions.
20. Error boundary: if the baseline query fails, show "Couldn't load scenario baseline · Retry."
21. `pnpm tsc --noEmit`; smoke-test; push to GitHub.

### Acceptance

- `/scenarios` renders four outcome cards scaled by a live slider.
- Dragging the slider updates all four outcomes within 100ms with no layout shift.
- Reset returns controls to +5% / 12% / 12mo.
- Stacked bar shows SKU-category breakdown of the total win.
- The math explainer is visible and accurate — a CFO could reproduce the numbers on a napkin.
- Sidebar nav entry is active on `/scenarios`.
- `pnpm tsc --noEmit` passes.

---

## Iteration 7 — Site Map

**Goal:** a `/sites` page with a US map of all 50 sites colored by risk status, and a drill-down panel showing that site's customers, top SKUs by volume, and open reorder recommendations.

### Steps

**A. Deps + data**

1. Install the map stack in one command: `pnpm add leaflet react-leaflet @types/leaflet`.
2. Import Leaflet CSS once in `src/app/globals.css`: `@import "leaflet/dist/leaflet.css";`. No other Leaflet styling beyond marker colors.
3. Create `src/lib/queries/sites.ts`:
   - `getSiteSummaries()` → `{ id, name, city, state, lat, lng, worstStatus, customerCount, openRecCount, earliestStockout }[]`, wrapped in `withCache("sites:summaries:v1", 600, …)`.
   - `getSiteDetail(id)` → `{ site, customers, topSkus, recommendations }`, wrapped in `withCache("sites:detail:<id>:v1", 300, …)`.

**B. Page scaffold**

4. Add the route: `src/app/(app)/sites/page.tsx` — server component fetching summaries and rendering `<SiteMap summaries={…} />`.
5. Create `src/components/sites/site-map.tsx` as a client component (Leaflet requires `window`). Load via `next/dynamic` with `ssr: false` from the page so the map never renders server-side.
6. Add a sidebar nav entry "Network" (lucide `MapPin` icon) pointing to `/sites`.

**C. Map (left ~70%)**

7. Render a `MapContainer` centered on the US (`37, -96`) at zoom 4. Disable scroll-wheel zoom by default (enable on click-in) so the page doesn't hijack scroll.
8. For each site summary, render a `CircleMarker` with radius 8. Color by `worstStatus`: `chart-4` healthy, `chart-3` nearing, `chart-5` risk, `muted` unknown. Tooltip on hover shows the site name.
9. On marker click, set the active site id and open the side panel.
10. Legend card overlaid bottom-right of the map explaining the color mapping. Uses the same status labels as the dashboard recommendations table.

**D. Side panel (right ~30%)**

11. Default state (no site selected): scrollable list of sites sorted by urgency (risk > nearing > healthy). Each row shows the site name, city/state, status badge, open-rec count. Clicking a row selects the site and flies the map to that marker (`map.setView`).
12. Active-site state: fetch `getSiteDetail` client-side via a server action and render:
    - Site name + city/state + status badge
    - "Customers served" — comma-separated badges
    - "Top SKUs by open recommendations" — mini table (SKU code, category, open count)
    - "Open reorder recommendations" — compact list with status badge + projected stockout relative date
    - "Back to all sites" button
13. Show a skeleton while the detail fetch is in flight.

**E. Polish**

14. Filter bar above the list: shadcn `Select` by customer and by status. Filter affects both the list and the map (non-matching markers fade to 30% opacity).
15. Empty state (no summaries): plain card with "No sites available — seed the database."
16. Error boundary: map tile failures render "Couldn't render the network map — data is still available in the list on the right." List stays functional.
17. Keyboard navigation: arrow keys move focus through the list; `Enter` selects; `Escape` returns to the list view.
18. Respect `prefers-reduced-motion` on the `map.flyTo` — use `map.setView` instead.
19. `pnpm tsc --noEmit`; smoke-test; verify graceful behavior with the dev server offline so a tile CDN outage on demo day doesn't kill the page; push to GitHub.

### Acceptance

- `/sites` renders a US map with one colored marker per seeded site.
- Clicking a marker or a list row opens a detail panel with customers, top SKUs, and open recs.
- Status colors match the dashboard recommendations table.
- Filter bar updates both the map and the list.
- Tile failure falls back gracefully — list and detail panel still work.
- Keyboard traversal of the list works; focus is always visible.
- Sidebar nav entry is active on `/sites`.
- `pnpm tsc --noEmit` passes.

---

## After Phase 2

Return to iteration 5's **Polish & Deploy** checklist (`docs/iteration-plan.md`) and re-run steps 1–10 across all five surfaces (login, dashboard, chat, scenarios, sites) before the first Vercel deploy. The deploy step lands once for everything.
