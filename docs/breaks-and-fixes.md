# Breaks & Fixes — Aria / Chemico Dev Log

A full record of every significant bug, breakage, and fix from project start to present. Ordered chronologically by iteration.

---

## Iteration 1 — Foundation & Shell (Apr 15)

### 1.1 Next.js 16 Breaking Changes vs Training Data

**Symptom**
Several Next.js patterns from common tutorials and AI suggestions didn't work — different file conventions, deprecated APIs, and changed routing behavior compared to Next.js 13/14.

**Root Cause**
Next.js 16 introduced breaking changes to the App Router, metadata API, and layout conventions. Most available documentation and AI training data still reflects older versions.

**Fix**
Read `node_modules/next/dist/docs/` directly before writing any Next.js-specific code. The local package docs are always version-accurate.

**Good Practice**
> The `AGENTS.md` rule exists for this reason: *"Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."* Never assume framework behavior based on training data alone — always check the installed version's own docs.

---

## Iteration 2 — Supabase + Auth (Apr 17)

### 2.1 AI Provider Switch — Anthropic to OpenAI

**Symptom**
Initial implementation used Anthropic Claude API. Mid-iteration, the decision was made to switch to OpenAI `gpt-4o-mini`.

**Root Cause**
Functional requirement change — OpenAI's streaming API and embedding models (`text-embedding-3-small`) were a better fit for the RAG pipeline and cost model.

**Fix**
Replaced `anthropic` SDK with `openai` SDK. Rewrote the chat completion and embedding calls. Updated `.env.local` with OpenAI keys.

**Good Practice**
> Lock down your AI provider decision before building the chat layer. Switching mid-build forces rewrites of the API route, client hook, and message format. The message shape (`role: user/assistant`) is compatible between providers, but streaming and error handling differ significantly.

---

### 2.2 RLS Policies — DELETE Never Added

**Symptom**
(Discovered much later in iteration 8) Deleting chat sessions silently failed — no error returned, no rows deleted.

**Root Cause**
During initial schema setup, RLS policies were added for SELECT and INSERT only. DELETE was never included. Supabase returns `null` for `error` on a RLS-blocked DELETE — it never throws.

**Fix**
Added DELETE policies via Supabase MCP:
```sql
CREATE POLICY "public_delete_chat_sessions" ON chat_sessions FOR DELETE USING (true);
CREATE POLICY "public_delete_chat_messages" ON chat_messages FOR DELETE USING (true);
```

**Good Practice**
> When writing RLS policies, always add all four: SELECT, INSERT, UPDATE, DELETE — even if you don't need them all immediately. A missing DELETE policy is invisible until someone tries to delete something.

---

## Iterations 3–5 — Dashboard, Copilot, Documents, RAG (Apr 17–19)

### 3.1 Routes Unprotected — Auth Middleware Added Late

**Symptom**
All `(protected)` routes were accessible without login during early development.

**Root Cause**
Auth middleware was deferred to a later iteration. The middleware file was added in iterations 4–5 after the core pages were built.

**Fix**
Added cookie-based auth middleware (`middleware.ts`) that reads the Supabase session cookie and redirects unauthenticated users to `/login` for all routes under `/(protected)/`.

**Good Practice**
> Add auth middleware in iteration 1, even as a stub. Retrofitting auth into a built app is more work than wiring it from the start, and it's easy to forget a route.

---

### 3.2 Map Component — SSR Crash

**Symptom**
The Leaflet-based sites map crashed during server-side rendering with errors referencing `window` and `document` not being defined.

**Root Cause**
Leaflet accesses browser globals (`window`, `document`) at import time. Next.js App Router attempts to server-render all components by default.

**Fix**
Wrapped the map component in `dynamic()` with `{ ssr: false }`:
```ts
const SitesMapDynamic = dynamic(() => import("./sites-map"), { ssr: false })
```

**Good Practice**
> Any library that accesses `window`, `document`, or `navigator` at import time will crash SSR. Use `dynamic(() => import(...), { ssr: false })` for maps, canvas libraries, and browser-specific UI. Don't add `"use client"` alone — that doesn't prevent SSR, it only enables client hooks.

---

### 3.3 Chat Session Not Persisting Across Navigation

**Symptom**
Navigating away from the Copilot page and coming back started a fresh chat session — the previous conversation was lost.

**Root Cause**
The active session ID was held in React state, which resets on component unmount. Every time the Copilot route unmounted, the session was gone.

**Fix**
Persisted the active session ID to `sessionStorage` on every session change, and restored it on mount:
```ts
useEffect(() => {
  if (sessionId) sessionStorage.setItem(STORAGE_KEY, sessionId)
}, [sessionId])
```

**Good Practice**
> React state doesn't survive route changes in Next.js App Router (components unmount fully). For anything that should survive navigation within a session — selected tab, active ID, scroll position — use `sessionStorage` (tab-scoped) or `localStorage` (persistent).

---

### 3.4 Filter Dropdowns Showing Empty Options

**Symptom**
Document type and site filter dropdowns showed entries with zero matching documents, making the filter feel broken.

**Root Cause**
Dropdown options were generated from a static list, not filtered against actual document counts in the database.

**Fix**
Added `getDocumentCounts()` query that pre-aggregates counts by type, site, and status. Filter dropdowns only render options where `counts.byType[value] > 0`. Sites are split into "has docs" and "no docs" groups with a separator.

**Good Practice**
> Never show filter options that return zero results — it breaks user trust in the filter. Always join filter options against actual data counts at query time.

---

## Iteration 6 — Sites Page (Apr 20)

### 6.1 Map Pins Not Rendering on Leaflet Custom Icons

**Symptom**
Custom SVG map pins weren't appearing, or Leaflet's default icon was broken (missing icon images).

**Root Cause**
Leaflet's default icon path resolution breaks in webpack/Next.js bundled environments because it tries to resolve icon assets relative to the module file, not the public directory.

**Fix**
Defined custom `L.divIcon` using inline SVG strings instead of relying on Leaflet's default `L.icon` with file paths. No external assets needed.

**Good Practice**
> In Next.js, never rely on a library's default asset resolution for files outside the `public/` directory. Use inline SVG or data URIs for map icons and similar assets to avoid broken paths in production builds.

---

## Iteration 7 — Polish Pass (Apr 21)

### 7.1 Sidebar Collapse Animation Broken

**Symptom**
Sidebar collapse/expand was jarring — content snapped instead of animating, or the icon-only collapsed state had layout issues.

**Root Cause**
The collapsed state was being handled via JS-toggled classes, which caused a flash of wrong content during the transition.

**Fix**
Switched to a CSS-only approach using `group-data-[state=collapsed]` Tailwind variants. The sidebar's data attribute is set by the provider and CSS handles all visual transitions at 150ms, no JS timing needed.

**Good Practice**
> For layout animations controlled by a parent state, prefer CSS data-attribute variants over JS class toggling. CSS transitions are synchronous with rendering; JS class changes can arrive one frame late, causing a flash.

---

### 7.2 Navigation Lag on Paginated Tables

**Symptom**
Clicking next/prev page on Dashboard alerts table and Sites table caused a 400–1000ms delay before content updated.

**Root Cause**
Pagination used `router.push()` with URL search params, triggering a full Next.js server component re-render and a new Supabase query on every page click.

**Fix**
Converted both tables to client-side pagination: all data loaded once from the server, sliced in `useMemo` on the client. `useState` manages the current page. Zero network requests on page change.

**Good Practice**
> For datasets that fit in memory (< a few thousand rows), client-side pagination is always faster than server-side. Reserve URL-based pagination for very large datasets. The pattern: server fetches all, client component slices.

---

### 7.3 Table Layout Jump on Last Page

**Symptom**
When reaching the last page of a paginated table (fewer rows than page size), the table shrank and the pagination buttons jumped upward.

**Root Cause**
Empty slots had no rendered content, so table rows collapsed to minimal height.

**Fix**
Added ghost pad rows with `invisible` content mirroring the real row structure:
```tsx
{Array.from({ length: Math.max(0, PAGE_SIZE - rows.length) }).map((_, i) => (
  <TableRow key={`pad-${i}`} className="pointer-events-none" aria-hidden="true">
    <TableCell><p className="font-medium text-sm invisible">x</p></TableCell>
    <TableCell colSpan={N} />
  </TableRow>
))}
```

**Good Practice**
> `visibility: hidden` (Tailwind: `invisible`) preserves layout space; `display: none` collapses it. Always mirror the DOM structure of real rows in ghost rows — don't use `min-height` on the container, because it doesn't account for variable cell content heights across row types.

---

### 7.4 Copilot Starting Fresh Chat on Every Page Load

**Symptom**
Every time the Copilot page loaded, it started a new empty chat even if the user had an active conversation.

**Root Cause**
No session restoration logic — the component always initialized with empty state.

**Fix**
On mount, read the saved session ID from `sessionStorage`. If found, load the session's messages from Supabase and restore the conversation. A module-level `hasInitialized` flag prevents the restore from running on the very first load of a new browser session.

---

### 7.5 Chart Lag During Sidebar Toggle

**Symptom**
Recharts `ResponsiveContainer` components caused visible lag when toggling the sidebar open/closed, as charts tried to recalculate their width on every resize event.

**Root Cause**
`ResizeObserver` fires continuously during CSS transitions. Without debouncing, charts re-rendered dozens of times per toggle.

**Fix**
Added a debounce (100–150ms) to chart resize handlers so they only recalculate once the transition settles.

**Good Practice**
> Any component that uses `ResizeObserver` or listens to window resize should debounce its handler. CSS transitions generate a continuous stream of resize events — debouncing prevents unnecessary re-renders during animations.

---

## Post-Iteration 7 — Infrastructure (Apr 21)

### 8.1 Supabase Load — Redis Caching Added

**Symptom**
Every page load hit Supabase for the same largely-static data (document list, site list, filter counts), adding latency and burning database quota.

**Root Cause**
No caching layer — every server render called Supabase directly.

**Fix**
Added Upstash Redis via `@upstash/redis`. Wrapped expensive, rarely-changing queries (`getDocumentList`, `getSitesForFilter`, `getDocumentCounts`) with a `withCache(key, TTL, fn)` helper.

**Good Practice**
> Cache data that changes infrequently at the query level, not the component level. A Redis TTL of 5–30 minutes is appropriate for reference data like site lists and document counts. Don't cache user-specific or real-time data.

---

### 8.2 Vercel Deployment — Region Routing Failures

**Symptom**
Deployed app on Vercel had high latency or timeout errors depending on region. Multiple region config changes were needed.

**Root Cause**
Initial deployment targeted Singapore (`sin1`) + Sydney (`syd1`) for SEA users, but the Supabase instance and OpenAI calls routed through US East, causing cross-region latency and occasional timeouts on the 300s max duration limit.

**Fix**
Iterated through region configs:
1. First tried `sin1` + `syd1` (too far from data sources)
2. Dropped Sydney, kept Singapore
3. Final fix: changed to `iad1` (US East) to co-locate with Supabase

**Good Practice**
> Deploy your Vercel functions to the same region as your database. Cross-region database calls add 100–300ms per query and can push streaming routes over their timeout budget. Check your Supabase project region in the dashboard and match it in `vercel.json`.

---

### 8.3 Hydration Error After Text Rename

**Symptom**
React hydration mismatch on load — server rendered "The Chemico Group", client rendered "Chemico Group". Only appeared locally; worked on Vercel and in incognito.

**Root Cause**
Stale `.next` compiled JS chunks cached in the browser from before the text was changed. Turbopack uses path-based chunk names — the browser's HTTP cache served the old chunk even after a fresh compile.

**Fix**
1. Delete `.next`: `Remove-Item -Recurse -Force .next`
2. Hard refresh browser: **Ctrl+Shift+R**
3. Restart dev server

**Good Practice**
> "Works on Vercel, broken locally" almost always means stale `.next` or browser HTTP cache. Vercel always deploys fresh; your local browser caches chunks by name. Hard refresh first, delete `.next` second. Never debug a hydration error without ruling out cache first.

---

## Iteration 8 — Copilot Enhancements & Thread Management (Apr 22)

### 9.1 Follow-Up Chips Not Sending

**Symptom**
Clicking AI follow-up question chips did nothing — no message was sent.

**Root Cause**
Chips were rendered inside `MessageList` with an `onFollowUp` prop. There was an async timing gap between `setStreamingContent(null)` and `setIsLoading(false)` (during `saveMessage`). Chips appeared while `isLoading` was still `true`, so the stale closure inside the prop chain bailed early.

**Fix**
Lifted follow-up chip rendering to `chat-shell.tsx` where `handleSend` is defined. Chips call `handleSend` directly — no prop chain, no stale closure.

**Good Practice**
> When a callback "doesn't do anything," suspect stale closures before debugging the handler. The further a callback travels down a prop chain, the more likely it captures stale state from a previous render. Lift rendering closer to where the handler lives.

---

### 9.2 Nested `<button>` Error — base-ui DropdownMenu

**Symptom**
Browser console error: "A button cannot appear as a descendant of a button." The three-dot thread menu caused a nested button in the DOM.

**Root Cause**
`DropdownMenuTrigger` from `@base-ui/react/menu` internally forces `asChild={true}`, merging its button wrapper with whatever child element is passed. When the child was already a `<button>`, the result was `<button><button>`. The `asChild` prop is not publicly exposed in this version.

**Fix**
Dropped base-ui `DropdownMenu` entirely. Replaced with a plain `<button>` (three-dot icon) + absolutely positioned `<div>` dropdown. Used `document.addEventListener("click")` inside a `useEffect` for outside-click dismissal.

**Good Practice**
> When a framework component creates an unavoidable constraint (hidden `asChild`, forced wrappers), don't try to fight it — replace it with a minimal custom implementation. A plain div + absolute positioning is always more predictable than a misconfigured component.

---

### 9.3 Thread Delete Dialog Button Not Firing

**Symptom**
Clicking "Remove" in the confirmation dialog did nothing. No error in console, no logs.

**Root Cause**
base-ui's `Dialog.Backdrop` uses `outsidePressEvent: 'intentional'` (fires on `mousedown`). This caused the dismiss handler to evaluate on every `mousedown` within the dialog area, occasionally closing the dialog before the `click` event fired, leaving `confirmSession` as `null` by the time the handler ran.

**Fix**
Replaced the plain `<Button onClick={...}>` with `<DialogClose render={<Button />} onClick={...}>`. base-ui's own `Close` primitive handles the click-close chain correctly — `onClick` fires before state resets.

**Good Practice**
> Inside base-ui dialogs, always use `DialogClose` (or `AlertDialog.Close`) for action buttons that also dismiss. Plain buttons inside a modal are vulnerable to the modal's own dismiss-on-mousedown behavior. The library's own Close primitive is designed to handle this ordering correctly.

---

### 9.4 Thread Delete Silently Failing (RLS)

**Symptom**
After fixing the dialog button, the delete still didn't work — session remained in the list with no error.

**Root Cause**
`chat_sessions` and `chat_messages` had SELECT and INSERT RLS policies but no DELETE policies. Supabase returns `null` for `error` on a RLS-blocked DELETE — it silently deletes zero rows.

**Fix**
Added DELETE policies via Supabase MCP:
```sql
CREATE POLICY "public_delete_chat_sessions" ON chat_sessions FOR DELETE USING (true);
CREATE POLICY "public_delete_chat_messages" ON chat_messages FOR DELETE USING (true);
```

**Good Practice**
> When a write operation "succeeds" (no error) but nothing changes in the UI, check RLS before debugging the front end. Always verify all four CRUD policies exist. Supabase's silent DELETE behavior is the most common source of "it worked but nothing happened" bugs.

---

### 9.5 Stale Turbopack Chunk After Component Rewrite

**Symptom**
After rewriting `document-table.tsx` to remove the `result` prop, the compiled JS still destructured `result.data` — runtime TypeError even after clearing `.next` and restarting the dev server.

**Root Cause**
Turbopack's chunk name (`src_0q1ks4m._.js`) didn't change between builds because it's based on file paths, not content. The browser's HTTP cache served the old chunk.

**Fix**
Hard refresh (**Ctrl+Shift+R**) to force the browser to re-fetch all chunks.

**Good Practice**
> Deleting `.next` clears the server-side compile cache but not the browser's HTTP cache. After any significant component refactor, always do a hard refresh. The two caches are independent.

---

## Iteration 9 — Client-Side Document Pagination (Apr 22)

### 10.1 Document Filter/Page Changes Causing Full Server Re-renders

**Symptom**
Every filter change or page click on the Documents page caused a 400–1000ms delay.

**Root Cause**
`DocumentFilters` used `router.push()` with URL search params for every filter change. `PaginationControl` did the same for page changes. Each click triggered a Next.js server component re-render + new Supabase query.

**Fix**
Fetched all documents once (`getAllDocuments()`), passed to `DocumentsShell` client component. Filtering and pagination handled via `useMemo` + `useState`. No server round-trips on interaction.

---

### 10.2 TypeScript Error — `string | null` in Select `onValueChange`

**Symptom**
`tsc --noEmit` failed: *Type `string | null` is not assignable to type `string`* on all three Select components in `DocumentFilters`.

**Root Cause**
base-ui's `Select.Root` `onValueChange` signature is `(value: string | null, eventDetails) => void`. Callback props were typed as `(value: string) => void`.

**Fix**
Wrapped each handler with null coalescing:
```tsx
onValueChange={(v) => onTypeChange(v ?? "all")}
```

**Good Practice**
> Always run `tsc --noEmit` before pushing to Vercel. base-ui frequently uses `T | null` where Radix UI uses `T`. Check component prop signatures when working with base-ui — don't assume they match Radix conventions.

---

### 10.3 Extra Brace Syntax Error in API Route

**Symptom**
Chat API route threw a syntax error after an edit, breaking the entire Copilot feature.

**Root Cause**
A partial edit left a stray `}` brace that didn't close any block.

**Fix**
Full rewrite of the file from scratch to ensure correct brace matching.

**Good Practice**
> After any edit to a file with deeply nested async blocks (API routes, server actions), verify brace balance. In Next.js dev mode, a syntax error in a route file silently kills that endpoint — no build error, just a runtime crash.

---

## Summary Table

| # | Area | Type | Fix Strategy |
|---|------|------|--------------|
| 1.1 | Next.js 16 | Breaking change | Read local package docs |
| 2.1 | AI provider | Requirement change | Swap SDK + update env |
| 2.2 | Supabase RLS | Missing policy | Add DELETE policies |
| 3.1 | Auth | Missing middleware | Add middleware early |
| 3.2 | Leaflet SSR | SSR crash | `dynamic({ ssr: false })` |
| 3.3 | Chat sessions | State loss on nav | `sessionStorage` persistence |
| 3.4 | Filter dropdowns | Bad UX | Filter options by count |
| 6.1 | Map icons | Asset resolution | Inline SVG `divIcon` |
| 7.1 | Sidebar animation | JS timing | CSS-only data-attribute |
| 7.2 | Table pagination | Server latency | Client-side slice |
| 7.3 | Table layout jump | Empty rows | Invisible ghost rows |
| 7.4 | Copilot session | No restore | sessionStorage + mount read |
| 7.5 | Chart lag | Resize flood | Debounce handler |
| 8.1 | Supabase load | No caching | Upstash Redis TTL |
| 8.2 | Vercel region | Cross-region latency | Match DB region (`iad1`) |
| 8.3 | Hydration mismatch | Stale `.next` cache | Delete `.next` + hard refresh |
| 9.1 | Follow-up chips | Stale closure | Lift to parent component |
| 9.2 | Nested button | base-ui quirk | Custom plain button |
| 9.3 | Dialog button | base-ui mousedown | Use `DialogClose` |
| 9.4 | Thread delete | Missing RLS DELETE | Add Supabase policy |
| 9.5 | Stale chunk | Browser HTTP cache | Hard refresh |
| 10.1 | Docs pagination | URL-based nav | Client-side state |
| 10.2 | TS type error | `string \| null` mismatch | Null coalesce `?? "all"` |
| 10.3 | Route syntax error | Stray brace | Full file rewrite |
