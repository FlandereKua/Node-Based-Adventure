"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RNG_DEFAULT_SEED = exports.HERO_CONFIG = exports.DAMAGE_CONFIG = exports.DEFAULT_RANGE_CURVES = void 0;
exports.DEFAULT_RANGE_CURVES = {
    snipe: (distance) => Math.min(5, Math.floor(distance / 3)),
    shotgun: (distance) => {
        if (distance <= 1)
            return 2;
        if (distance <= 2)
            return 1;
        return 0;
    }
};
exports.DAMAGE_CONFIG = {
    minDamage: 0
};
exports.HERO_CONFIG = {
    tierPotentialCost: (tierIndex) => Math.max(5, (tierIndex + 1) * 5),
    maxPotential: 100,
    minPotential: 0
};
exports.RNG_DEFAULT_SEED = "codex-rpg";
