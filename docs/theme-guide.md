# Chemico Theme Guide

Design tokens for the Chemico Compliance & SDS Copilot. All tokens live in `src/app/globals.css` and are exposed through Tailwind v4's `@theme inline` block, so any `bg-*`, `text-*`, `border-*` utility referencing these names stays in sync with the source of truth.

---

## Brand Palette

| Role | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| Brand Blue | `#0071BC` | `oklch(0.52 0.15 240)` | Primary action, sidebar background, focus ring, chart-1 |
| Teal | `#00B2A9` | `oklch(0.67 0.12 187)` | Accent, sidebar highlight, chart-2 |
| Critical Red | `#DC2626` | `oklch(0.53 0.22 27)` | Destructive, compliance errors, chart-5 |
| Amber | — | `oklch(0.62 0.17 35)` | Warnings, chart-3 |
| Green | — | `oklch(0.53 0.15 145)` | Compliant/passing state, chart-4 |
| Near Black | `#111111` | `oklch(0.14 0 0)` | Body text |
| Light Gray | `#F4F4F4` | `oklch(0.96 0 0)` | Secondary/muted surfaces |
| White | `#FFFFFF` | `oklch(1 0 0)` | Background, cards, popovers |

---

## Semantic Tokens (Light Mode)

| Token | Value | Use |
| --- | --- | --- |
| `--background` | white | App background |
| `--foreground` | near-black | Default text |
| `--card` / `--popover` | white | Elevated surfaces |
| `--primary` | Brand Blue | Primary buttons, links |
| `--primary-foreground` | white | Text on primary |
| `--secondary` / `--muted` | Light Gray | Subdued surfaces |
| `--muted-foreground` | mid-gray (`oklch(0.50 0 0)`) | Secondary text |
| `--accent` | Teal | Highlights, accents |
| `--destructive` | Critical Red | Errors, delete |
| `--border` / `--input` | `oklch(0.91 0 0)` | Hairlines, inputs |
| `--ring` | Brand Blue | Focus ring |

### Sidebar (dedicated scope)

The sidebar is branded — it is **not** the default surface color.

| Token | Value |
| --- | --- |
| `--sidebar` | Brand Blue |
| `--sidebar-foreground` | white |
| `--sidebar-primary` | Teal |
| `--sidebar-accent` | Darker blue `oklch(0.44 0.14 240)` (hover/active rows) |
| `--sidebar-border` | `oklch(0.45 0.13 240)` |
| `--sidebar-ring` | Teal |

### Charts

`--chart-1` → `--chart-5` map to Brand Blue, Teal, Amber, Green, Red — optimized for a compliance dashboard where red/amber/green carry status meaning. Avoid reassigning them in feature code.

---

## Dark Mode

Dark mode uses a neutral grayscale and does **not** retain the blue brand sidebar — sidebar becomes `oklch(0.205 0 0)`. Primary flips to near-white on dark card. Use `.dark` class on the root; the custom variant is `@custom-variant dark (&:is(.dark *))`.

---

## Radius Scale

Base is `--radius: 0.5rem` (8px). Derived scale:

| Token | Multiplier | ≈ |
| --- | --- | --- |
| `--radius-sm` | ×0.6 | 4.8px |
| `--radius-md` | ×0.8 | 6.4px |
| `--radius-lg` | ×1.0 | 8px |
| `--radius-xl` | ×1.4 | 11.2px |
| `--radius-2xl` | ×1.8 | 14.4px |
| `--radius-3xl` | ×2.2 | 17.6px |
| `--radius-4xl` | ×2.6 | 20.8px |

---

## Typography

| Token | Family | Source |
| --- | --- | --- |
| `--font-sans` | **Inter** (variable) | `next/font/google` in `src/app/layout.tsx` |
| `--font-heading` | Inter (aliased to sans) | — |
| `--font-mono` | Geist Mono | `--font-geist-mono` |

`html` applies `font-sans` globally; headings inherit unless overridden.

Plugin: `@tailwindcss/typography` is enabled — use `prose` classes for long-form content (SDS text, copilot responses).

---

## Usage Rules

1. **Components come from shadcn/ui.** Do not hand-roll primitives. If a component is missing, consult before building.
2. **Never hardcode hex values** in component code. Reference tokens via Tailwind utilities (`bg-primary`, `text-destructive`, `border-sidebar-border`, etc.).
3. **Sidebar tokens stay scoped to the sidebar.** Don't reuse `--sidebar-*` for general UI — it carries brand-blue semantics.
4. **Status colors for compliance**: green = compliant, amber = attention, red = non-compliant/expired. Prefer `chart-4 / chart-3 / chart-5` or `accent / destructive` over arbitrary Tailwind colors so dark mode stays consistent.
5. **Focus states** use `--ring` (Brand Blue) — do not override per-component.

---

## Quick Reference — Tailwind Classes

```tsx
// Surfaces
<div className="bg-background text-foreground" />
<Card className="bg-card text-card-foreground" />

// Actions
<Button className="bg-primary text-primary-foreground" />
<Button variant="destructive" />          // uses --destructive
<Badge className="bg-accent text-accent-foreground" />

// Sidebar
<aside className="bg-sidebar text-sidebar-foreground border-sidebar-border" />

// Text hierarchy
<p className="text-foreground" />
<p className="text-muted-foreground" />   // secondary

// Borders / focus
<input className="border-input focus-visible:ring-ring" />
```

Source of truth: `src/app/globals.css`.
