# Turn‑Based RPG – Codex Coding Implementation Prompt

## Objective
Build a **turn-based RPG combat engine** with **hero management** and **content-creation tools**. Ship a working vertical slice: battle loop, character/skill systems, terrain/effects, hero editor, and content I/O (YAML/JSON).

## Core Requirements

### Battle Loop & Turn System
- Maintain a **turn counter** to drive buff/debuff/effect durations.
- **Dynamic turn order by SPD**. Recompute ordering immediately after any SPD change or turn-manipulation effect.
- Support **extra turns** and **repeat-action** effects.
- **Effect ticking**: durations decrement **after the acting unit’s turn ends** only.
- **Targeting**: single target, multi-enemy, multi-ally; healing can target allies.
- **Traits** on Characters and Skills unlock conditional effects.
- **Terrains**:
  - **Global**: applies to all units.
  - **Selective**: applies only to selected units/tiles.
- **Mid-battle roster changes**: allow adding/removing units safely (no orphan state).

### Damage & Range
- **Single-hit** damage: `floor(AtkStat/2 + SkillModifier - END)`, clamp at ≥ 0.
- **Multi-hit**: each hit has its own modifier; later hits can scale (stacking/curves).
- Scripted examples:
  - *Triple Thrust*: hit1 1d3, hit2 2d4, hit3 3d6.
  - *Multi-slash (Passive)*: +1 stacking damage each subsequent hit.
- **Range tags**:
  - **[Snipe]**, **[Shotgun]** require a **distance** prompt before damage.
  - Apply a configurable range bonus curve (default provided in config).

### Summons & Aids
- **[Summon]** tag on skills that spawn entities. Summoned creatures have the **[Summon]** tag.
- “Aids” creatures are spawned by a [Summon] skill but **do not** carry the [Summon] tag themselves.
- Lifecycle: initiative, duration/despawn, ownership, XP/loot handling.

### Debuffs & Loot
- Debuffs may change base stats (e.g., STR, max HP).
- **Loot tab** to record drops post-battle.

### Characters & Progression
- Stats: **STR, DEX, INT, WIS, CHA, LCK, END, SPD, HP, MP, PT (Potential), Tier**.
- **Potential (0–100)**:
  - Determines initial **Passive/Active slot counts** (random/seeded within rules).
  - Affects **growth rates** and sometimes **skill power**.
  - **Raiseable** via items/events.
- **Tier-up**: grants extra skill slots; **consumes Potential** (cost scales with tier).
- Tiers:
  1–9: *Common, Uncommon, Rare, Renowned, Heroic, Epic, Legendary, Mythical, Transcendence*  
  Sub-tiers: **God** (negative numbers), **Eldritch** (complex numbers).
- Each character: loot table, tags, backstory.

### Skills & Acquisition
- Types: **Passive**, **Active**.
- **Adjacency/Linking**: a skill may declare **multiple links** and is acquirable if the character possesses **any one** linked skill (OR semantics). All characters start at tier-0 **[Life]** (God/Eldritch have distinct origins).
- **[Unique]**: bound to specific characters.
- **Tier gating**: acquire skills only at the character’s current tier.
- Skill schema:
  - `type`, `description`, `tier`, `tags`, `effects`
  - Attack metadata: `hits`, `perHitMin`, `perHitMax`, dice/curves
  - `cost`: MP default, some HP

### Hero Management UI
- **Character view**: portrait, stats, skills.
- **Stats editor**: +/- with Potential-based variance:
  - High Potential can **up-weight** gains (e.g., +1 input becomes +2 actual) — highlight this.
  - Low Potential can **over-decrease** — highlight this.
- **Skills screen**: show **linkable** skills visually.
- **Tier-up** flow with Potential cost preview.

### Content & Tools
- Persist **Skills, Characters, Buffs, Debuffs, Terrains, Effects** in **YAML/JSON** (choose one primary, support import/export for both).
- **Creator screens** for all entities, with validation.
- **Import pipeline** for AI-generated content.

## Default Configs (Editable)
- **Range curves**:
  - Snipe: +1 damage per 3 distance units (floor), cap +5.
  - Shotgun: +2 at distance ≤1, +1 at ≤2, else +0.
- **Dice utility**: `XdY` parser with seedable RNG.
- **Clamping**: damage ≥ 0; HP/MP hard bounds; durations ≥ 0.

## Data Schemas (YAML examples)
```yaml
Character:
  id: "char_knight_001"
  name: "Alaric"
  tier: 3 # Rare
  stats: { STR: 10, DEX: 6, INT: 4, WIS: 5, CHA: 5, LCK: 3, END: 8, SPD: 7, HP: 42, MP: 12, PT: 64 }
  traits: ["Human","Knight"]
  skills: ["skill_life_0","skill_slash_1"]
  slots: { passive: 2, active: 3 }
  loot_table: [{ itemId: "potion_small", weight: 30 }, { itemId: "iron_shard", weight: 10 }]
  tags: ["Frontliner"]
  backstory: "..."
```

```yaml
Skill:
  id: "skill_triple_thrust"
  type: "Active"
  tier: 2
  tags: ["Pierce"]
  description: "Three precise thrusts."
  effects:
    hits:
      - { dice: "1d3", flat: 0 }
      - { dice: "2d4", flat: 0 }
      - { dice: "3d6", flat: 0 }
    cost: { MP: 6 }
    scaling: { stat: "DEX", factor: 0.5 } # used for (AtkStat/2)
    interactions:
      - { type: "stacking_bonus", perHit: 0 } # example extension
  links: ["skill_slash_1", "skill_pierce_1"]
```

```yaml
Terrain:
  id: "ter_swamp_field"
  type: "Selective"
  tags: ["Difficult"]
  effects:
    - { stat: "SPD", op: "mul", value: 0.8 }
    - { tag: "Fire", op: "resist", value: 0.2 }
```

## Modules
- **TurnScheduler**: SPD priority queue with live reheap on SPD changes.
- **EffectEngine**: applies timed effects; ticks on turn end; stacking rules.
- **DamageEngine**: single/multi-hit, dice rolls, range curves, clamps.
- **SummonManager**: spawn/despawn, initiative, ownership, XP/loot rules.
- **Targeting**: filters, ally/enemy scopes, multi-target.
- **HeroManager**: stat growth with Potential variance; tier-up costs.
- **ContentStore**: YAML/JSON loader, schema validators, import/export.
- **UI**: Battle (timeline, distance prompt for [Snipe]/[Shotgun], loot tab), Character, Skills (link graph), Stats, Creator.

## Acceptance Tests
1. **Dynamic SPD**: C:9 goes first, buffs B from 3→5 SPD → B acts before A:4.  
2. **Duration tick**: Apply 2-turn buff; after unit ends its turn twice, effect expires.  
3. **Multi-hit scaling**: Triple Thrust rolls 1d3/2d4/3d6; totals respect clamping.  
4. **Range prompt**: [Snipe] at distance 7 → +2 bonus (default curve).  
5. **Summon lifecycle**: Summoned unit acts in order; despawns on duration end; no state leak.  
6. **Mid-battle add/remove**: Add ally on turn 3; remove KO’ed unit; scheduler stable.  
7. **Potential variance highlight**: +1 STR input yields +2 with high PT; UI highlights.  
8. **Persistence**: Save→Load→Resume battle state without divergence.  

9. **Skill linkage** (multiple): Character owns *Slash* but not *Pierce*; *Triple Thrust* with links [Slash, Pierce] is acquirable (OR semantics).  
## Deliverables
- Engine modules, creator/editor screens, YAML/JSON schemas.
- Automated tests for the acceptance cases above.
- Keep these docs updated:
  - **requirements_tracks.md** (pre/post-change checks)
  - **change_list.md** (append entry on every change)

## Notes
- Seedable RNG for reproducible tests.
- Centralize all math in one module for balance passes.
- Encode **God/Eldritch** sub-tiers as extensible types; isolate from normal tier math.
- Ensure roster changes cannot break effect ownership/initiative queues (immutable unit IDs; teardown hooks).
