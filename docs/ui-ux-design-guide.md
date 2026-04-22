# UI/UX Design Guide (Grid Systems + Modern Web Principles)

This document guides how we design UI in this repo so screens feel **intentional, readable, and consistent**. It is inspired by Josef Müller‑Brockmann's grid philosophy (structure, rhythm, hierarchy) and validated against current (2026) web UX practice: WCAG 2.2 AA, Tailwind v4 + shadcn/ui conventions, and the shift toward calm, purposeful motion.

Use this as the agent's default design standard unless the user explicitly requests a different style.

**Stack assumption**: Next.js (App Router) + Tailwind CSS v4 + shadcn/ui + Framer Motion (now published as the `motion` package) + optionally Lenis. Patterns translate to other stacks, but defaults here target that toolchain.

---

## Non-negotiables (defaults)

- **Use structure**: every page sits on a grid (even if subtle).
- **Use a spacing system**: never "eyeballed" padding/margins. 4px base, 8px rhythm.
- **Prefer clarity over cleverness**: copy, hierarchy, and flows should be instantly scannable.
- **Consistency beats novelty**: reuse patterns and components; avoid variant explosion.
- **Accessibility is a ship-blocker, not a polish task**: WCAG 2.2 AA is the baseline, not the stretch.
- **Motion is functional**: animation communicates state or continuity, never decoration.
- **Design for the three broken states**: loading, empty, and error are part of the design, not afterthoughts.

---

## Grid system (layout)

### Choose a grid per surface

- **App screens (dashboards, tools)**: 12-column grid with consistent gutters.
- **Marketing / landing pages**: 12-column or CSS Grid with named areas, aligned to the same rhythm.
- **Dense data (tables, admin)**: tighter columns allowed, but baseline spacing must stay on the system.

### Container + alignment rules

- Use a **centered container** for primary content regions. Max width should be intentional — commonly 1200–1440px for apps; narrower (640–768px) for reading surfaces.
- **Align edges**: headers, cards, tables, and section titles snap to the same vertical lines.
- **Fewer alignment lines wins**: too many competing edges creates visual noise.

### Baseline + spacing units

- **Base unit**: 4px (fine adjustments, icon alignment)
- **Primary rhythm**: 8px (most paddings/margins)
- **Section spacing**: 24–64px depending on density

**Rule**: spacing must be a multiple of 4px; in practice stick to **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64**. Numbers outside this set need a reason.

### Gutters and outer margins

- **Gutter**: 16–24px mobile, 24–32px desktop.
- **Outer margins**: minimum 16px mobile, 24–40px desktop.
- **Never edge-to-edge text**: respect readable measure (see Typography).

---

## Whitespace (margins, padding, density)

Whitespace is structure, not absence.

### Component spacing rules

- **Cards**: 16–24px outer padding, 8–16px between internal elements.
- **Forms**: 12–16px vertical spacing between fields; group related fields under a shared label or section title.
- **Tables / lists**: comfortable row height by default; subtle separators; avoid heavy gridlines unless data density demands them.

### Density ladder — pick one per page

- **Comfortable**: onboarding, settings, content reading, marketing.
- **Standard**: most app screens.
- **Compact**: dense admin/data views only.

**Rule**: don't mix densities within a single page. If one section needs to be compact and another comfortable, split them into separate screens or tabs.

---

## Visual hierarchy

- **One primary action per view** (or per card/section). Everything else is secondary or tertiary.
- Use **size, weight, position, and whitespace before color** to establish hierarchy. Color is the last lever, not the first.
- **Section headers** label the content below, sit on the vertical rhythm, and can host a small right-aligned action area.
- Prefer **progressive disclosure** over showing everything at once. Use accordions, tabs, or details elements for secondary content.
- **Rule of thumb**: a new user should identify the page's purpose and primary action within ~3 seconds.

---

## Typography (readability + rhythm)

### Readable measure

- **Long-form text**: ~45–80 characters per line (use `max-w-prose` or explicit `ch` units).
- **UI labels**: shorter is better; avoid wrapping labels if it harms scanning.

### Type scale

Use a small, consistent scale. Name tokens by role, not by pixel size:

- **Display / Page title**
- **Section title**
- **Body**
- **Small / helper**
- **Caption / overline** (optional, for metadata)

**Rule**: do not invent new font sizes to "make it look right" — fix hierarchy and spacing first. If a new size is truly needed, add it to the scale, don't inline it.

### Fluid typography (preferred for headings)

For display and heading sizes, prefer `clamp()` over hard breakpoints. This keeps type scaling smoothly from 360px screens to 1920px+ displays without jumps.

```css
/* Example — a single H1 token; use a generator (e.g. Utopia) for full scales */
--text-display: clamp(2rem, 1.6rem + 2vw, 3.5rem);
--text-h2: clamp(1.5rem, 1.3rem + 1vw, 2.25rem);
--text-body: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
```

Guidelines:

- Always use `rem`-based min/max so user font-size preferences still scale.
- Let each heading level have its own growth curve — H1 can scale dramatically, body should stay stable.
- Test at 200% browser zoom; text must remain usable.

### Line height and alignment

- **Body**: generous line height (1.5–1.65).
- **Headings**: tighter (1.1–1.25).
- **Dense data**: slightly tighter body, never cramped.
- **Left-align body text**. Never justify on the web — it creates rivers and hurts scanning.

---

## Copywriting (microcopy that clarifies and converts)

### Principles

- **Plain words over jargon** unless the user asked for it.
- **Specific over generic**: "Save changes" > "Submit".
- **Short**: remove filler.
- **One idea per sentence**.
- **Front-load meaning**: the first 3–5 words should signal intent.

### UI copy rules

- **Buttons**: verb + object ("Create invoice", "Add member", "Generate summary"). Avoid "OK" / "Yes" except in confirmations.
- **Empty states**: explain what this area is, what will appear here, and offer one primary action.
- **Errors**: say what happened, why (if known), and what to do next. No blame-y language.
- **Helper text**: concise constraints ("Max 50 characters").
- **Loading text** (for AI/RAG responses): avoid "thinking…" theatre. Prefer a subtle shimmer or status like "Searching your documents" with real signal.

### Tone

- Professional, calm, direct. Human, not corporate.
- Match personality to the product; avoid forced playfulness.

---

## Components (implementation constraints)

- **Default to shadcn/ui** primitives from `components/ui`. These are copy-paste components you own, not an npm abstraction — so customize locally when needed.
- **Compose, don't rebuild**. Build higher-level components by wrapping primitives with tokens and variants rather than authoring from scratch.
- Use **`class-variance-authority` (CVA)** for variants. Keep variants minimal and purposeful.
- Use **`cn()`** (tailwind-merge wrapper) for conditional class merging.
- **No ad-hoc styles**: no raw hex values, no one-off inline style objects for color/spacing. If something isn't tokenizable, it probably shouldn't exist yet.
- Prefer patterns:
  - **Cards** for grouped info
  - **Tabs** for peer views
  - **Accordions** for progressive disclosure
  - **Dialogs** for focused, short tasks (Radix traps focus automatically)
  - **Sonner** for toasts (shadcn has deprecated the older `toast` component)

### Tailwind v4 + shadcn specifics

- shadcn components now carry a `data-slot` attribute on every primitive — use it for precise styling hooks.
- Components no longer use `forwardRef` (React 19 pattern); don't add it back when wrapping.
- Buttons use the default cursor (no `cursor-pointer` override needed).
- The new project style is `new-york` (the old `default` style is deprecated).

---

## Color and contrast (accessibility-first)

- Color conveys **meaning**, not decoration.
- **Never rely on color alone** for status. Always pair with icon, label, or text (WCAG 1.4.1).
- Interactive states must all be clearly distinguishable: default, hover, focus-visible, active, disabled.
- Body text must meet **WCAG AA contrast** (4.5:1 for normal text, 3:1 for large text ≥18pt / 14pt bold). Run a contrast checker in CI if possible.

### Design tokens — CSS variables only

- Define color tokens as **CSS variables** in `app/globals.css` under `:root` and `.dark`.
- In Tailwind v4, expose them via the **`@theme inline`** directive so utilities like `bg-background` and `text-foreground` just work.
- Use **OKLCH** color values (shadcn's current default). OKLCH produces perceptually uniform colors and is non-breaking for existing HSL setups.
- **Never hardcode `#XXXXXX` or `rgb()`** in components. Always use semantic tokens (`background`, `foreground`, `primary`, `muted`, `destructive`, `ring`, etc.).

```css
/* Example — globals.css */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.82 0.17 86); /* Flighty-inspired yellow */
  --primary-foreground: oklch(0.145 0 0); /* near-black on yellow */
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ...etc */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
}
```

### 60 / 30 / 10 color rule

- **60% base** — neutral canvas (`background`, `foreground`)
- **30% support** — structural surfaces (`card`, `muted`, `secondary`, `border`, `input`, `sidebar-*`)
- **10% accent** — emphasis (`primary`, limited use of `accent` and `ring`)

### Accent choice

- **Accent / primary**: `#F6BD02` (Flighty-inspired) → authored as OKLCH in tokens.

### Accent constraints ("no yellow everywhere")

Use accent only for:

- Primary CTA buttons
- Selected nav items / active states
- Focus ring emphasis (sparingly)
- One highlight series in charts (others use neutral/support palette)

Never use accent as a large background surface.

### Accessibility note for a yellow primary

Keep `--primary-foreground` near-black in both themes. If a dark theme uses a lighter primary surface, re-check contrast — yellow + white is a common failure.

### Dark mode — don't just invert

- Use dark grays, not pure `#000`, for backgrounds. Use true black only for elevated surfaces (modals, popovers) to create depth.
- Desaturate bright brand colors slightly to avoid "eye bloom" on dark backgrounds.
- Verify contrast on both themes — the same color pair may pass in light and fail in dark.

---

## Forms (UX rules)

- **Labels are always visible** — never use placeholders as labels (fails WCAG 3.3.2 and breaks on autofill).
- **Validate intelligently**:
  - **On submit** for most fields
  - **On blur** for constraints where early feedback helps (email format, min length)
  - **Never on every keystroke** — it's hostile
- **Group related fields** with a clear section title.
- **Primary action is obvious**; secondary actions (Cancel, Reset) are less prominent and never styled like the primary.
- **Don't block paste** on password or OTP fields (WCAG 3.3.8 Accessible Authentication). Allow password managers, allow paste, support passkeys where possible.
- **Don't make users re-enter info** across multi-step flows (WCAG 3.3.7 Redundant Entry). Prefill or offer "Use previous".

---

## Accessibility — WCAG 2.2 AA baseline

WCAG 2.2 AA is the current legal and best-practice target (the EU Accessibility Act references it; it's ISO 40500:2025). The items below are the ones most often missed.

### New in WCAG 2.2 (audit these first)

- **2.4.11 Focus Not Obscured**: when an element receives keyboard focus, it must not be hidden by sticky headers, cookie banners, chat widgets, or floating toolbars. Account for this when designing sticky UI.
- **2.4.13 Focus Appearance**: the focus indicator must have a contrast ratio of at least 3:1 against the unfocused state, and its area must be at least as large as a 2px-thick perimeter around the component. **Never hide focus rings to "look cleaner."** If the default ring clashes, design a better one — don't remove it.
- **2.5.7 Dragging Movements**: any drag-based interaction must have a single-pointer alternative (click-to-reorder, up/down arrows, etc.). Applies to kanban boards, reorderable lists, sliders.
- **2.5.8 Target Size (Minimum)**: interactive targets must be at least **24×24 CSS px** (or have equivalent spacing around them). Dense icon toolbars are the common failure.
- **3.3.7 Redundant Entry**: don't make users re-type info they already provided in the same flow.
- **3.3.8 Accessible Authentication**: no cognitive puzzles required for login. Allow paste, allow password managers, support passkeys or email-link alternatives.

### Always-on requirements

- **Keyboard navigation works end-to-end** — tab order is logical, no keyboard traps, all interactive elements reachable.
- **Visible focus states** for every interactive element (see 2.4.13 above).
- **Semantic HTML** — use `<button>` for buttons, `<a>` for navigation. Don't `div`-everything.
- **Inputs have programmatic labels** (via `<label for>` or `aria-label`) with helpful error messages tied via `aria-describedby`.
- **Status messages** (form submission results, cart updates, RAG response completion) use `role="status"` or `role="alert"` so screen readers announce them without stealing focus.
- **Touch targets** meet the 24×24 minimum, ideally 44×44 on mobile primary actions.
- **Respect `prefers-reduced-motion`** (see Motion section).

### Testing

- Automated tools (axe DevTools, WAVE) catch ~30–57% of issues — necessary but not sufficient.
- Manually tab through every page. Test one flow with VoiceOver (macOS/iOS) or NVDA (Windows).
- Test at 200% browser zoom — text should not clip, overlap, or require horizontal scrolling.

---

## Motion & animation

Motion earns its place when it communicates:

- **Spatial/structural change** (a panel opened here, not there)
- **State** (loading → success)
- **Continuity** (something moved, it didn't teleport)

Decorative motion is noise. Remove it.

### Global motion rules

- **Micro-interactions**: ~150–250ms.
- **Section transitions**: ~250–400ms.
- **Page transitions**: ≤500ms.
- Use natural easing (`ease-out`, custom cubic-beziers). Avoid pure linear except for progress bars and skeletons.
- **Never animate layout in a way that causes content jumps**. Reserve space with skeletons.
- **Always respect `prefers-reduced-motion`** — disable or drastically shorten non-essential animation. This is both an accessibility requirement (WCAG 2.3.3) and a usability one.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Framer Motion (`motion` package) patterns

Use Motion for:

- Entering/leaving content blocks (stagger lists with `staggerChildren`)
- Expanding/collapsing panels (mind layout shift — use `AnimatePresence` with `mode="wait"` where needed)
- Subtle emphasis on state change (scale 1 → 1.02 on hover for cards)
- Scroll-linked effects (`useScroll` + `useTransform` — hardware-accelerated when animating `opacity` / `transform` / `filter`)

Default entrance pattern:

```ts
// opacity: 0 → 1, y: 8 → 0, duration ~0.3s, ease: [0.22, 1, 0.36, 1]
```

Reduced-motion handling:

```ts
const prefersReduced = useReducedMotion();
const variants = prefersReduced
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };
```

### Smooth scroll (Lenis)

Add Lenis only if it measurably improves the experience — most app screens don't need it. Marketing pages and scroll-storytelling benefit most.

If enabled:

- **Respect reduced motion**: initialize Lenis with `smooth: !prefersReduced`.
- **Test overlays/modals** — Lenis can leak scroll through dialogs; use Radix dialog's scroll-lock and test thoroughly.
- **Preserve native behaviors**: anchor links, keyboard (Space / Page Up/Down), focus-to-element on navigation must all still work.
- **Clean up on unmount** (`lenis.destroy()`) in Next.js — especially in SPAs to prevent memory leaks and scroll duplication between routes.
- **Known friction**: Lenis + Framer Motion scroll hooks can double-handle scroll. Wire them together via a single RAF loop (Lenis's `raf` method drives both) or use Motion's `useScroll` with `smoothProgress`.

---

## Loading, empty, and error states (required)

A design isn't finished without all three.

- **Loading**:
  - Use **skeletons** for structured content, matching final dimensions so layout doesn't shift.
  - Keep skeletons **subtle** — a shimmer sweep, not a disco.
  - For AI/RAG responses, stream tokens progressively rather than blocking on the full completion.
  - Consider **optimistic UI** for user-initiated state changes (toggle flips immediately, rolls back on error).
- **Empty**:
  - Explain what goes here, why it's empty right now, and offer one primary action to populate it.
  - No "No data" dead ends.
- **Error**:
  - Say what happened in plain language. Show recovery (retry, undo, contact) when possible.
  - Log technical detail for engineers behind a "Show details" toggle — don't dump stack traces on users.

---

## Navigation & information architecture

- Short, task-oriented nav labels.
- Group features by user mental model, not internal service boundaries.
- **Always show location**: active state + page title in the document `<title>`.
- Breadcrumbs only for deep hierarchies (≥3 levels).
- For AI products: keep the input always reachable. Users shouldn't have to scroll to ask their next question.

---

## Performance (UX is also how fast it feels)

A slow UI is a broken UI, no matter how pretty.

- **Server-first by default** (Next.js App Router, RSC). Send only the JS needed for interactivity.
- **Lazy-load below-the-fold** — images, heavy widgets, charts.
- **Use modern image formats** (WebP, AVIF) via `next/image`. Don't ship 5MB PNGs.
- **Prevent layout shift (CLS)**: reserve space for images and async content.
- **Stream AI responses** — don't make the user wait for the full generation. A token-by-token stream feels 10× faster than a 3-second spinner.
- **Target Core Web Vitals**: LCP < 2.5s, INP < 200ms, CLS < 0.1.

---

## AI-specific UI patterns (for RAG chats and agent UIs)

Since this stack leans AI-heavy, a few additional rules:

- **Show provenance**: RAG responses should link back to sources (document name, page/section). Users trust what they can verify.
- **Stream tokens**, don't block. Use Next.js streaming + `readableStream` from the SDK.
- **Make tool/function calls visible** — collapsed by default, expandable to show what the model did. Transparency builds trust.
- **Preserve chat history** with stable scroll: when new tokens stream in, the user's scroll position should stick unless they're at the bottom.
- **Handle cancellation** — users must be able to stop a generation mid-stream. Provide an obvious Stop button during streaming.
- **Rate limit feedback** is UI, not just a 429: show a friendly "Slow down — you're sending faster than the model can keep up" with a countdown.

---

## Design review checklist (quick pass before PR)

- [ ] **Grid**: major edges aligned? Consistent container/gutters?
- [ ] **Spacing**: all paddings/margins on the 4/8 system?
- [ ] **Hierarchy**: primary action obvious within ~3 seconds?
- [ ] **Typography**: one scale, fluid where appropriate, readable measure?
- [ ] **Color**: tokens only, no ad-hoc hex values, contrast passes AA?
- [ ] **Copy**: every sentence earns its place?
- [ ] **States**: loading / empty / error all designed?
- [ ] **Motion**: purposeful, short, respects `prefers-reduced-motion`?
- [ ] **Keyboard**: full navigation works, focus visible, no traps?
- [ ] **Targets**: all interactive elements ≥ 24×24 CSS px?
- [ ] **Dark mode**: both themes tested, contrast preserved?
- [ ] **Zoom**: usable at 200% browser zoom?
- [ ] **Performance**: no layout shift, images optimized, streaming where applicable?
