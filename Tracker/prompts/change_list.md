# Change List

> Log each change as a new entry. Include links to PRs/commits and affected requirement IDs.

---

## Template
- **ID**: CL-YYYYMMDD-XX  
- **Date**: 2025-11-08 (UTC)  
- **Author**:  
- **Summary**:  
- **Type**: feature | fix | refactor | data | docs | chore  
- **Requirements Affected**: (e.g., RPG-008, RPG-010)  
- **Design Notes**:  
- **Migration**: Y/N (details)  
- **Tests**: Added/Updated/NA  
- **Verification**: Steps & expected results  
- **Rollback**: Steps  
- **Links**: PR/Issue/Commit

---

## CL-2025-Initial-Baseline
- **Date**: 2025-11-08 (UTC)
- **Author**: System
- **Summary**: Seed baseline requirements from initial spec; created tracking scaffolds.
- **Type**: docs
- **Requirements Affected**: All baseline (RPG-*)
- **Design Notes**: Established atomic IDs and verification checklist.
- **Migration**: N
- **Tests**: NA
- **Verification**: Manual review of mapping vs. source brief.
- **Rollback**: Delete this file if not needed.
- **Links**: NA

---

## CL-20251108-SKILL-LINKS
- **Date**: 2025-11-08 (UTC)
- **Author**: System
- **Summary**: Support multiple skill links with OR acquisition semantics; schema updated to `links: [skillId...]`; added acceptance test.
- **Type**: docs
- **Requirements Affected**: RPG-202, RPG-205
- **Design Notes**: Default OR semantics keeps UX simple; future extension could add `linkMode: AND|OR` if needed.
- **Migration**: N (existing single `links` arrays remain valid)
- **Tests**: Added acceptance test #9
- **Verification**: Confirm skill with two links is acquirable when owning one linked skill; not acquirable when owning none.
- **Rollback**: Revert this entry and prior text edits.
- **Links**: NA

---

## CL-20251108-VERTICAL-SLICE
- **Date**: 2025-11-08 (UTC)
- **Author**: Codex
- **Summary**: Implemented the TypeScript combat engine, CLI hero tools, YAML content store, and automated tests delivering the requested vertical slice.
- **Type**: feature
- **Requirements Affected**: RPG-001..014, RPG-101..106, RPG-201..205, RPG-301..305, RPG-401..403
- **Design Notes**: Built modular TurnScheduler/EffectEngine/DamageEngine with deterministic RNG and summon lifecycle control; wired CLI battle + hero/editor/creator flows backed by YAML content; added import/export pipeline and seeded sample data.
- **Migration**: N
- **Tests**: Added (`npm test`)
- **Verification**: `npm run build`, `npm test`
- **Rollback**: Remove the TypeScript project files (`src`, `tests`, `data/sample`, configs) and revert doc updates.
- **Links**: NA

---

## CL-20251108-SKILL-GRAPH
- **Date**: 2025-11-08 (UTC)
- **Author**: Codex
- **Summary**: Added hero skill-link graph visualization, supporting helper, vitest coverage, and mock YAML data for graph-focused testing.
- **Type**: feature
- **Requirements Affected**: RPG-303
- **Design Notes**: Built an ASCII tree renderer that classifies skills as Owned/Unlockable/Locked, caches traversal to avoid cycles, and plugs directly into the hero editor UI.
- **Migration**: N
- **Tests**: Updated (`npm test`)
- **Verification**: Manual CLI review plus `npm test`
- **Rollback**: Remove `skillGraph` helper import/call, delete mock datasets, drop new tests/doc updates.
- **Links**: NA

---

## CL-20251109-WEB-UI
- **Date**: 2025-11-09 (UTC)
- **Author**: Codex
- **Summary**: Scaffolded the React/Vite UI (apps/ui), Zustand stores, engine bridge + worker, Tailwind design system, assets tree, and UI routes (Battle, Hero, Skills, Creator, Load/Save, Settings) per `ui_ux_prompt.md`.
- **Type**: feature
- **Requirements Affected**: UI-001..UI-003, RPG-301..305, RPG-401..403
- **Design Notes**: Added shared battle client w/ worker fallback, YAML fetcher that streams from `/data`, skill graph legend w/ icons, keyboard cues, and creator tools with live YAML preview + asset picker hooks.
- **Migration**: N
- **Tests**: Added Vitest component coverage (SkillGraphView). Playwright was intentionally omitted because CatchyOS is unsupported.
- **Verification**: Tracker CLI — `npm run build`, `npm test`. UI workspace requires local `npm run dev`/`npm run build` outside sandbox (SIGBUS noted in tracker docs).
- **Rollback**: Remove `apps/ui`, `assets/`, `data/mock`, new docs, and config updates.
- **Links**: NA

---

## CL-20251109-ARCHOS-UI
- **Date**: 2025-11-09 (UTC)
- **Author**: Codex
- **Summary**: Added `apps/ui-archos`, a pure-JavaScript React workspace (web-dev-server + Rollup + Sucrase) so the UI can run on ArchOS without esbuild-native binaries.
- **Type**: feature
- **Requirements Affected**: UI-001..UI-004, RPG-301..305, RPG-401..403
- **Design Notes**: Ports the battle/hero/skills/creator/settings flows, reusing the engine bridge + worker, but swaps the toolchain for Sucrase, Rollup, and Jest + happy-dom. All assets load from `/assets` and YAML from `/data`.
- **Migration**: N
- **Tests**: Jest component tests (`cd apps/ui-archos && npm test`).
- **Verification**: Repo root CLI (`npm run build`, `npm test`). ArchOS workspace requires `npm install` then `npm run dev`/`npm run build` locally.
- **Rollback**: Delete `apps/ui-archos` and remove doc references/configs.
- **Links**: NA
