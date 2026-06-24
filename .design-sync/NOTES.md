# Sync notes — inflacion-personal-ar

## Setup
- Next.js app synced in synth-entry mode (no dist/) — components discovered from `src/components/`.
- Next.js deps stubbed via `.design-sync/stubs/` wired through `.design-sync/tsconfig.sync.json`.
- CSS: Tailwind v4 compiled from `src/app/globals.css`.
- Fonts: DM Sans, DM Mono, Fraunces — loaded via Next.js font optimization; not shipped in bundle.
- 5 components excluded: Navigation (router + live context), ProductDetail (live fetch), BranchMap/BranchMapLoader (Leaflet SSR), DataFlowDiagram (one-off infographic).

## Re-sync risks
- Tailwind CSS must be re-compiled on re-sync if new utility classes are added to components (`npx tailwindcss -i src/app/globals.css -o <cssEntry-path>`).
- Stub files in `.design-sync/stubs/` must match the Next.js API surface; update if next/image or next/link API changes.
- `@/lib/chainColors` and `@/lib/constants` are bundled directly from source; if they change, re-sync.
- `PeriodContext` is excluded along with `Navigation`; if any included component later imports it, re-evaluate.
