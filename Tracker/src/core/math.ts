import { CoreStat, STAT_KEYS, StatsBlock } from "./types";

export const clamp = (value: number, min: number, max?: number) => {
  if (max !== undefined) {
    return Math.min(max, Math.max(min, value));
  }
  return Math.max(min, value);
};

export const cloneStats = (stats: StatsBlock): StatsBlock => ({ ...stats });

export const applyStatDelta = (
  stats: StatsBlock,
  stat: CoreStat,
  delta: number
): StatsBlock => {
  return { ...stats, [stat]: stats[stat] + delta } as StatsBlock;
};

export const scaleStats = (
  stats: StatsBlock,
  stat: CoreStat,
  multiplier: number
): StatsBlock => {
  return { ...stats, [stat]: Math.round(stats[stat] * multiplier) } as StatsBlock;
};

export const ensureHardBounds = (stats: StatsBlock): StatsBlock => {
  const next = { ...stats } as StatsBlock;
  next.HP = clamp(next.HP, 0);
  next.MP = clamp(next.MP, 0);
  return next;
};

export const statEntries = (stats: StatsBlock) => {
  return STAT_KEYS.map((key) => ({ key, value: stats[key] }));
};

export const mergeStats = (base: StatsBlock, overrides?: Partial<StatsBlock>): StatsBlock => ({
  ...base,
  ...overrides
});
