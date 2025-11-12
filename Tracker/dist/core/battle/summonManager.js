"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummonManager = void 0;
const math_1 = require("../math");
let summonCounter = 0;
const buildSheetFromSummon = (spec, ownerId) => ({
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
class SummonManager {
    constructor(roster, scheduler, effectEngine) {
        this.roster = roster;
        this.scheduler = scheduler;
        this.effectEngine = effectEngine;
        this.summons = new Map();
    }
    spawn(ownerId, spec, isAid = false) {
        const sheet = buildSheetFromSummon(spec, ownerId);
        const unitId = `${sheet.id}_${summonCounter++}`;
        const unit = {
            sheet,
            hp: spec.stats.HP,
            mp: spec.stats.MP,
            baseStats: (0, math_1.cloneStats)(spec.stats),
            currentStats: (0, math_1.cloneStats)(spec.stats),
            statusTags: new Set([...spec.tags, isAid ? "Aid" : "Summon"]),
            ownerId,
            isSummon: !isAid
        };
        this.roster.set(unitId, unit);
        this.scheduler.addUnit(unitId, unit.currentStats.SPD);
        this.summons.set(unitId, { unitId, remaining: spec.duration, isAid });
        return unitId;
    }
    tick(unitId) {
        const summon = this.summons.get(unitId);
        if (!summon)
            return;
        summon.remaining -= 1;
        if (summon.remaining <= 0) {
            this.despawn(unitId);
        }
    }
    despawn(unitId) {
        if (!this.summons.has(unitId))
            return;
        this.summons.delete(unitId);
        this.scheduler.removeUnit(unitId);
        this.effectEngine.removeUnit(unitId);
        this.roster.delete(unitId);
    }
    exportState() {
        return {
            entries: Array.from(this.summons.values()).map((entry) => ({ ...entry })),
            counter: summonCounter
        };
    }
    importState(state) {
        this.summons.clear();
        state.entries.forEach((entry) => this.summons.set(entry.unitId, { ...entry }));
        summonCounter = state.counter;
    }
}
exports.SummonManager = SummonManager;
