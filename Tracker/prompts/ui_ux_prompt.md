# Interactable UI/UX – Implementation Prompt (Web App)

**Date**: 2025-11-09 (UTC)  
**Goal**: Ship a responsive, keyboard-first **web UI** for the Turn-based RPG engine already implemented in TypeScript/Node.  
**Constraint**: **All visual/audio assets live under `assets/`** (sprites, icons, sfx, music, fonts, shaders).

---


## 1) Tech Stack & Project Layout
- **Frontend**: React + Vite + TypeScript.
- **Styling**: Tailwind CSS; CSS modules allowed for canvas overlays.
- **State**: Zustand (lightweight) or Redux Toolkit (if you prefer). Prefer Zustand.
- **Routing**: React Router.
- **Tests**: Vitest + React Testing Library; **Playwright** for E2E.
- **Engine Bridge**: Expose existing Node TS engine modules via a thin adaptation layer:
  - Import pure modules directly (DamageEngine, TurnScheduler, EffectEngine, SummonManager, HeroManager, ContentStore).
  - For heavy sims, run in a **Web Worker** (`src/workers/battleWorker.ts`) to keep UI responsive.
- **Assets**: `assets/` at repo root (or app root). Subfolders:  
  `assets/sprites/`, `assets/icons/`, `assets/ui/`, `assets/audio/`, `assets/fonts/`, `assets/shaders/`
- **Data**: continue using YAML/JSON under `data/`; UI reads/writes via ContentStore.

Suggested structure:
```
apps/ui/
  index.html
  src/
    main.tsx
    app.tsx
    routes/
      Battle.tsx
      Hero.tsx
      Skills.tsx
      Creator.tsx
      Settings.tsx
      LoadSave.tsx
      NotFound.tsx
    components/
      layout/
      battle/
      hero/
      skills/
      creator/
      common/
    workers/
      battleWorker.ts
    state/
      useBattleStore.ts
      useHeroStore.ts
      useContentStore.ts
    services/
      engineBridge.ts
      dice.ts
      rangeCurves.ts
    styles/
    typings/
  public/   # Vite static copies (optional)
assets/
  sprites/  icons/  ui/  audio/  fonts/  shaders/
data/
  sample/   mock/
```
---

## 2) Core Screens & Interactions

### A. Battle Screen
**Purpose**: Run battles with live timeline, targeting, and logs.
- **Top Bar**: Encounter name, turn counter, terrain indicator (Global/Selective badges).
- **Timeline (Right)**: Dynamic order by SPD. Reorders live if SPD changes; highlight current unit.
- **Board (Center)**: Minimal grid/canvas with character portraits/markers; selectable units.
- **Unit Panel (Left)**: Current unit portrait, stats (STR/DEX/…/SPD/HP/MP), active effects with remaining turns.
- **Action Bar (Bottom)**: Skills list (Active only), items (if any), **distance prompt** modal for **[Snipe]/[Shotgun]** before damage calc.
- **Targeting**: Single, multi-enemy, multi-ally; hover previews expected damage range, affected traits/terrain bonuses.
- **Logs**: Collapsible combat log with dice breakdowns (e.g., `1d3 -> 2`, clamps).
- **Roster Controls**: Add/Remove unit mid-battle (modal with validation).

Keyboard:
- `Tab` cycle focus, `←↑↓→` move target, `Enter` confirm, `Esc` cancel.
- Number keys 1–9 to select skills; `D` open distance prompt if required.

### B. Hero Screen
**Purpose**: Inspect/edit hero stats & skills with Potential-aware variance.
- **Portrait + Bio**: Backstory, tags, tier, PT, loot table summary.
- **Stats Editor**: +/- controls per stat; **variance highlight** when PT modifies outcome.
- **Tier-up Flow**: Shows Potential cost, required items; confirm modal.
- **Skill Graph**: Integrate **buildSkillLinkGraph** to render **Owned/Available/Locked** with icons/colors.
  - Node click to learn (if tier & links satisfied); OR semantics for multiple links.
  - Legend: [O] Owned, [A] Available, [L] Locked, [U] Unique.

### C. Skills Screen
- Filter/search by tags (e.g., [Summon], [Snipe], [Shotgun], [Unique]).
- Detail drawer: type, tier, tags, links[], cost, hits, min/max, scaling, interactions.
- “Acquire” action (if allowed) and validation errors (tier/links/PT).

### D. Creator Screen
- Wizards to create/edit **Skill, Character, Terrain, Buff/Debuff, Effect**.
- Live schema validation; preview in YAML/JSON.
- **Import**: paste AI-generated YAML/JSON → diff view → apply into `data/` and refresh content index.
- **Asset Picker**: browse `assets/` to attach portraits, icons, sfx.

### E. Load/Save Screen
- Save slots with timestamps and scenario labels; verify **resume** loads deterministic state.
- Export/Import saves as JSON blobs.

### F. Settings Screen
- Range curve presets; damage preview options; RNG seed for reproducible tests.
- Accessibility: text size, high-contrast mode, colorblind palettes; toggle combat log verbosity.

---

## 3) Component Breakdown (selected)
- `BattleTimeline.tsx` – virtualized list; current/next turn highlights.
- `DistancePrompt.tsx` – modal for [Snipe]/[Shotgun]; validates numeric distance and shows resulting bonus.
- `EffectBadges.tsx` – effect icons with turn counters; tooltip shows source/stack rules.
- `TargetOverlay.tsx` – canvas/SVG layer for target cones, AoE outlines.
- `StatEditor.tsx` – +/- with PT variance banners; undo/redo (local history).
- `SkillGraphView.tsx` – renders graph (d3-force or Cytoscape); Owned/Available/Locked.
- `YamlEditor.tsx` – Monaco or CodeMirror with YAML schema hints.
- `AssetPicker.tsx` – reads from `assets/` and previews.

---

## 4) Data Contracts
- Use existing YAML/JSON schemas. UI adapters normalize to:
```ts
type CharacterRef = { id: string, name: string, portrait?: string /* assets/ path */ };
type SkillRef = { id: string, name: string, tags: string[], links?: string[] };
type TerrainRef = { id: string, type: "Global"|"Selective", tags: string[] };

type BattleState = {
  turn: number;
  units: UnitState[]; // includes stats, effects, traits
  terrain: TerrainRef[];
  log: LogEntry[];
};
```
- Asset attributes are relative paths under `assets/`.

---

## 5) Acceptance Criteria (UI)
1. **Timeline Reorder**: When SPD of a non-active unit changes, timeline re-sorts immediately and highlights newly advanced unit.
2. **Distance Prompt**: Selecting a [Snipe]/[Shotgun] skill opens the distance modal; damage preview reflects the entered value and selected curve.
3. **Effect Ticking**: Ending the acting unit’s turn decrements all its effect durations by 1; UI counters update.
4. **Multi-hit Preview**: Triple Thrust shows per-hit dice and total min–max before confirm.
5. **Summon Lifecycle**: Summoned units appear in the board and timeline; on expiry they are removed without dangling UI state.
6. **Mid-battle Roster**: Adding/removing units updates the board and timeline without errors.
7. **Skill Graph**: A hero with *Slash* (not *Pierce*) sees *Triple Thrust* as **Available** when links=[Slash,Pierce] (OR).
8. **PT Variance Highlight**: Editing +1 STR shows “Applied +2 due to Potential” badge when triggered.
9. **Creator Validations**: Invalid YAML shows schema errors; importing a valid skill updates lists immediately.
10. **Assets Rule**: All portraits/icons/sfx used by UI reference files under `assets/`; no broken paths.
11. **A11y**: All actions reachable by keyboard; contrast and focus outlines pass WCAG AA.

---

## 6) Non-Functional Targets
- First paint < 2s on mid-tier laptop; bundle < 1.5MB gz for initial route.
- Animations 60fps (prefer CSS transforms; throttle expensive reflows).
- Worker moves any O(n log n) turn recompute or heavy damage simulations off main thread.

---

## 7) Telemetry & Debug
- Optional debug panel: RNG seed, last 10 rolls, last 10 events.
- Toggleable “Design Mode” overlays: show trait checks, terrain multipliers, clamping.

---

## 8) Testing Plan
- **Unit**: component logic (distance math, PT variance banners).
- **Integration**: engineBridge + UI flows (battle actions, graph acquisitions).
- **E2E (Playwright)**: scripted scenarios for Acceptance Criteria 1–11.
- Snapshot tests for Skill Graph (ANSI off, deterministic positions by seed).

---

## 9) Deliverables
- React app in `apps/ui` with routes/components as above.
- `assets/` populated with placeholder sprites/icons (SVG/PNG), sample sfx (WAV/OGG), fonts.
- Test suite (Vitest + Playwright) covering criteria.
- Developer docs: `README.md` with setup, scripts, and asset conventions.

---

## 10) Scripts (Vite project)
- `npm run dev` – local dev server
- `npm run build` – production build
- `npm run preview` – preview server
- `npm run test` – unit/integration tests
- `npm run e2e` – Playwright E2E

**Note**: Keep the existing CLI intact; UI is an additive layer calling the same engine & content store.
