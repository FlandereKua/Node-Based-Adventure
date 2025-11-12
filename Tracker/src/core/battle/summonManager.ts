import { BattleUnit, CharacterSheet, SummonSpec } from "../types";
import { cloneStats } from "../math";
import { TurnScheduler } from "./turnScheduler";
import { EffectEngine } from "./effectEngine";

interface SummonState {
  unitId: string;
  remaining: number;
  isAid: boolean;
}

export interface SummonSnapshot {
  entries: SummonState[];
  counter: number;
}

let summonCounter = 0;

const buildSheetFromSummon = (spec: SummonSpec, ownerId: string): CharacterSheet => ({
  id: `${spec.id}_${summonCounter}`,
  name: spec.name,
  tier: "Common",
  stats: spec.stats,
  traits: ["Summoned"],
  skills: spec.skills,
  slots: { passive: 0, active: spec.skills.length },
  lootTable: [],
  tags: spec.tags,
  backstory: `Summoned ally of ${ownerId}`
});

export class SummonManager {
  private readonly summons = new Map<string, SummonState>();

  constructor(
    private readonly roster: Map<string, BattleUnit>,
    private readonly scheduler: TurnScheduler,
    private readonly effectEngine: EffectEngine
  ) {}

  spawn(ownerId: string, spec: SummonSpec, isAid = false) {
    const sheet = buildSheetFromSummon(spec, ownerId);
    const unitId = `${sheet.id}_${summonCounter++}`;
    const unit: BattleUnit = {
      sheet,
      hp: spec.stats.HP,
      mp: spec.stats.MP,
      baseStats: cloneStats(spec.stats),
      currentStats: cloneStats(spec.stats),
      statusTags: new Set([...spec.tags, isAid ? "Aid" : "Summon"]),
      ownerId,
      isSummon: !isAid
    };
    this.roster.set(unitId, unit);
    this.scheduler.addUnit(unitId, unit.currentStats.SPD);
    this.summons.set(unitId, { unitId, remaining: spec.duration, isAid });
    return unitId;
  }

  tick(unitId: string) {
    const summon = this.summons.get(unitId);
    if (!summon) return;
    summon.remaining -= 1;
    if (summon.remaining <= 0) {
      this.despawn(unitId);
    }
  }

  despawn(unitId: string) {
    if (!this.summons.has(unitId)) return;
    this.summons.delete(unitId);
    this.scheduler.removeUnit(unitId);
    this.effectEngine.removeUnit(unitId);
    this.roster.delete(unitId);
  }

  exportState(): SummonSnapshot {
    return {
      entries: Array.from(this.summons.values()).map((entry) => ({ ...entry })),
      counter: summonCounter
    };
  }

  importState(state: SummonSnapshot) {
    this.summons.clear();
    state.entries.forEach((entry) => this.summons.set(entry.unitId, { ...entry }));
    summonCounter = state.counter;
  }
}
