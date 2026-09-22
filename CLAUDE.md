# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack) at http://localhost:3000
npm run build    # production build (also type-checks)
npm run start    # serve the production build
npm run lint     # eslint (flat config: eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit # type-check only, without a full build
```

There is no test suite configured in this repo (no test runner in `package.json`).

## Architecture

This is a Next.js App Router project (TypeScript, Tailwind v4) with two routes:

- `src/app/page.tsx` — landing page (default create-next-app content plus a link to `/estimate`).
- `src/app/estimate/page.tsx` — thin wrapper that renders `MaterialEstimateForm`.

### `src/components/MaterialEstimateForm.tsx`

Nearly all product logic lives in this single large client component (`"use client"`). There is no backend — everything is derived client-side from one `useState` tree.

- **`CATEGORIES`**: a static config array of the four material categories (`wood`, `tile`, `wallpaper`, `paint`), each with a fixed list of `MaterialItem`s (id, name, spec, unit, default coverage `㎡`/unit). Category and item `id`s are load-bearing — they're referenced by string throughout (e.g. `"tile_wall"`, `"paint_ceiling"`, `"paper_ceiling"`), not by index.
- **Per-surface area split**: each category tracks wall/ceiling/floor area as *separate* fields on `CategoryState` (e.g. `tileWallArea`/`tileFloorArea`, `wallpaperCeilingArea`/`wallpaperWallArea`, `paintWallArea`/`paintCeilingArea`, `woodWallArea`/`woodCeilingArea`) rather than one shared `area`. `getItemArea(config, cat, itemId)` is the single place that maps an item id to the area it should use — surface-specific items (e.g. `tile_wall`) use their own area; shared/prep items (e.g. `adhesive`, `grout`, `glue`, `lining`, `putty`, `sandpaper`) use the combined (summed) area. When adding a new per-surface split, extend this function rather than reading area fields elsewhere.
- **Coverage/size inputs**: `coverages` is a per-item `Record<string, number>` (㎡ consumed per unit). For wallpaper, `computeRollCoverage(widthMm, lengthM)` derives it from roll width/length inputs (tracked separately per surface: `ceilingRollWidth/Length`, `wallRollWidth/Length`); for tile, `computeTileCoverage(widthMm, heightMm)` derives it from per-surface tile dimensions. Editing a size input recomputes and overwrites the matching entry in `coverages`; the coverage number itself can also be edited directly afterward.
- **Custom items**: users can add/remove extra rows per category (`customItems`, `addCustomItem`/`removeCustomItem`/`updateCustomItemField`). Custom items get entries in `coverages`, `units`, and `prices` keyed by a generated id (`custom-N`).
- **Quantity formula**: `computeQuantity(area, lossRatePercent, coverage, multiplier)` = `ceil(area * (1 + lossRate/100) * multiplier / coverage)`. `multiplier` is `cat.coatCount` for items with `usesCoatCount` (paint), otherwise `1`. Loss rate applies to material quantity but is *not* applied to labor cost.
- **Pricing/totals**: each item has a `price` (`prices` record) and derived `amount = quantity * price`, computed in the `results` `useMemo`. `categoryTotals` sums each category's item amounts (plus `wallpaperLaborCost` for the wallpaper category — labor is `(ceilingArea + wallArea) * wallpaperLaborRate`, deliberately excluding loss rate). `grandTotal` sums `categoryTotals` across all four categories.
- **"Quick fill" (`빠른 입력`)**: `applyGlobalArea` fans one global number out to every category's area field(s) — for split categories it sets *both* surfaces to the same value as a starting point, not a 50/50 split.
- Currency/number formatting goes through `formatNumber` (`toLocaleString("ko-KR", ...)`); all inputs and labels are Korean.

When extending a category (new material, new split surface, new per-surface attribute like model name or box size), follow the existing pattern: add the state fields to `CategoryState`, initialize them in `initialCategoryState`, wire them into `getItemArea`/`results` as needed, and add the corresponding controls in the JSX for that `config.id`.
