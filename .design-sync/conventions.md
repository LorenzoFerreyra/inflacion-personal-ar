# Design conventions — Observatorio de Inflación AR

## Visual foundation

All components render on a **dark background**. Wrap every design in `bg-zinc-950` (the app root) or `bg-zinc-900` for card surfaces. Never place components on white or light backgrounds — the app has no light-mode.

## Color semantics

| Token family | Use |
|---|---|
| `text-amber-*` / `bg-amber-*/10` | Active state, current page highlight, primary accent |
| `text-green-*` / `bg-green-*/10` | Positive variation, completed step |
| `text-red-*` / `bg-red-*/10` | Alert, negative variation, high inflation |
| `text-zinc-*` | All neutral text; `zinc-50`=headings, `zinc-400`=body, `zinc-500`=muted, `zinc-600`=disabled |
| `border-zinc-800` | Default borders and dividers |

## Typography

- **Display headings / large values**: `font-display` (Fraunces, serif) — used in KpiCard values, section titles
- **Body text**: `font-sans` (DM Sans) — default for all labels, table cells, descriptions
- **Prices / numbers**: `font-mono tabular-nums` (DM Mono) — use for any monetary figure or percentage

## Layout and spacing

- Cards use `rounded-xl` corners and `p-6` padding
- Tables use `rounded-xl border border-zinc-800/40 bg-zinc-900/30`
- Form / interactive surfaces use `bg-zinc-900/30` with `border border-zinc-800/40`
- Component gaps: `gap-4` between stacked items, `gap-6` inside card padding

## Component usage notes

- **KpiCard**: `color="red"` for alert metrics (>15% variation), `color="green"` for stable/positive, `color="neutral"` (default) for informational
- **VariationBadge**: `variant="alert"` triggers amber at >10% and red at >25% — use for basket-level comparisons
- **ProductTable**: always wrap in a full-width container; the table is fixed-layout with 5 columns
- **PriceChart / ChainBarChart**: require explicit data arrays; both are responsive via Recharts `ResponsiveContainer`
- **Pagination**: returns `null` when `totalPages <= 1` — safe to always render
- **Stepper**: `currentStep` is 1-indexed; set to `steps.length + 1` to show all steps completed

## No provider needed

There is no React context provider required. All components are self-contained and accept only data props.

## Animations

- Loading spinner uses `animate-spin` (Tailwind built-in)
- Fade-in transitions: `animate-fade-in` (custom, defined in globals.css)
