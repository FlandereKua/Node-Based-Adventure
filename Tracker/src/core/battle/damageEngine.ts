import { DAMAGE_CONFIG, DEFAULT_RANGE_CURVES } from "../config";
import { SeededRNG } from "../rng";
import { BattleUnit, SkillDefinition } from "../types";

export interface DamageResult {
  hits: number[];
  total: number;
  rangeBonus: number;
  repeats: number;
}

export class DamageEngine {
  constructor(private readonly rng: SeededRNG, private readonly curves = DEFAULT_RANGE_CURVES) {}

  execute(
    attacker: BattleUnit,
    defender: BattleUnit,
    skill: SkillDefinition,
    distance = 0
  ): DamageResult {
    const hits = skill.effects.hits ?? [];
    const repeats = skill.effects.repeat ?? 1;
    const rangeBonus = this.computeRangeBonus(skill, distance);
    const perHitTotals: number[] = [];
    const scalingStat = skill.effects.scaling?.stat ?? "STR";
    const scalingFactor = skill.effects.scaling?.factor ?? 1;
    const atkStatValue = attacker.currentStats[scalingStat];
    const potentialFactor = 1 + attacker.sheet.stats.PT / 200;
    let stackingBonus = 0;

    for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
      hits.forEach((hit) => {
        const modifier = this.rng.rollDice(hit.dice) + (hit.flat ?? 0) + rangeBonus + stackingBonus;
        const statTerm =
          (atkStatValue * scalingFactor * potentialFactor * (hit.scalingMultiplier ?? 1)) / 2;
        let damage = Math.floor(statTerm + modifier - defender.currentStats.END);
        damage = Math.max(damage, DAMAGE_CONFIG.minDamage);
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

  private computeRangeBonus(skill: SkillDefinition, distance: number) {
    if (skill.tags.includes("Snipe")) {
      return this.curves.snipe(distance);
    }
    if (skill.tags.includes("Shotgun")) {
      return this.curves.shotgun(distance);
    }
    return 0;
  }
}
