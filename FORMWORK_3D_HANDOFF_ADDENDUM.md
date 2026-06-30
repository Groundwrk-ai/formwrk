# Handoff Addendum — Resolved Decisions & Deviations

This addendum sits on top of the original `FORMWORK_3D_HANDOFF.md` kickoff brief. The brief
was a starting point; the **spreadsheet is the only non-negotiable source of truth**, and we
are free to improve on the brief where it helps. This document records the decisions made and
where the build intentionally departs from the brief.

## Verification of the brief against the spreadsheet

Every constant, the configuration set, and all four of the brief's worked examples were
cross-checked against `Formwork_Material_Selection_v2.xlsx` (sheet *Mat. Selection (Draft)*)
and matched exactly. The Phase 1 test suite encodes the spreadsheet's min/max for all
27 thin + 21 thick configurations as the oracle (66 tests, all passing).

## Locked product decisions

1. **Palette = hybrid that snaps to the catalogue.** Component pickers, but only choices that
   keep the assembly inside the catalogue are offered (`validOptions()` in `catalogue.ts`).
2. **Assembly UX = click-to-swap for v1**; drag-from-palette-into-3D is deferred (the scene
   model will be built drag-ready).
3. **Auto-assemble** the simplest valid config ("Optimal") on slab input; user can override.
   Ranking (`compareSimplicity` / `archetypeRank` in `catalogue.ts`) is a **confirmed product
   decision**, NOT derivable from the spreadsheet (which only orders *within* a group):
   `0 Single (FJ no-ext) → 1 Single + extension → 2 Single + Prop Inner → 3 Double →
   4 Single + extension + Prop Inner → 5 Triple`, then smaller total frame height, then id.
   A double is preferred over a single needing BOTH an extension and a prop inner; triples are
   the last resort. (Test: 4100mm thin → `d-5-6`.)
4. **Height fidelity = geometry truthful to the calc.** The rendered timber stack totals
   267mm and the tower's overall height equals the displayed number; geometry yields to math.
5. **Target shown as a ghost soffit plane** at the floor-to-soffit height; the tower top
   meets it and snaps green on contact.
6. **Prop Inner No 1 = telescoping pinned inner tube** (slots inside the frame leg, visible
   pin holes, 300–1050mm range), not a flat-jack-style base. (Per the supplier catalogue.)
7. **Geometry fidelity = source real dimensions where feasible**, fall back to
   representational. The supplied component PDFs are e-commerce pages, not datasheets; the
   only hard numbers found were the extension tubes (300mm / 500mm, 60mm sleeve over an
   80mm core, slides over the top frame leg). A web-sourcing pass for frame leg-spacing/tube
   OD, Flat Jack throw/base-plate, Prop Inner range, and LVL bearer/joist sizes is
   Phase 2 prep.
8. **Platform = full responsive incl. phone.** Touch is first-class: U-Head and base
   extensions get +/- steppers and numeric entry (precise control on touch, also better on
   desktop); one-finger orbit must not conflict with jack drag; palette collapses to a drawer
   on small screens. Runtime perf is a non-issue (the scene is ~40–70 primitive meshes).

Defaults: exclude the 2ft frame (the sheet uses 3–7ft only); no save/export/persistence in
v1 (local/sessionStorage is banned by the brief).

## Deviations from the brief (deliberate improvements)

- **27 canonical configs, not 48.** The brief listed "48 configurations" as 48 objects. The
  spreadsheet actually has 27 canonical configs (14 singles + 5 doubles + 8 triples)
  evaluated across two slab tables; the thick table is exactly the thin set minus the 6
  Prop-Inner configs. Modelling 27 and deriving thin/thick via rules removes duplication and
  the chance of the two tables drifting apart. (`configurations.ts`, `heightCalc.ts`.)
- **No `slabType` field on a config.** Thin/thick availability is computed
  (`isAvailableForSlab`) rather than stored, for the same reason.
- **Recommendation + snap-to-catalogue engines added** (`catalogue.ts`) to support decisions
  3 and 1 — these go beyond the brief's Phase 1 scope but are needed by Phases 4 and the
  auto-assemble flow, and are unit-tested now.
- **Touch-first screwjack control (steppers/numeric)** added to the plan per decision 8.

## Resolved: cross-group "Optimal" ranking

The spreadsheet only orders configs *within* a group, so the cross-group ranking was a product
decision — now **confirmed** (see locked decision 3). A **double outranks a single that needs
both an extension and a prop inner**; triples are the last resort. `catalogue.ts`
(`archetypeRank`), its tests (`heightCalc.test.ts`, incl. the 4100mm case), and this addendum
all agree, and the rule is documented as a product decision rather than spreadsheet-derived.

## Hosting

Static build (no backend). Target: **GitHub Pages** with a GitHub Actions deploy workflow
(custom domain via `CNAME` + registrar DNS). Cloudflare Pages / Vercel are drop-in
alternatives.
