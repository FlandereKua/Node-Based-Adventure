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
- **RPG-001** Turn counter tracks turns and effect durations. ⏳
- **RPG-002** Dynamic turn order by **SPD**; reranks after any SPD change. ⏳
- **RPG-003** Extra turns and repeat-action effects are supported. ⏳
- **RPG-004** Buff/debuff/effect durations tick **after the unit’s turn ends**. ⏳
- **RPG-005** Targeting supports single, multi-enemy, multi-ally; healing can target allies. ⏳
- **RPG-006** Traits on Characters & Skills gate conditional effects. ⏳
- **RPG-007** Terrains: **Global** (affect all) and **Selective** (affect selected). ⏳
- **RPG-008** Damage single-hit: `floor(AtkStat/2 + SkillMod - END)`. Prevent negatives. ⏳
- **RPG-009** Multi-hit: per‑hit modifiers; later hits may scale differently (e.g., stacking). ⏳
- **RPG-010** Range tags: **[Snipe]**/**[Shotgun]** ask for distance before damage calc; apply range bonus curve. ⏳
- **RPG-011** Summons & Aids: skills with **[Summon]** tag can spawn units; “Aids” creatures lack the tag but are called by a [Summon] skill. ⏳
- **RPG-012** Mid-battle add/remove characters is supported. ⏳
- **RPG-013** Debuffs can alter base stats (e.g., STR, max HP). ⏳
- **RPG-014** Loot tab records battle drops. ⏳

### Characters & Progression
- **RPG-101** Stats: STR, DEX, INT, WIS, CHA, LCK, END, SPD, HP, MP, PT (Potential), Tier. ⏳
- **RPG-102** Passive/Active slot counts derived from Potential (0–100). ⏳
- **RPG-103** Tier‑up grants additional Passive/Active slots; costs Potential. ⏳
- **RPG-104** Potential affects growth rates and sometimes skill power; Potential can be raised. ⏳
- **RPG-105** Nine tiers (Common→Transcendence), plus subtier: **God (negative numbers)**, **Eldritch (complex numbers)**. ⏳
- **RPG-106** Characters have loot table, tags, description/backstory. ⏳

### Skills
- **RPG-201** Skill types: Passive, Active. ⏳
- **RPG-202** Skills are acquired via adjacency/links (e.g., Thrust ↔ Slash); origin is tier 0 **[Life]** (God/Eldritch have different origin). ⏳
- **RPG-203** [Unique] skills bound to specific characters. ⏳
- **RPG-204** Tier gating: a character may only acquire skills of the same tier. ⏳
- **RPG-205** Skill format includes: type, description, tier, tags, effects, number of attacks, per‑hit min/max damage, cost (MP default; some HP). ⏳

### Hero Management
- **RPG-301** Character view: portrait, stat sheet, skills. ⏳
- **RPG-302** Edit screens for stats & skills. ⏳
- **RPG-303** Skills screen visualizes linkable skills. ⏳
- **RPG-304** Stat screen supports +/- with Potential‑driven variance (high PT may upweight, low PT may downweight). Highlight auto variance. ⏳
- **RPG-305** Tiering up deducts Potential with cost scaling by tier. ⏳

### Creation / Content
- **RPG-401** Data for Skills, Characters, Buffs, Debuffs, Terrains, Effects saved in easy‑to‑edit format (YAML/JSON). ⏳
- **RPG-402** In‑app creator/editor screens for all above entities. ⏳
- **RPG-403** Easy import pipeline (for AI‑generated content). ⏳

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

## 3. Post‑Change Verification
- [ ] Unit tests passing for affected modules.
- [ ] Turn order correctness after SPD changes.
- [ ] Effect duration ticks only after turn end.
- [ ] Damage bounds respected; no negative damage.
- [ ] Range bonus applied correctly with distance prompt.
- [ ] Summon/Aid entities life‑cycle managed.
- [ ] Mid‑battle add/remove safe (no orphan pointers).
- [ ] Potential variance highlighting correct.
- [ ] Save/load round‑trip OK.
- [ ] UI states preserved; no regressions.

---

## 4. Traceability Matrix (Sample)
| Requirement | Design Ref | Test IDs | Status |
|---|---|---|---|
| RPG-002 | DES-TurnScheduler | T-Order-001..004 | ⏳ |

> Keep expanding this table as features land.
