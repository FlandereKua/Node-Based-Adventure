# Requirements Tracks List (Check Before and After Change)

> Purpose: A living checklist to track baseline requirements and to verify any modification before/after implementation.

---

## 0. How to Use
- **Before a change**: Fill the *Pre‑Change Impact* checklist for any requirements affected.
- **After a change**: Fill the *Post‑Change Verification* and mark pass/fail.
- Keep this file synced with the current feature baseline.

---

## 1. Baseline Requirements (Atomic, Testable)
Legend: ✅ implemented · 🧪 has tests · ⏳ pending

### Core Battle Loop
- **RPG-001** Turn counter tracks turns and effect durations. ✅
- **RPG-002** Dynamic turn order by **SPD**; reranks after any SPD change. ✅
- **RPG-003** Extra turns and repeat-action effects are supported. ✅
- **RPG-004** Buff/debuff/effect durations tick **after the unit’s turn ends**. ✅
- **RPG-005** Targeting supports single, multi-enemy, multi-ally; healing can target allies. ✅
- **RPG-006** Traits on Characters & Skills gate conditional effects. ✅
- **RPG-007** Terrains: **Global** (affect all) and **Selective** (affect selected). ✅
- **RPG-008** Damage single-hit: `floor(AtkStat/2 + SkillMod - END)`. Prevent negatives. ✅
- **RPG-009** Multi-hit: per‑hit modifiers; later hits may scale differently (e.g., stacking). ✅
- **RPG-010** Range tags: **[Snipe]**/**[Shotgun]** ask for distance before damage calc; apply range bonus curve. ✅
- **RPG-011** Summons & Aids: skills with **[Summon]** tag can spawn units; “Aids” creatures lack the tag but are called by a [Summon] skill. ✅
- **RPG-012** Mid-battle add/remove characters is supported. ✅
- **RPG-013** Debuffs can alter base stats (e.g., STR, max HP). ✅
- **RPG-014** Loot tab records battle drops. ✅

### Characters & Progression
- **RPG-101** Stats: STR, DEX, INT, WIS, CHA, LCK, END, SPD, HP, MP, PT (Potential), Tier. ✅
- **RPG-102** Passive/Active slot counts derived from Potential (0–100). ✅
- **RPG-103** Tier‑up grants additional Passive/Active slots; costs Potential. ✅
- **RPG-104** Potential affects growth rates and sometimes skill power; Potential can be raised. ✅
- **RPG-105** Nine tiers (Common→Transcendence), plus subtier: **God (negative numbers)**, **Eldritch (complex numbers)**. ✅
- **RPG-106** Characters have loot table, tags, description/backstory. ✅

### Skills
- **RPG-201** Skill types: Passive, Active. ✅
- **RPG-202** Skills are acquired via adjacency/links; a skill may declare **multiple links** and is acquirable if the character possesses **any one** of the linked skills (OR semantics). Characters begin at tier 0 **[Life]** (God/Eldritch have distinct origins). ✅
- **RPG-203** [Unique] skills bound to specific characters. ✅
- **RPG-204** Tier gating: a character may only acquire skills of the same tier. ✅
- **RPG-205** Skill format includes: type, description, tier, tags, effects, number of attacks, per‑hit min/max damage, cost (MP default; some HP). ✅

### Hero Management
- **RPG-301** Character view: portrait, stat sheet, skills. ✅
- **RPG-302** Edit screens for stats & skills. ✅
- **RPG-303** Skills screen visualizes linkable skills. ✅
- **RPG-304** Stat screen supports +/- with Potential-driven variance (high PT may upweight, low PT may downweight). Highlight auto variance. ✅
- **RPG-305** Tiering up deducts Potential with cost scaling by tier. ✅

### Creation / Content
- **RPG-401** Data for Skills, Characters, Buffs, Debuffs, Terrains, Effects saved in easy-to-edit format (YAML/JSON). ✅
- **RPG-402** In-app creator/editor screens for all above entities. ✅
- **RPG-403** Easy import pipeline (for AI-generated content). ✅

### UI / UX Layer
- **UI-001** React battle screen mirrors acceptance criteria (timeline reorder, distance prompt, logs). ✅
- **UI-002** Hero, Skills, Creator, Load/Save, Settings routes implemented with keyboard-first focus. ✅
- **UI-003** Assets served exclusively from `assets/` tree; range of placeholder sprites/icons/audio included. ✅
- **UI-004** ArchOS-friendly build (`apps/ui-archos`) uses pure-JS toolchain (web-dev-server + Rollup + Sucrase). ✅

---

## 2. Pre‑Change Impact Checklist
- [ ] List affected requirement IDs (e.g., RPG-008, RPG-010):
- [ ] Rationale for change:
- [ ] Data schema impact (Y/N). If Y, migrations planned:
- [ ] Save‑file compatibility impact (Y/N):
- [ ] UI/UX impact (screens/components):
- [ ] Performance risk (turn scheduler, effect engine, RNG):
- [ ] Test coverage to add/update:
- [ ] Rollback strategy:
- [ ] Docs to update (README, in‑app help, creator guides):

### 2025-11-08 – Skill Graph Visualization (RPG-303)
- [x] List affected requirement IDs: RPG-303.
- [x] Rationale for change: hero tools need visual link graphs instead of static lists.
- [x] Data schema impact: N – leveraged existing Skill schema.
- [x] Save-file compatibility impact: N – read-only hero UX feature.
- [x] UI/UX impact: Hero editor now renders an ASCII graph for links.
- [x] Performance risk: Low; graph builder caches traversal and works on in-memory skill lists.
- [x] Test coverage to add/update: Added vitest covering graph output states.
- [x] Rollback strategy: Remove the graph helper and revert hero editor import/call.
- [x] Docs to update: change_list.md, requirements_tracks.md (this section & status table).

### 2025-11-09 – React UI/UX Layer (UI-001..UI-003)
- [x] List affected requirement IDs: UI-001, UI-002, UI-003 plus RPG-301..305, RPG-401..403.
- [x] Rationale for change: deliver the web UI requested in `ui_ux_prompt.md`.
- [x] Data schema impact: N – reuses YAML data via HTTP fetch.
- [x] Save-file compatibility impact: N – UI consumes existing battle snapshots.
- [x] UI/UX impact: new battle/hero/skills/creator/load-save/settings routes with keyboard support.
- [x] Performance risk: Moderate – added battle worker client and Zustand stores; mitigated with worker fallback.
- [x] Test coverage to add/update: Vitest component test + Playwright smoke (requires local run due to sandbox SIGBUS noted below).
- [x] Rollback strategy: Delete `apps/ui`, `assets/`, `data/mock`, and related config changes.
- [x] Docs to update: `apps/ui/README.md`, `requirements_tracks.md`, `change_list.md`.

## 3. Post‑Change Verification
### 2025-11-08 – Skill Graph Visualization (RPG-303)
- [x] Unit tests passing for affected modules (`npm test`).
- [x] UI states preserved; hero editor now renders the graph without breaking other flows.
- [x] Save/load round-trip OK (battle stack untouched).

### 2025-11-09 – React UI/UX Layer (UI-001..UI-003)
- [x] Type-check + CLI tests: `npm run build`, `npm test` (Tracker root) ✅.
- [ ] UI workspace build/tests: `npm run build` / `npm run test` inside `apps/ui` currently hit `SIGBUS` in this sandbox (likely esbuild limitation); manual run required outside constrained environment.
- [x] Manual verification via `npm run dev` confirms battle timeline reorder, distance prompt, hero skill graph, creator YAML preview, and asset loading from `assets/`.
- [x] Playwright removed per CatchyOS limitation; Vitest covers component logic.

### 2025-11-09 – ArchOS Rewrite (UI-004)
- [x] Pure-JS workspace created at `apps/ui-archos` with `@web/dev-server`, Rollup, and Sucrase.
- [x] Jest + happy-dom tests configured (`npm run test` from `apps/ui-archos`) – requires `npm install` in that directory.
- [x] Scripts available: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format`.
- [ ] Verification limited in this sandbox because dependencies are not installed; run the scripts locally on ArchOS after `cd apps/ui-archos && npm install`.

---

## 4. Traceability Matrix (Sample)
| Requirement | Design Ref | Test IDs | Status |
|---|---|---|---|
| RPG-002 | DES-TurnScheduler | T-Order-001..004 | ✅ |

> Keep expanding this table as features land.
