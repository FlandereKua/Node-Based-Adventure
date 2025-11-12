import chalk from "chalk";
import { describe, expect, it } from "vitest";
import { BattleEngine } from "../src/core/battle/battleEngine";
import { HeroManager } from "../src/core/hero/heroManager";
import { DamageEngine } from "../src/core/battle/damageEngine";
import { SeededRNG } from "../src/core/rng";
import {
  BattleUnit,
  CharacterSheet,
  CoreStat,
  SkillDefinition,
  SkillHit,
  StatsBlock
} from "../src/core/types";
import { buildSkillLinkGraph } from "../src/ui/cli/skillGraph";

chalk.level = 0;

const baseStats = (): StatsBlock => ({
  STR: 8,
  DEX: 8,
  INT: 6,
  WIS: 6,
  CHA: 4,
  LCK: 5,
  END: 4,
  SPD: 5,
  HP: 40,
  MP: 12,
  PT: 60
});

const makeCharacter = (
  id: string,
  overrides: {
    stats?: Partial<StatsBlock>;
    skills?: string[];
    traits?: string[];
    tier?: CharacterSheet["tier"];
    tags?: string[];
  } = {}
): CharacterSheet => ({
  id,
  name: id,
  tier: overrides.tier ?? "Common",
  stats: { ...baseStats(), ...(overrides.stats ?? {}) },
  traits: overrides.traits ?? ["Test"],
  skills: overrides.skills ?? ["skill_basic"],
  slots: { passive: 2, active: 2 },
  lootTable: [],
  tags: overrides.tags ?? [],
  backstory: "Test hero"
});

const toUnit = (sheet: CharacterSheet): BattleUnit => ({
  sheet,
  hp: sheet.stats.HP,
  mp: sheet.stats.MP,
  baseStats: { ...sheet.stats },
  currentStats: { ...sheet.stats },
  statusTags: new Set(sheet.tags)
});

const skill = (partial: Partial<SkillDefinition> & { id: string }): SkillDefinition => ({
  id: partial.id,
  name: partial.name ?? partial.id,
  type: partial.type ?? "Active",
  tier: partial.tier ?? "Common",
  tags: partial.tags ?? [],
  description: partial.description ?? partial.id,
  effects: partial.effects ?? { hits: [] as SkillHit[] },
  links: partial.links ?? ["skill_basic"],
  uniqueTo: partial.uniqueTo
});

const SKILL_BASIC = skill({
  id: "skill_basic",
  name: "Basic Strike",
  effects: {
    hits: [{ dice: "1d4", flat: 1 }],
    cost: { MP: 0 },
    scaling: { stat: "STR", factor: 0.4 }
  }
});

const SKILL_HASTE = skill({
  id: "skill_haste",
  name: "Haste",
  tags: ["Support"],
  effects: {
    applyEffects: [{ target: "ally", stat: "SPD", op: "add", value: 2 }],
    duration: 2,
    cost: { MP: 1 }
  }
});

const SKILL_FORTIFY = skill({
  id: "skill_fortify",
  name: "Fortify",
  tags: ["Buff"],
  effects: {
    applyEffects: [{ target: "self", stat: "END", op: "add", value: 2 }],
    duration: 2,
    cost: { MP: 1 }
  }
});

const SKILL_TRIPLE = skill({
  id: "skill_triple_test",
  tags: ["Pierce"],
  effects: {
    hits: [
      { dice: "1d3" },
      { dice: "2d4" },
      { dice: "3d6" }
    ],
    scaling: { stat: "DEX", factor: 0.5 }
  }
});

const SKILL_SNIPE = skill({
  id: "skill_snipe_test",
  tags: ["Snipe"],
  effects: {
    hits: [{ dice: "1d6" }],
    scaling: { stat: "DEX", factor: 0.6 }
  }
});

const SKILL_SUMMON = skill({
  id: "skill_summon_test",
  tags: ["Summon"],
  effects: {
    cost: { MP: 1 },
    summon: {
      id: "test_sprite",
      name: "Sprite",
      stats: { ...baseStats(), HP: 18, MP: 0, SPD: 4 },
      skills: ["skill_basic"],
      duration: 1,
      tags: ["Helper"]
    }
  }
});

const TEST_SKILLS = [SKILL_BASIC, SKILL_HASTE, SKILL_FORTIFY, SKILL_TRIPLE, SKILL_SNIPE, SKILL_SUMMON];

class FixedRNG extends SeededRNG {
  private queue: number[];
  constructor(values: number[]) {
    super("fixed");
    this.queue = [...values];
  }

  override rollDice(): number {
    return this.queue.shift() ?? 1;
  }
}

describe("Acceptance criteria", () => {
  it("Dynamic SPD order updates after buffs", () => {
    const engine = new BattleEngine([SKILL_BASIC, SKILL_HASTE], [], "spd-seed");
    const cId = engine.addCombatant(makeCharacter("C", { stats: { SPD: 9 }, skills: ["skill_haste"] }), "Heroes", "C");
    const bId = engine.addCombatant(makeCharacter("B", { stats: { SPD: 3 } }), "Heroes", "B");
    const aId = engine.addCombatant(makeCharacter("A", { stats: { SPD: 4 } }), "Heroes", "A");

    expect(engine.nextTurn()?.unitId).toBe(cId);
    engine.executeSkill(cId, "skill_haste", { scope: "ally", targetId: bId });
    engine.completeTurn(cId);
    expect(engine.nextTurn()?.unitId).toBe(bId);
    expect(engine.nextTurn()?.unitId).toBe(aId);
  });

  it("Effect durations tick only after the owner's turn ends", () => {
    const engine = new BattleEngine([SKILL_FORTIFY], [], "buff-seed");
    const heroId = engine.addCombatant(makeCharacter("Hero", { skills: ["skill_fortify"], stats: { END: 5 } }), "Heroes", "Hero");
    const foeId = engine.addCombatant(makeCharacter("Foe"), "Enemies", "Foe");

    engine.nextTurn();
    engine.executeSkill(heroId, "skill_fortify", { scope: "self" });
    const hero = engine.getUnit(heroId)!;
    expect(hero.currentStats.END).toBe(7);
    engine.completeTurn(heroId);

    const foeTurn = engine.nextTurn();
    expect(foeTurn?.unitId).toBe(foeId);
    engine.completeTurn(foeId);

    engine.nextTurn();
    engine.completeTurn(heroId);
    expect(engine.getUnit(heroId)?.currentStats.END).toBe(5);
  });

  it("Multi-hit skills roll dice per hit and clamp damage", () => {
    const rng = new FixedRNG([2, 5, 10]);
    const damageEngine = new DamageEngine(rng);
    const attackerSheet = makeCharacter("Attacker", { stats: { DEX: 12, PT: 60 } });
    const defenderSheet = makeCharacter("Defender", { stats: { END: 2 } });
    const result = damageEngine.execute(toUnit(attackerSheet), toUnit(defenderSheet), SKILL_TRIPLE);
    expect(result.hits).toEqual([3, 6, 11]);
    expect(result.total).toBe(20);
  });

  it("Snipe range bonuses apply based on distance", () => {
    const rng = new FixedRNG([4]);
    const damageEngine = new DamageEngine(rng);
    const attacker = toUnit(makeCharacter("Sniper", { stats: { DEX: 12 } }));
    const defender = toUnit(makeCharacter("Target"));
    const result = damageEngine.execute(attacker, defender, SKILL_SNIPE, 7);
    expect(result.rangeBonus).toBe(2);
    expect(result.hits[0]).toBeGreaterThanOrEqual(0);
  });

  it("Summons act then despawn when duration ends", () => {
    const engine = new BattleEngine([SKILL_SUMMON, SKILL_BASIC], [], "summon-seed");
    const casterId = engine.addCombatant(makeCharacter("Caster", { skills: ["skill_summon_test"] }), "Heroes", "Caster");
    const foeId = engine.addCombatant(makeCharacter("Enemy"), "Enemies", "Enemy");

    engine.nextTurn();
    engine.executeSkill(casterId, "skill_summon_test", { scope: "self" });
    engine.completeTurn(casterId);
    const summonEntry = engine.getUnits().find((entry) => entry.unit.isSummon);
    expect(summonEntry).toBeTruthy();
    const summonId = summonEntry!.id;

    const nextTurn = engine.nextTurn();
    expect(nextTurn?.unitId).toBe(foeId);
    engine.completeTurn(foeId);

    const summonTurn = engine.nextTurn();
    expect(summonTurn?.unitId).toBe(summonId);
    engine.completeTurn(summonId);
    expect(engine.getUnit(summonId)).toBeUndefined();
  });

  it("Roster changes mid-battle remain stable", () => {
    const engine = new BattleEngine([SKILL_BASIC], [], "roster-seed");
    const heroId = engine.addCombatant(makeCharacter("Hero"), "Heroes", "Hero");
    const foeId = engine.addCombatant(makeCharacter("Foe"), "Enemies", "Foe");

    expect(engine.nextTurn()?.unitId).toBe(heroId);
    engine.completeTurn(heroId);
    const lateAllyId = engine.addCombatant(makeCharacter("Reinforcement"), "Heroes", "Reinforcement");
    expect(engine.getUnits().some((entry) => entry.id === lateAllyId)).toBe(true);
    engine.removeCombatant(foeId);
    expect(engine.getUnit(foeId)).toBeUndefined();
    expect(() => engine.nextTurn()).not.toThrow();
  });

  it("Potential variance highlights boosts and penalties", () => {
    const heroManager = new HeroManager();
    const prodigy = makeCharacter("Prodigy", { stats: { PT: 90 } });
    const result = heroManager.applyStatChange(prodigy, "STR", 1);
    expect(result.highlight).toBe("boost");
    expect(result.actualDelta).toBeGreaterThan(1);

    const struggler = makeCharacter("Struggler", { stats: { PT: 20 } });
    const penalty = heroManager.applyStatChange(struggler, "STR", -1);
    expect(penalty.highlight).toBe("penalty");
    expect(penalty.actualDelta).toBeLessThan(-1);
  });

  it("Battle state can save, load, and resume", () => {
    const engine = new BattleEngine([SKILL_BASIC], [], "persist-seed");
    const heroId = engine.addCombatant(makeCharacter("Hero"), "Heroes", "Hero");
    const foeId = engine.addCombatant(makeCharacter("Foe"), "Enemies", "Foe");

    engine.nextTurn();
    engine.executeSkill(heroId, "skill_basic", { scope: "enemy", targetId: foeId });
    engine.completeTurn(heroId);
    const snapshot = engine.saveState();

    const resumed = new BattleEngine([SKILL_BASIC], [], "persist-seed");
    resumed.loadState(snapshot);
    const turn = resumed.nextTurn();
    expect(turn?.unitId).toBe(foeId);
    expect(resumed.getUnit(foeId)?.hp).toBeLessThan(resumed.getUnit(foeId)?.currentStats.HP ?? 0);
  });

  it("Skill links unlock with OR semantics", () => {
    const heroManager = new HeroManager();
    const hero = makeCharacter("Linker", { skills: ["skill_slash"] });
    const linkedSkill: SkillDefinition = {
      id: "skill_triple_thrust",
      name: "Triple Thrust",
      type: "Active",
      tier: "Common",
      tags: ["Pierce"],
      description: "",
      effects: { hits: [{ dice: "1d4" }] },
      links: ["skill_slash", "skill_pierce"]
    };
    expect(heroManager.canLearnSkill(hero, linkedSkill)).toBe(true);
    hero.skills = [];
    expect(heroManager.canLearnSkill(hero, linkedSkill)).toBe(false);
  });

  it("Skill link graph highlights owned/available paths", () => {
    const heroManager = new HeroManager();
    const hero = makeCharacter("GraphHero", { skills: ["skill_seed_root"] });
    const graphSkills = [
      skill({ id: "skill_seed_root", name: "Root Node", links: [] }),
      skill({ id: "skill_branch", name: "Branch Node", tier: hero.tier, links: ["skill_seed_root"] }),
      skill({
        id: "skill_high_tier",
        name: "Mythic Node",
        tier: "Legendary",
        links: ["skill_branch"]
      })
    ];
    const lines = buildSkillLinkGraph(hero, graphSkills, heroManager);
    const plain = lines.join("\n");
    expect(plain).toContain("Root Node");
    expect(plain).toContain("Branch Node");
    expect(plain).toContain("Mythic Node");
  });
});
