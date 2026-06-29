# Formwrk — Material Planning Tool

A browser-based **material planning and configuration tool** for Australian concrete-formwork
shoring assemblies. Enter a slab height (floor-to-soffit) and slab thickness; the tool
illustrates the components, assembles the stack in a 3D viewport, and shows the bill of
materials alongside the serviceable min/max height range.

Built around steel shoring frames with LVL timber members.

> ⚠️ **This is a material planning and configuration tool only.** Temporary engineering
> designs and inspections, in accordance with local Standards and guidelines, are required
> prior to erecting any formwork.

## Source of truth

All height logic is a faithful reproduction of `Formwork_Material_Selection_v2.xlsx`
(sheet *Mat. Selection (Draft)*). That spreadsheet is **non-negotiable** — the unit tests
assert the engine reproduces every min/max value in it (27 thin-slab + 21 thick-slab
configurations). If the spreadsheet changes, update `src/logic/frameData.ts` to match and
re-run the tests.

## Tech stack

- Vite + React + TypeScript
- @react-three/fiber + @react-three/drei (3D)
- gsap (assembly animation)
- zustand (state)
- vitest (tests)

## Scripts

```bash
npm install      # install dependencies
npm run dev      # dev server
npm test         # run the logic unit tests (vitest)
npm run build    # type-check + production build to dist/
```

## Status

| Phase | Scope | State |
|-------|-------|-------|
| 1 | Logic engine (pure TS) + tests | ✅ complete — 66 tests green |
| 2 | Static 3D scene | ⬜ next |
| 3 | Screwjack drag | ⬜ |
| 4 | Component palette (snap-to-catalogue) | ⬜ |
| 5 | Assembly animation | ⬜ |
| 6 | Polish + height display | ⬜ |

## Project structure

```
src/
  logic/
    frameData.ts        constants, every value traced to a spreadsheet cell
    configurations.ts   the 27 canonical configs (14 singles + 5 doubles + 8 triples)
    heightCalc.ts       calcHeightRange / validity / live current-height
    catalogue.ts        valid-config queries, simplest-config recommendation, palette filtering
    heightCalc.test.ts  asserts the engine == the spreadsheet (66 tests)
```

See [`FORMWORK_3D_HANDOFF_ADDENDUM.md`](./FORMWORK_3D_HANDOFF_ADDENDUM.md) for the resolved
product decisions and where this build deliberately deviates from the original brief.
