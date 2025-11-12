import { clamp, cloneStats } from "../math";
import {
  BattleLogEntry,
  BattleUnit,
  CharacterSheet,
  EffectOperation,
  SkillDefinition,
  StatsBlock,
  TerrainDefinition
} from "../types";
import { TargetScope, TargetingService } from "./targeting";
import { SchedulerState, TurnResult, TurnScheduler } from "./turnScheduler";
import { EffectEngine } from "./effectEngine";
import { DamageEngine, DamageResult } from "./damageEngine";
import { SeededRNG } from "../rng";
import { RNG_DEFAULT_SEED } from "../config";
import { SummonManager, SummonSnapshot } from "./summonManager";

type BattleSide = string;

export interface ExecuteSkillOptions {
  scope: TargetScope;
  targetId?: string;
  distance?: number;
}

export interface ExecuteSkillResult {
  damageReports: { targetId: string; result: DamageResult }[];
  knockedOut: string[];
  log: BattleLogEntry[];
}

export interface SerializedUnit {
  sheet: CharacterSheet;
  hp: number;
  mp: number;
  baseStats: StatsBlock;
  currentStats: StatsBlock;
  statusTags: string[];
  ownerId?: string;
  isSummon?: boolean;
  side: BattleSide;
}

export interface BattleSnapshot {
  units: Record<string, SerializedUnit>;
  scheduler: SchedulerState;
  effects: ReturnType<EffectEngine["exportState"]>;
  summons: SummonSnapshot;
  lootLog: { unitId: string; itemId: string }[];
  battleLog: BattleLogEntry[];
}

const deepClone = <T>(payload: T): T => JSON.parse(JSON.stringify(payload));

const createUnitFromSheet = (sheet: CharacterSheet): BattleUnit => {
  const baseStats = cloneStats(sheet.stats);
  return {
    sheet: deepClone(sheet),
    hp: baseStats.HP,
    mp: baseStats.MP,
    baseStats: cloneStats(baseStats),
    currentStats: cloneStats(baseStats),
    statusTags: new Set(sheet.tags)
  };
};

export class BattleEngine {
  private readonly rng: SeededRNG;
  private readonly scheduler = new TurnScheduler();
  private readonly roster = new Map<string, BattleUnit>();
  private readonly teams = new Map<string, BattleSide>();
  private readonly loot: { unitId: string; itemId: string }[] = [];
  private readonly skills = new Map<string, SkillDefinition>();
  private readonly terrains = new Map<string, TerrainDefinition>();
  private readonly effectEngine: EffectEngine;
  private readonly damageEngine: DamageEngine;
  private readonly summonManager: SummonManager;
  private readonly targeting: TargetingService;
  private battleLog: BattleLogEntry[] = [];

  constructor(skills: SkillDefinition[], terrains: TerrainDefinition[] = [], rngSeed = RNG_DEFAULT_SEED) {
    this.rng = new SeededRNG(rngSeed);
    skills.forEach((skill) => this.skills.set(skill.id, deepClone(skill)));
    terrains.forEach((terrain) => this.terrains.set(terrain.id, deepClone(terrain)));
    this.effectEngine = new EffectEngine(this.roster, (unitId, unit) => {
      this.scheduler.updateSpeed(unitId, unit.currentStats.SPD);
    });
    this.damageEngine = new DamageEngine(this.rng);
    this.summonManager = new SummonManager(this.roster, this.scheduler, this.effectEngine);
    this.targeting = new TargetingService(this.roster, this.teams);
  }

  addCombatant(sheet: CharacterSheet, side: BattleSide, customId?: string) {
    const unitId = customId ?? `${sheet.id}_${this.rng.integer(1000, 9999)}`;
    const unit = createUnitFromSheet(sheet);
    this.roster.set(unitId, unit);
    this.teams.set(unitId, side);
    this.scheduler.addUnit(unitId, unit.currentStats.SPD);
    return unitId;
  }

  removeCombatant(unitId: string) {
    this.summonManager.despawn(unitId);
    this.scheduler.removeUnit(unitId);
    this.effectEngine.removeUnit(unitId);
    this.roster.delete(unitId);
    this.teams.delete(unitId);
  }

  nextTurn(): (TurnResult & { unit: BattleUnit }) | null {
    const turn = this.scheduler.nextTurn();
    if (!turn) return null;
    const unit = this.roster.get(turn.unitId);
    if (!unit) return this.nextTurn();
    return { ...turn, unit };
  }

  completeTurn(unitId: string) {
    this.effectEngine.tick(unitId);
    this.summonManager.tick(unitId);
    this.scheduler.completeTurn(unitId);
  }

  executeSkill(attackerId: string, skillId: string, options: ExecuteSkillOptions): ExecuteSkillResult {
    const attacker = this.roster.get(attackerId);
    if (!attacker) {
      throw new Error(`Unknown attacker ${attackerId}`);
    }
    const skill = this.skills.get(skillId);
    if (!skill) throw new Error(`Unknown skill ${skillId}`);
    if (!attacker.sheet.skills.includes(skillId) && !attacker.isSummon) {
      throw new Error(`${attacker.sheet.name} cannot use ${skill.name}`);
    }
    if (skill.uniqueTo && !skill.uniqueTo.includes(attacker.sheet.id)) {
      throw new Error(`${skill.name} is unique to specific heroes`);
    }

    if (skill.effects.traitsRequired) {
      const hasTrait = skill.effects.traitsRequired.some((trait) =>
        attacker.sheet.traits.includes(trait)
      );
      if (!hasTrait) {
        throw new Error(`${attacker.sheet.name} lacks trait for ${skill.name}`);
      }
    }

    if ((skill.tags.includes("Snipe") || skill.tags.includes("Shotgun")) && options.distance === undefined) {
      throw new Error("Distance is required for ranged skill");
    }

    this.consumeCost(attacker, skill);
    const targets = this.targeting.getTargets(attackerId, options.scope, options.targetId);
    if (!targets.length) {
      throw new Error("No available targets");
    }

    const damageReports: ExecuteSkillResult["damageReports"] = [];
    const knockedOut: string[] = [];

    targets.forEach((target) => {
      const targetId = this.findUnitId(target);
      if (skill.effects.applyEffects?.length) {
        this.effectEngine.apply(targetId, skill.effects.applyEffects, skill.effects.duration ?? 1);
      }
      if (skill.effects.hits?.length) {
        const result = this.damageEngine.execute(attacker, target, skill, options.distance ?? 0);
        if (skill.tags.includes("Heal")) {
          target.hp = clamp(target.hp + result.total, 0, target.currentStats.HP);
        } else {
          target.hp = clamp(target.hp - result.total, 0);
        }
        damageReports.push({ targetId, result });
        if (target.hp <= 0) {
          knockedOut.push(targetId);
          this.handleKnockout(targetId);
        }
      }
    });

    if (skill.tags.includes("Summon") && skill.effects.summon) {
      const summonId = this.summonManager.spawn(
        attackerId,
        skill.effects.summon,
        skill.effects.aid ?? false
      );
      const side = this.teams.get(attackerId) ?? "Neutral";
      this.teams.set(summonId, side);
    }

    if (skill.tags.includes("ExtraTurn")) {
      this.scheduler.grantExtraTurn(attackerId);
    }

    const entry: BattleLogEntry = {
      type: "skill",
      payload: {
        attackerId,
        skillId,
        targets: targets.map((t) => this.findUnitId(t)),
        distance: options.distance ?? null
      }
    };
    this.battleLog.push(entry);

    return {
      damageReports,
      knockedOut,
      log: [entry]
    };
  }

  applyTerrain(terrainId: string, targetIds?: string[]) {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) throw new Error(`Unknown terrain ${terrainId}`);
    const targets = terrain.type === "Global" ? Array.from(this.roster.keys()) : targetIds ?? [];
    targets.forEach((unitId) => {
      const operations: EffectOperation[] = [];
      terrain.effects.forEach((effect) => {
        if (effect.stat) {
          operations.push({
            target: "self",
            stat: effect.stat,
            op: effect.op === "resist" ? "mul" : effect.op,
            value: effect.op === "resist" ? 1 - effect.value : effect.value,
            tagsApplied: effect.tag ? [effect.tag] : undefined
          });
        }
        if (effect.tag) {
          operations.push({
            target: "self",
            op: "add",
            value: 0,
            tagsApplied: [effect.tag]
          });
        }
      });
      if (operations.length) {
        this.effectEngine.apply(unitId, operations, Number.POSITIVE_INFINITY);
      }
    });
  }

  saveState(): BattleSnapshot {
    const units: BattleSnapshot["units"] = {};
    this.roster.forEach((unit, id) => {
      units[id] = {
        sheet: deepClone(unit.sheet),
        hp: unit.hp,
        mp: unit.mp,
        baseStats: cloneStats(unit.baseStats),
        currentStats: cloneStats(unit.currentStats),
        statusTags: Array.from(unit.statusTags),
        ownerId: unit.ownerId,
        isSummon: unit.isSummon,
        side: this.teams.get(id) ?? "Neutral"
      };
    });
    return {
      units,
      scheduler: this.scheduler.exportState(),
      effects: this.effectEngine.exportState(),
      summons: this.summonManager.exportState(),
      lootLog: [...this.loot],
      battleLog: [...this.battleLog]
    };
  }

  loadState(snapshot: BattleSnapshot) {
    this.roster.clear();
    this.teams.clear();
    Object.entries(snapshot.units).forEach(([id, data]) => {
      const unit: BattleUnit = {
        sheet: deepClone(data.sheet),
        hp: data.hp,
        mp: data.mp,
        baseStats: cloneStats(data.baseStats),
        currentStats: cloneStats(data.currentStats),
        statusTags: new Set(data.statusTags),
        ownerId: data.ownerId,
        isSummon: data.isSummon
      };
      this.roster.set(id, unit);
      this.teams.set(id, data.side);
    });
    this.scheduler.importState(snapshot.scheduler);
    this.effectEngine.importState(snapshot.effects);
    this.summonManager.importState(snapshot.summons);
    this.battleLog = [...snapshot.battleLog];
    this.loot.splice(0, this.loot.length, ...snapshot.lootLog);
  }

  getLootLog() {
    return [...this.loot];
  }

  getBattleLog() {
    return [...this.battleLog];
  }

  getUnits() {
    return Array.from(this.roster.entries()).map(([id, unit]) => ({
      id,
      unit,
      side: this.teams.get(id) ?? "Neutral"
    }));
  }

  getUnit(unitId: string) {
    return this.roster.get(unitId);
  }

  getSide(unitId: string) {
    return this.teams.get(unitId);
  }

  private consumeCost(unit: BattleUnit, skill: SkillDefinition) {
    const cost = skill.effects.cost;
    if (!cost) return;
    if (cost.MP) {
      if (unit.mp < cost.MP) throw new Error("Not enough MP");
      unit.mp -= cost.MP;
    }
    if (cost.HP) {
      if (unit.hp <= cost.HP) throw new Error("Not enough HP");
      unit.hp -= cost.HP;
    }
  }

  private handleKnockout(unitId: string) {
    const unit = this.roster.get(unitId);
    if (!unit) return;
    if (unit.isSummon) {
      this.summonManager.despawn(unitId);
      return;
    }
    this.rollLoot(unitId, unit);
    this.removeCombatant(unitId);
  }

  private rollLoot(unitId: string, unit: BattleUnit) {
    if (!unit.sheet.lootTable.length) return;
    const totalWeight = unit.sheet.lootTable.reduce((sum, entry) => sum + entry.weight, 0);
    let threshold = this.rng.next() * totalWeight;
    for (const entry of unit.sheet.lootTable) {
      if (threshold < entry.weight) {
        this.loot.push({ unitId, itemId: entry.itemId });
        return;
      }
      threshold -= entry.weight;
    }
  }

  private findUnitId(unit: BattleUnit) {
    for (const [id, candidate] of this.roster.entries()) {
      if (candidate === unit) return id;
    }
    throw new Error("Unit not registered");
  }
}
