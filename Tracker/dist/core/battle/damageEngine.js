"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DamageEngine = void 0;
const config_1 = require("../config");
class DamageEngine {
    constructor(rng, curves = config_1.DEFAULT_RANGE_CURVES) {
        this.rng = rng;
        this.curves = curves;
    }
    execute(attacker, defender, skill, distance = 0) {
        const hits = skill.effects.hits ?? [];
        const repeats = skill.effects.repeat ?? 1;
        const rangeBonus = this.computeRangeBonus(skill, distance);
        const perHitTotals = [];
        const scalingStat = skill.effects.scaling?.stat ?? "STR";
        const scalingFactor = skill.effects.scaling?.factor ?? 1;
        const atkStatValue = attacker.currentStats[scalingStat];
        const potentialFactor = 1 + attacker.sheet.stats.PT / 200;
        let stackingBonus = 0;
        for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
            hits.forEach((hit) => {
                const modifier = this.rng.rollDice(hit.dice) + (hit.flat ?? 0) + rangeBonus + stackingBonus;
                const statTerm = (atkStatValue * scalingFactor * potentialFactor * (hit.scalingMultiplier ?? 1)) / 2;
                let damage = Math.floor(statTerm + modifier - defender.currentStats.END);
                damage = Math.max(damage, config_1.DAMAGE_CONFIG.minDamage);
                perHitTotals.push(damage);
                stackingBonus += skill.effects.stackingBonusPerHit ?? 0;
            });
        }
        return {
            hits: perHitTotals,
            total: perHitTotals.reduce((sum, value) => sum + value, 0),
            rangeBonus,
            repeats
        };
    }
    computeRangeBonus(skill, distance) {
        if (skill.tags.includes("Snipe")) {
            return this.curves.snipe(distance);
        }
        if (skill.tags.includes("Shotgun")) {
            return this.curves.shotgun(distance);
        }
        return 0;
    }
}
exports.DamageEngine = DamageEngine;
