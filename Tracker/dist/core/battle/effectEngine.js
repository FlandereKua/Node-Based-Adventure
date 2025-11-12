"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectEngine = void 0;
const types_1 = require("../types");
const math_1 = require("../math");
let effectCounter = 0;
class EffectEngine {
    constructor(units, onStatsChanged) {
        this.units = units;
        this.onStatsChanged = onStatsChanged;
        this.active = new Map();
    }
    apply(unitId, operations, duration) {
        const unit = this.units.get(unitId);
        if (!unit)
            return;
        const entry = {
            id: `eff_${effectCounter++}`,
            operations,
            remaining: duration,
            tags: operations.flatMap((op) => op.tagsApplied ?? [])
        };
        if (!this.active.has(unitId)) {
            this.active.set(unitId, []);
        }
        this.active.get(unitId).push(entry);
        this.recomputeUnit(unitId);
    }
    removeUnit(unitId) {
        this.active.delete(unitId);
    }
    tick(unitId) {
        const effects = this.active.get(unitId);
        if (!effects?.length)
            return;
        effects.forEach((effect) => (effect.remaining -= 1));
        const survivors = effects.filter((effect) => effect.remaining > 0);
        if (survivors.length) {
            this.active.set(unitId, survivors);
        }
        else {
            this.active.delete(unitId);
        }
        this.recomputeUnit(unitId);
    }
    recomputeUnit(unitId) {
        const unit = this.units.get(unitId);
        if (!unit)
            return;
        let nextStats = { ...unit.baseStats };
        const effects = this.active.get(unitId) ?? [];
        unit.statusTags = new Set(unit.statusTags);
        effects.forEach((effect) => {
            effect.operations.forEach((op) => {
                if (op.stat) {
                    const statKey = op.stat;
                    const value = nextStats[statKey];
                    if (op.op === "add") {
                        nextStats = (0, math_1.mergeStats)(nextStats, {
                            [statKey]: value + op.value
                        });
                    }
                    else if (op.op === "mul") {
                        nextStats = (0, math_1.mergeStats)(nextStats, {
                            [statKey]: Math.round(value * op.value)
                        });
                    }
                    else if (op.op === "set") {
                        nextStats = (0, math_1.mergeStats)(nextStats, {
                            [statKey]: op.value
                        });
                    }
                }
                op.tagsApplied?.forEach((tag) => unit.statusTags.add(tag));
            });
        });
        types_1.STAT_KEYS.forEach((stat) => {
            if (stat === "HP" || stat === "MP")
                return;
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
    importState(state) {
        this.active.clear();
        state.forEach(({ unitId, effects }) => {
            this.active.set(unitId, effects.map((effect) => ({ ...effect })));
            this.recomputeUnit(unitId);
        });
    }
}
exports.EffectEngine = EffectEngine;
