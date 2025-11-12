import { BattleUnit, EffectOperation, STAT_KEYS } from "../types";
import { mergeStats } from "../math";

interface ActiveEffect {
  id: string;
  operations: EffectOperation[];
  remaining: number;
  tags: string[];
}

let effectCounter = 0;

export class EffectEngine {
  private active = new Map<string, ActiveEffect[]>();

  constructor(
    private readonly units: Map<string, BattleUnit>,
    private readonly onStatsChanged?: (unitId: string, unit: BattleUnit) => void
  ) {}

  apply(unitId: string, operations: EffectOperation[], duration: number) {
    const unit = this.units.get(unitId);
    if (!unit) return;
    const entry: ActiveEffect = {
      id: `eff_${effectCounter++}`,
      operations,
      remaining: duration,
      tags: operations.flatMap((op) => op.tagsApplied ?? [])
    };
    if (!this.active.has(unitId)) {
      this.active.set(unitId, []);
    }
    this.active.get(unitId)!.push(entry);
    this.recomputeUnit(unitId);
  }

  removeUnit(unitId: string) {
    this.active.delete(unitId);
  }

  tick(unitId: string) {
    const effects = this.active.get(unitId);
    if (!effects?.length) return;
    effects.forEach((effect) => (effect.remaining -= 1));
    const survivors = effects.filter((effect) => effect.remaining > 0);
    if (survivors.length) {
      this.active.set(unitId, survivors);
    } else {
      this.active.delete(unitId);
    }
    this.recomputeUnit(unitId);
  }

  recomputeUnit(unitId: string) {
    const unit = this.units.get(unitId);
    if (!unit) return;
    let nextStats = { ...unit.baseStats };
    const effects = this.active.get(unitId) ?? [];
    unit.statusTags = new Set(unit.statusTags);
    effects.forEach((effect) => {
      effect.operations.forEach((op) => {
        if (op.stat) {
          const statKey = op.stat;
          const value = nextStats[statKey];
          if (op.op === "add") {
            nextStats = mergeStats(nextStats, {
              [statKey]: value + op.value
            } as never);
          } else if (op.op === "mul") {
            nextStats = mergeStats(nextStats, {
              [statKey]: Math.round(value * op.value)
            } as never);
          } else if (op.op === "set") {
            nextStats = mergeStats(nextStats, {
              [statKey]: op.value
            } as never);
          }
        }
        op.tagsApplied?.forEach((tag) => unit.statusTags.add(tag));
      });
    });
    STAT_KEYS.forEach((stat) => {
      if (stat === "HP" || stat === "MP") return;
      nextStats[stat] = Math.max(0, nextStats[stat]);
    });
    unit.currentStats = nextStats;
    this.onStatsChanged?.(unitId, unit);
  }

  exportState() {
    return Array.from(this.active.entries()).map(([unitId, effects]) => ({
      unitId,
      effects: effects.map((effect) => ({
        id: effect.id,
        operations: effect.operations,
        remaining: effect.remaining,
        tags: effect.tags
      }))
    }));
  }

  importState(state: ReturnType<EffectEngine["exportState"]>) {
    this.active.clear();
    state.forEach(({ unitId, effects }) => {
      this.active.set(
        unitId,
        effects.map((effect) => ({ ...effect }))
      );
      this.recomputeUnit(unitId);
    });
  }
}
