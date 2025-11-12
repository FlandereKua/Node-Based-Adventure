## Project Prompt: Turn-Based Grid RPG & Hero Management System (Non-Web Implementation Preferred)

### 0. Objective
Build a turn-based, grid-map RPG with a hero (character) management layer. Focus on tactical combat, character progression via Tiers, Potential, and a skill graph. Prefer a non-web deployment (e.g., desktop app, CLI, or native engine) for performance and offline capability.

### 1. Core Entities & Data Model
Character (Hero / Enemy)
Map (Battle / Town)
Skill (Active / Passive / Title)
Event / Training (Progression triggers)
Creation Assets (Importable definitions)

### 1.1 Character Sheet (Stats)
Stats (base + modifiers):
- STR: Physical power / melee scaling
- DEX: Agility, accuracy, crit chance basis
- INT: Magical power / spell scaling
- WIS: Resistance, insight, status accuracy
- CHA: Social influence, recruitment, morale effects
- LCK: Random outcome bias (drops, crit, evasion)
- END: Physical durability / armor mitigation
- SPD: Turn sequencing influence
- HP: Health pool
- MP: Mental/Mana pool (resource for certain skills)
- PT (Potential): Gate for Tier advancement & training efficiency
- Tier: Progression rank (1–9 + special forms)

Tags (array of categorical descriptors): affiliation, party role, personality, element(s), weapon type(s), damage types, thematic traits. Used for event triggers, tier advancement conditions, skill gating, and narrative hooks.

Portrait: Visual representation (optional metadata: file path / asset id).

### 1.2 Tier System
Standard Tiers (numeric 1–9):
1 Common
2 Uncommon
3 Rare
4 Renowned
5 Heroic
6 Epic
7 Legendary
8 Mythical
9 Transcendence

Advancement requires:
1. Triggering Event(s) (conditions derived from Tags, stats, or story).
2. Minimum Potential threshold (e.g., Renowned ≥ 40 PT; define table).

Special Sub-Types:
- God: Inverse tier notation (e.g., Tier -4 Local God) → treat negative tiers as exotic scaling (design rule: convert to effective tier for slot calculations).
- Eldritch: Complex tier (e.g., 3 + 2i Dreamer) → imaginary component could map to alternate plane influence or non-linear scaling. (Implementation: store as structured object {base:3, imag:2}).

Slots Granted per Tier (base ranges, refined by Potential):
- Active Ability Slots: 1–4
- Passive Ability Slots: 2–4
Exact slot count = f(Tier, Potential). Define formula or table (placeholder: Active = min(4, ceil(Tier/2) + bonusFromPotential); Passive = min(4, 2 + floor(Tier/3) + bonusFromPotential)).

### 1.3 Potential (PT)
Role: Progression gating + adaptive training multiplier + conditional skill amplification.
Behaviors:
- Increases via Events / Rare Training / Titles.
- Required thresholds per tier (maintain config). Example: Renowned ≥ 40; Heroic ≥ 60; Epic ≥ 80; Legendary ≥ 110; Mythical ≥ 140; Transcendence ≥ 180 (tweakable).
- Training scaling: A +1 STR session may yield +2 STR if PT ≥ high threshold.
- Skill conditional bonus: Skill definitions may include potentialBreakpoints -> bonusEffects.

### 1.4 Skills & Skill Graph
Types:
- Active: Consumes action (may cost MP, has range, target pattern, damage/heal/support effect).
- Passive: Persistent modifiers or triggers.
- Title: Special passive; often unique, may alter growth curves or unlock events.

Graph Linking:
- Skills have adjacency list (links) enabling acquisition chain.
- Acquisition Conditions:
	1. Character Tier ≥ Skill Tier.
	2. At least one linked (adjacent) owned skill.
Example: [Triple Thrust] (Active T2) linkable from [Thrust] (Active T1) OR [Quick Hand] (Passive T1).

Tags per Skill: domain (Fire, Plant), damage type (Blunt, Pierce, Slash, Mental), school (Magic, Physical), status (Bleed), element, synergy keys.

Effects Model:
- Damage/Heal/Buff/Debuff/Stat adjustment.
- Range: Manhattan or axial distance in grid (define metric; default: orthogonal+diagonal counts as 1 each or adopt hex if needed).
- Targeting pattern: single, radial, line, cone (define enumeration).

Base Skill: All non-God/Eldritch start with Tier 0 "Life" (acts as root node). God/Eldritch start with custom root(s).

### 2 Combat System
Damage Types: Pierce, Blunt, Slash, Mental.
Potential extension: elemental overlay (Fire, Ice, etc.) after core implemented.

Resolution Loop (high-level):
1. Determine turn order from recalculated SPD at start of round.
2. Process global start-of-turn triggers (buff/debuff duration decrement, DOT/HO T ticks).
3. Active character selects action (skill, move, wait, item, etc.).
4. Validate range & prerequisites.
5. Apply effects (with mitigation: END, resistances, passives).
6. Queue resulting events (death, status, tier event triggers).
7. Proceed to next entity.

Edge Cases:
- Simultaneous speed ties → deterministic tie-breaker (e.g., highest DEX, else stable character ID).
- Overkill damage → log but cap HP floor at zero.
- Mental damage mitigation could use WIS instead of END.

### 2.1 Map & Deployment
Map Source: assets/ directory (store metadata: width, height, terrain types, hazard zones, field effects).
Grid Construction: derive from dimensions (e.g., 42x30) into internal matrix.
Battle (Hostile) Map:
- Pre-deployment phase: place allies/enemies based on allowed zones.
- Tokens: represent each character; left-click → status panel (stats, buffs, debuffs); right-click → action menu.
Town Map:
- Access Event/Training modules.
- Recruit/acquire new characters.
Terrain/Hazard/Field Effects:
- Provide per-tile modifiers (movement cost, damage over time, stat aura).

### 2.2 Turn Order UI
Display column left side (list of tokens ordered by SPD). Recalculate every full round or dynamic if SPD-altering effects occur (decide design; initial: per round).
Buff/Debuff durations decrease at start of that entity's turn OR globally at round start (choose one; initial: per entity start for granularity).

### 3 Creation / Management Menu
Functions:
- Create / Edit / Delete: Character, Enemy, Skill, Map, Event.
- Import: Load external JSON/YAML definitions (validate schema, version tagging).
- Export (optional future): Save current definitions for sharing.

### 4 Non-Web Preference & Target Platforms
Implementation must avoid the browser stack; prefer:
- Desktop engines / frameworks: Python + Pygame, Godot, C# + MonoGame, C++ + SDL.
- Or CLI prototype (text grid + turn loop) for early iteration.
Target Operating Systems (cross-platform requirement):
- Windows (development convenience)
- Linux (Arch-based distributions) → ensure no reliance on platform-specific binaries without alternatives; prefer portable dependencies, validate with a smoke run on Arch.
Reasoning: Performance, direct file-based asset access, offline use, and Linux packaging flexibility.

### 5 Requirement Checklist (Review at START and END of every coding session)
MUST CONFIRM EACH ITEM:
1. Character stat model supports modifiers & derived calculations.
2. Tier advancement logic with Potential thresholds implemented/configurable.
3. Skill graph (adjacency + acquisition validation) functional.
4. Damage resolution pipeline covers 4 damage types & mitigation.
5. Grid map loader reads dimensions & builds matrix.
6. Token interaction (left-click status, right-click action) scaffolded.
7. Turn order recalculation based on SPD present.
8. Buff/Debuff duration decrement rule implemented.
9. Event/Training framework can modify stats & Potential.
10. Creation/Management menu supports CRUD & import.
11. Non-web runtime honored AND runnable on Linux Arch-based systems (cross-platform test passes).
12. Persistent logging of changes (Change Log updated).

### 6 Change Log (Append entries chronologically)
Format per entry:
- Date:
- Author/Process:
- Summary:
- Files/Modules Affected:
- Requirements Impacted (list IDs from checklist):
- Notes / Follow-up:

Initial Entry:
- Date: (YYYY-MM-DD)
- Author: SYSTEM
- Summary: Refined prompt structure and added requirement + change tracking sections.
- Files: requirementPrompts.md
- Requirements Impacted: 1–12 (established baseline)
- Notes: Future entries must follow format above.

Entry 2:
- Date: 2025-11-12
- Author: GitHub Copilot
- Summary: Implemented complete turn-based RPG system with Pygame UI, including Character/Skill/Map/Event models, combat engine, skill graph, tier advancement, and data management.
- Files/Modules Affected:
  - src/models/character.py (Character stats, tier, potential, buffs/debuffs)
  - src/models/skill.py (Skill graph, acquisition validation, effects)
  - src/models/map.py (Grid maps, terrain, pathfinding)
  - src/models/event.py (Events, training, progression)
  - src/combat/engine.py (Turn-based combat, damage resolution)
  - src/data/data_manager.py (JSON import/export)
  - main.py (Pygame UI, game loop)
  - config/game_config.json (Configurable thresholds)
  - assets/ (Sample characters, skills, maps, events, trainings)
- Requirements Impacted: 1–12 (all MVP requirements implemented)
- Notes: Cross-platform compatible (Windows & Linux). Uses Python + Pygame as specified.

Entry 3:
- Date: 2025-11-12
- Author: GitHub Copilot  
- Summary: Implemented Item System with Equipment (3 slots), Inventory Management, Loot Drops, and Consumables for tier advancement and combat.
- Files/Modules Affected:
  - src/models/item.py (NEW: Item, Inventory, LootTable classes)
  - src/models/character.py (Added equipment slots, equip/unequip methods)
  - src/combat/engine.py (Added loot drop trigger on combat end)
  - src/data/data_manager.py (Added item/loot table loading)
  - main.py (Integrated item system, inventory UI, loot rewards)
  - assets/items/items.json (NEW: Equipment, consumables, materials)
  - assets/items/loot_tables.json (NEW: Loot tables with LCK-based drops)
  - run.ps1, README.md (Updated Python command to 'py' for Windows)
- Requirements Impacted: Extended system beyond MVP
  - Item Types: Equipment (stat bonuses), Consumable (HP/MP/buffs/tier advancement), Material (crafting)
  - Equipment: Maximum 3 slots per character, stat bonuses applied/removed on equip/unequip
  - Inventory: Stacking system, max slots, add/remove/use functionality
  - Loot Drops: LCK-based probability modification, post-combat rewards
  - Consumables: Healing, MP restore, stat boosts (temporary), potential gain, tier advancement items
  - Combat Integration: Items usable in battle (health potions, buffs) and out of combat (tier items)
- Notes: Loot drops trigger automatically on victory. Press 'H' to use health potion, 'I' to show inventory. Equipment provides permanent stat bonuses while equipped.

### 7 Implementation Guidelines for AI
ALWAYS DO BEFORE CODING:
1. Reprint Requirement Checklist & mark planned targets.
2. State assumptions if any ambiguity (limit to 1–2 per area).
3. Confirm non-web context and chosen stack.

ALWAYS DO AFTER CODING:
1. Re-evaluate each requirement (Done / Partial / Pending).
2. Add Change Log entry.
3. List next actionable improvements.

Coding Style Suggestions:
- Modular: separate character, skills, combat, map, data-loading.
- Config-driven thresholds (JSON/YAML) for Potential & Tier.
- Deterministic RNG seeding option for reproducible tests.
- Clear error messages for invalid skill acquisition.

### 8 Future Extensions (Not in current scope unless scheduled)
- Multiplayer / network layer.
- Procedural map generation.
- AI enemy tactical evaluation.
- Elemental damage layering system.
- Save/Load campaign progression.

### 9 Open Questions (Define later; AI may propose defaults if needed)
1. Exact slot formulas for abilities vs Potential thresholds.
2. Buff/Debuff timing (entity-start vs round-start) final decision.
3. Complex tier (imaginary component) mechanical impact.
4. Movement rules (orthogonal only vs diagonal cost).
5. Terrain effect stacking rules.

### 10 Minimal Data Schemas (Draft)
Character: { id, name, tier, potential, stats:{STR,DEX,INT,WIS,CHA,LCK,END,SPD,HP,MP}, tags:[], skills:[], portraitAsset?, specialType? }
Skill: { id, name, tier, type:'active'|'passive'|'title', tags:[], links:[], costs:{mp?}, range:{min,max,pattern}, effects:[{kind:'damage'|'heal'|'buff'|'debuff'|'statMod', params:{...}}], potentialBreakpoints?:[{pt>=, bonusEffect}] }
Map: { id, name, width, height, tiles:[{x,y,terrain,hazard?,fieldEffect?}], type:'battle'|'town' }
Event: { id, name, triggerTags:[], potentialGain?, statAdjustments?, tierAdvancement?, notes }

### 11 Success Criteria (MVP)
1. Load a battle map and deploy at least 2 allies vs 2 enemies.
2. Perform one full round with correct turn sequencing.
3. Use at least one active skill and apply damage.
4. Acquire a new skill via graph linkage validation.
5. Advance a character tier after meeting Potential + Event condition.
6. Record a Change Log entry for the above actions.
7. Run the executable / prototype on a Linux Arch-based system (basic smoke test: start program, load map, execute one turn) without errors.

### 12 Testing Pointers
- Unit: skill acquisition validation, damage calc, turn order sorting.
- Integration: map load + token deploy + one combat round.
- Data: invalid tier advancement blocked when Potential insufficient.

---
Finalize this file as the authoritative prompt. All future prompt variants go into `prompts/` directory using the template. Keep this Change Log updated.
