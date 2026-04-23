# CMIS Forecast

Demand forecasting and inventory optimization mockup for **The Chemico Group**, corresponding to Solution #01 of Zaigo's AI strategy proposal. Covers the proposal's four dimensions — customer, plant, SKU, season — on a single ops dashboard, with an **Ask CMIS** chat copilot that answers CFO-style questions against the same data.

- **Stack**: Next.js 16 (App Router, Turbopack, React 19), Tailwind v4, shadcn/ui (Radix + Nova), Supabase (Postgres + Auth + RLS), Upstash Redis, Vercel AI SDK + OpenAI `gpt-4o-mini`.
- **Scope**: mockup with deterministic seeded data. Single demo login. Light theme only.
- **Out of scope**: PDF ingestion (Solution #02), real forecasting model, multi-tenant auth.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in real values
pnpm seed                    # populate Supabase with deterministic mock data
pnpm dev                     # http://localhost:3000
```

### Required environment

See `.env.example`. You need a Supabase project, an Upstash Redis database, and an OpenAI key.

### Demo credentials

One account seeded in Supabase Auth. Ask the project owner for the demo email and password.

## What's in the build

- `/login` — split-screen sign-in, email + password against Supabase Auth.
- `/` — the forecasting dashboard: KPI row, forecast-vs-actual chart with dimension / timeline / seasonal toggles, reorder recommendations table.
- `/chat` — Ask CMIS workspace with thread history and streaming tool-backed answers.

## Project layout

```
src/
  app/
    (app)/              auth-protected shell (sidebar + main)
      page.tsx          dashboard
      chat/page.tsx     Ask CMIS workspace
      error.tsx         page-level error boundary
    api/chat/route.ts   tool-backed streaming endpoint
    login/              sign-in page + server action
  components/
    dashboard/          KPI row, forecast chart, reorder table
    chat/               workspace, thread list, message, composer
    layout/             server + client sidebar pair
    ui/                 shadcn primitives (do not hand-edit)
  lib/
    queries/            cached Supabase reads via withCache
    chat/               chat tools, session helpers
    supabase/           server, client, middleware wrappers
    redis.ts            Upstash client + withCache helper
scripts/
  seed.ts               deterministic mock data generator
docs/
  PRD.md                product requirements
  iteration-plan.md     five-iteration build plan
  theme-guide.md        Chemico tokens
```

## Reference docs

- `docs/PRD.md` — product requirements
- `docs/iteration-plan.md` — step-by-step build plan
- `docs/theme-guide.md` — brand tokens
- `docs/ui-ux-design-guide.md` — layout + interaction rules

## Deploy

Deployed to Vercel (`iad1` region). Configure every key from `.env.example` in the Vercel project. Seed the database once before first use.
