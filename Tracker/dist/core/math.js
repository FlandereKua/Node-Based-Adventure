"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeStats = exports.statEntries = exports.ensureHardBounds = exports.scaleStats = exports.applyStatDelta = exports.cloneStats = exports.clamp = void 0;
const types_1 = require("./types");
const clamp = (value, min, max) => {
    if (max !== undefined) {
        return Math.min(max, Math.max(min, value));
    }
    return Math.max(min, value);
};
exports.clamp = clamp;
const cloneStats = (stats) => ({ ...stats });
exports.cloneStats = cloneStats;
const applyStatDelta = (stats, stat, delta) => {
    return { ...stats, [stat]: stats[stat] + delta };
};
exports.applyStatDelta = applyStatDelta;
const scaleStats = (stats, stat, multiplier) => {
    return { ...stats, [stat]: Math.round(stats[stat] * multiplier) };
};
exports.scaleStats = scaleStats;
const ensureHardBounds = (stats) => {
    const next = { ...stats };
    next.HP = (0, exports.clamp)(next.HP, 0);
    next.MP = (0, exports.clamp)(next.MP, 0);
    return next;
};
exports.ensureHardBounds = ensureHardBounds;
const statEntries = (stats) => {
    return types_1.STAT_KEYS.map((key) => ({ key, value: stats[key] }));
};
exports.statEntries = statEntries;
const mergeStats = (base, overrides) => ({
    ...base,
    ...overrides
});
exports.mergeStats = mergeStats;
