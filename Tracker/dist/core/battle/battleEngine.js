"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleEngine = void 0;
const math_1 = require("../math");
const targeting_1 = require("./targeting");
const turnScheduler_1 = require("./turnScheduler");
const effectEngine_1 = require("./effectEngine");
const damageEngine_1 = require("./damageEngine");
const rng_1 = require("../rng");
const config_1 = require("../config");
const summonManager_1 = require("./summonManager");
const deepClone = (payload) => JSON.parse(JSON.stringify(payload));
const createUnitFromSheet = (sheet) => {
    const baseStats = (0, math_1.cloneStats)(sheet.stats);
    return {
        sheet: deepClone(sheet),
        hp: baseStats.HP,
        mp: baseStats.MP,
        baseStats: (0, math_1.cloneStats)(baseStats),
        currentStats: (0, math_1.cloneStats)(baseStats),
        statusTags: new Set(sheet.tags)
    };
};
class BattleEngine {
    constructor(skills, terrains = [], rngSeed = config_1.RNG_DEFAULT_SEED) {
        this.scheduler = new turnScheduler_1.TurnScheduler();
        this.roster = new Map();
        this.teams = new Map();
        this.loot = [];
        this.skills = new Map();
        this.terrains = new Map();
        this.battleLog = [];
        this.rng = new rng_1.SeededRNG(rngSeed);
        skills.forEach((skill) => this.skills.set(skill.id, deepClone(skill)));
        terrains.forEach((terrain) => this.terrains.set(terrain.id, deepClone(terrain)));
        this.effectEngine = new effectEngine_1.EffectEngine(this.roster, (unitId, unit) => {
            this.scheduler.updateSpeed(unitId, unit.currentStats.SPD);
        });
        this.damageEngine = new damageEngine_1.DamageEngine(this.rng);
        this.summonManager = new summonManager_1.SummonManager(this.roster, this.scheduler, this.effectEngine);
        this.targeting = new targeting_1.TargetingService(this.roster, this.teams);
    }
    addCombatant(sheet, side, customId) {
        const unitId = customId ?? `${sheet.id}_${this.rng.integer(1000, 9999)}`;
        const unit = createUnitFromSheet(sheet);
        this.roster.set(unitId, unit);
        this.teams.set(unitId, side);
        this.scheduler.addUnit(unitId, unit.currentStats.SPD);
        return unitId;
    }
    removeCombatant(unitId) {
        this.summonManager.despawn(unitId);
        this.scheduler.removeUnit(unitId);
        this.effectEngine.removeUnit(unitId);
        this.roster.delete(unitId);
        this.teams.delete(unitId);
    }
    nextTurn() {
        const turn = this.scheduler.nextTurn();
        if (!turn)
            return null;
        const unit = this.roster.get(turn.unitId);
        if (!unit)
            return this.nextTurn();
        return { ...turn, unit };
    }
    completeTurn(unitId) {
        this.effectEngine.tick(unitId);
        this.summonManager.tick(unitId);
        this.scheduler.completeTurn(unitId);
    }
    executeSkill(attackerId, skillId, options) {
        const attacker = this.roster.get(attackerId);
        if (!attacker) {
            throw new Error(`Unknown attacker ${attackerId}`);
        }
        const skill = this.skills.get(skillId);
        if (!skill)
            throw new Error(`Unknown skill ${skillId}`);
        if (!attacker.sheet.skills.includes(skillId) && !attacker.isSummon) {
            throw new Error(`${attacker.sheet.name} cannot use ${skill.name}`);
        }
        if (skill.uniqueTo && !skill.uniqueTo.includes(attacker.sheet.id)) {
            throw new Error(`${skill.name} is unique to specific heroes`);
        }
        if (skill.effects.traitsRequired) {
            const hasTrait = skill.effects.traitsRequired.some((trait) => attacker.sheet.traits.includes(trait));
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
        const damageReports = [];
        const knockedOut = [];
        targets.forEach((target) => {
            const targetId = this.findUnitId(target);
            if (skill.effects.applyEffects?.length) {
                this.effectEngine.apply(targetId, skill.effects.applyEffects, skill.effects.duration ?? 1);
            }
            if (skill.effects.hits?.length) {
                const result = this.damageEngine.execute(attacker, target, skill, options.distance ?? 0);
                if (skill.tags.includes("Heal")) {
                    target.hp = (0, math_1.clamp)(target.hp + result.total, 0, target.currentStats.HP);
                }
                else {
                    target.hp = (0, math_1.clamp)(target.hp - result.total, 0);
                }
                damageReports.push({ targetId, result });
                if (target.hp <= 0) {
                    knockedOut.push(targetId);
                    this.handleKnockout(targetId);
                }
            }
        });
        if (skill.tags.includes("Summon") && skill.effects.summon) {
            const summonId = this.summonManager.spawn(attackerId, skill.effects.summon, skill.effects.aid ?? false);
            const side = this.teams.get(attackerId) ?? "Neutral";
            this.teams.set(summonId, side);
        }
        if (skill.tags.includes("ExtraTurn")) {
            this.scheduler.grantExtraTurn(attackerId);
        }
        const entry = {
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
    applyTerrain(terrainId, targetIds) {
        const terrain = this.terrains.get(terrainId);
        if (!terrain)
            throw new Error(`Unknown terrain ${terrainId}`);
        const targets = terrain.type === "Global" ? Array.from(this.roster.keys()) : targetIds ?? [];
        targets.forEach((unitId) => {
            const operations = [];
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
    saveState() {
        const units = {};
        this.roster.forEach((unit, id) => {
            units[id] = {
                sheet: deepClone(unit.sheet),
                hp: unit.hp,
                mp: unit.mp,
                baseStats: (0, math_1.cloneStats)(unit.baseStats),
                currentStats: (0, math_1.cloneStats)(unit.currentStats),
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
    loadState(snapshot) {
        this.roster.clear();
        this.teams.clear();
        Object.entries(snapshot.units).forEach(([id, data]) => {
            const unit = {
                sheet: deepClone(data.sheet),
                hp: data.hp,
                mp: data.mp,
                baseStats: (0, math_1.cloneStats)(data.baseStats),
                currentStats: (0, math_1.cloneStats)(data.currentStats),
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
    getUnit(unitId) {
        return this.roster.get(unitId);
    }
    getSide(unitId) {
        return this.teams.get(unitId);
    }
    consumeCost(unit, skill) {
        const cost = skill.effects.cost;
        if (!cost)
            return;
        if (cost.MP) {
            if (unit.mp < cost.MP)
                throw new Error("Not enough MP");
            unit.mp -= cost.MP;
        }
        if (cost.HP) {
            if (unit.hp <= cost.HP)
                throw new Error("Not enough HP");
            unit.hp -= cost.HP;
        }
    }
    handleKnockout(unitId) {
        const unit = this.roster.get(unitId);
        if (!unit)
            return;
        if (unit.isSummon) {
            this.summonManager.despawn(unitId);
            return;
        }
        this.rollLoot(unitId, unit);
        this.removeCombatant(unitId);
    }
    rollLoot(unitId, unit) {
        if (!unit.sheet.lootTable.length)
            return;
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
    findUnitId(unit) {
        for (const [id, candidate] of this.roster.entries()) {
            if (candidate === unit)
                return id;
        }
        throw new Error("Unit not registered");
    }
}
exports.BattleEngine = BattleEngine;
