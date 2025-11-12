import { RangeCurveConfig } from "./types";

export const DEFAULT_RANGE_CURVES: RangeCurveConfig = {
  snipe: (distance: number) => Math.min(5, Math.floor(distance / 3)),
  shotgun: (distance: number) => {
    if (distance <= 1) return 2;
    if (distance <= 2) return 1;
    return 0;
  }
};

export const DAMAGE_CONFIG = {
  minDamage: 0
};

export const HERO_CONFIG = {
  tierPotentialCost: (tierIndex: number) => Math.max(5, (tierIndex + 1) * 5),
  maxPotential: 100,
  minPotential: 0
};

export const RNG_DEFAULT_SEED = "codex-rpg";
