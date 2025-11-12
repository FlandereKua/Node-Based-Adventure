import { HERO_CONFIG } from "../config";
import { applyStatDelta, clamp } from "../math";
import { CharacterSheet, CoreStat, SkillDefinition, SlotConfig, TierName } from "../types";

const tierOrder: TierName[] = [
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

const tierIndex = (tier: TierName) => tierOrder.indexOf(tier);

const deriveSlots = (potential: number): SlotConfig => {
  if (potential >= 85) return { passive: 4, active: 5 };
  if (potential >= 70) return { passive: 3, active: 4 };
  if (potential >= 50) return { passive: 2, active: 3 };
  return { passive: 1, active: 2 };
};

export interface StatEditResult {
  actualDelta: number;
  highlight: "boost" | "penalty" | null;
  newValue: number;
}

export class HeroManager {
  applyStatChange(hero: CharacterSheet, stat: CoreStat, delta: number): StatEditResult {
    const potential = hero.stats.PT;
    let actualDelta = delta;
    let highlight: StatEditResult["highlight"] = null;

    if (delta > 0 && potential >= 80) {
      actualDelta += 1;
      highlight = "boost";
    } else if (delta < 0 && potential <= 25) {
      actualDelta -= 1;
      highlight = "penalty";
    }

    const updatedStats = applyStatDelta(hero.stats, stat, actualDelta);
    hero.stats = updatedStats;
    if (stat === "HP") {
      hero.stats.HP = clamp(hero.stats.HP, 1);
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

  tierUp(hero: CharacterSheet) {
    const currentIndex = tierIndex(hero.tier);
    if (currentIndex === tierOrder.length - 1) {
      throw new Error("Already at max tier");
    }
    const cost = HERO_CONFIG.tierPotentialCost(currentIndex);
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

  raisePotential(hero: CharacterSheet, amount: number) {
    hero.stats.PT = clamp(hero.stats.PT + amount, HERO_CONFIG.minPotential, HERO_CONFIG.maxPotential);
    hero.slots = deriveSlots(hero.stats.PT);
    return hero.stats.PT;
  }

  canLearnSkill(
    hero: CharacterSheet,
    skill: Pick<SkillDefinition, "tier" | "links" | "uniqueTo">
  ) {
    if (skill.uniqueTo && !skill.uniqueTo.includes(hero.id)) return false;
    if (skill.tier !== hero.tier) return false;
    if (!skill.links.length) return true;
    return hero.skills.some((ownedSkill) => skill.links.includes(ownedSkill));
  }

  learnSkill(
    hero: CharacterSheet,
    skill: Pick<SkillDefinition, "id" | "tier" | "links" | "uniqueTo">
  ) {
    if (!this.canLearnSkill(hero, skill)) {
      throw new Error("Skill requirements not met");
    }
    if (!hero.skills.includes(skill.id)) {
      hero.skills.push(skill.id);
    }
  }
}
