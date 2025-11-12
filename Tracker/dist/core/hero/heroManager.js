"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroManager = void 0;
const config_1 = require("../config");
const math_1 = require("../math");
const tierOrder = [
    "God",
    "Eldritch",
    "Common",
    "Uncommon",
    "Rare",
    "Renowned",
    "Heroic",
    "Epic",
    "Legendary",
    "Mythical",
    "Transcendence"
];
const tierIndex = (tier) => tierOrder.indexOf(tier);
const deriveSlots = (potential) => {
    if (potential >= 85)
        return { passive: 4, active: 5 };
    if (potential >= 70)
        return { passive: 3, active: 4 };
    if (potential >= 50)
        return { passive: 2, active: 3 };
    return { passive: 1, active: 2 };
};
class HeroManager {
    applyStatChange(hero, stat, delta) {
        const potential = hero.stats.PT;
        let actualDelta = delta;
        let highlight = null;
        if (delta > 0 && potential >= 80) {
            actualDelta += 1;
            highlight = "boost";
        }
        else if (delta < 0 && potential <= 25) {
            actualDelta -= 1;
            highlight = "penalty";
        }
        const updatedStats = (0, math_1.applyStatDelta)(hero.stats, stat, actualDelta);
        hero.stats = updatedStats;
        if (stat === "HP") {
            hero.stats.HP = (0, math_1.clamp)(hero.stats.HP, 1);
        }
        if (stat === "PT") {
            hero.slots = deriveSlots(hero.stats.PT);
        }
        return {
            actualDelta,
            highlight,
            newValue: hero.stats[stat]
        };
    }
    tierUp(hero) {
        const currentIndex = tierIndex(hero.tier);
        if (currentIndex === tierOrder.length - 1) {
            throw new Error("Already at max tier");
        }
        const cost = config_1.HERO_CONFIG.tierPotentialCost(currentIndex);
        if (hero.stats.PT < cost) {
            throw new Error(`Not enough Potential (needs ${cost})`);
        }
        hero.stats.PT -= cost;
        hero.tier = tierOrder[currentIndex + 1];
        hero.slots = deriveSlots(hero.stats.PT);
        return {
            newTier: hero.tier,
            potentialLeft: hero.stats.PT,
            cost
        };
    }
    raisePotential(hero, amount) {
        hero.stats.PT = (0, math_1.clamp)(hero.stats.PT + amount, config_1.HERO_CONFIG.minPotential, config_1.HERO_CONFIG.maxPotential);
        hero.slots = deriveSlots(hero.stats.PT);
        return hero.stats.PT;
    }
    canLearnSkill(hero, skill) {
        if (skill.uniqueTo && !skill.uniqueTo.includes(hero.id))
            return false;
        if (skill.tier !== hero.tier)
            return false;
        if (!skill.links.length)
            return true;
        return hero.skills.some((ownedSkill) => skill.links.includes(ownedSkill));
    }
    learnSkill(hero, skill) {
        if (!this.canLearnSkill(hero, skill)) {
            throw new Error("Skill requirements not met");
        }
        if (!hero.skills.includes(skill.id)) {
            hero.skills.push(skill.id);
        }
    }
}
exports.HeroManager = HeroManager;
