export const STAT_KEYS = [
  "STR",
  "DEX",
  "INT",
  "WIS",
  "CHA",
  "LCK",
  "END",
  "SPD",
  "HP",
  "MP",
  "PT"
] as const;

export type CoreStat = (typeof STAT_KEYS)[number];

export type TierName =
  | "God"
  | "Eldritch"
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Renowned"
  | "Heroic"
  | "Epic"
  | "Legendary"
  | "Mythical"
  | "Transcendence";

export interface StatsBlock {
  STR: number;
  DEX: number;
  INT: number;
  WIS: number;
  CHA: number;
  LCK: number;
  END: number;
  SPD: number;
  HP: number;
  MP: number;
  PT: number;
}

export interface SlotConfig {
  passive: number;
  active: number;
}

export interface LootEntry {
  itemId: string;
  weight: number;
}

export interface DiceSpec {
  dice: string;
  flat?: number;
}

export interface SkillHit extends DiceSpec {
  scalingMultiplier?: number;
}

export interface SkillCost {
  HP?: number;
  MP?: number;
}

export interface ScalingRule {
  stat: CoreStat;
  factor: number;
}

export interface SkillEffects {
  hits?: SkillHit[];
  cost?: SkillCost;
  scaling?: ScalingRule;
  stackingBonusPerHit?: number;
  repeat?: number;
  summon?: SummonSpec;
  aid?: boolean;
  duration?: number;
  traitsRequired?: string[];
  applyEffects?: EffectOperation[];
}

export type SkillType = "Passive" | "Active";

export interface SkillDefinition {
  id: string;
  name: string;
  type: SkillType;
  tier: TierName;
  tags: string[];
  description: string;
  effects: SkillEffects;
  links: string[];
  uniqueTo?: string[];
}

export interface EffectOperation {
  target: "self" | "ally" | "enemy" | "global";
  stat?: CoreStat;
  op: "add" | "mul" | "set";
  value: number;
  duration?: number;
  tagsApplied?: string[];
}

export interface TerrainEffect {
  stat?: CoreStat;
  tag?: string;
  op: "add" | "mul" | "resist";
  value: number;
}

export type TerrainType = "Global" | "Selective";

export interface TerrainDefinition {
  id: string;
  name: string;
  type: TerrainType;
  tags: string[];
  effects: TerrainEffect[];
}

export interface BuffDefinition {
  id: string;
  name: string;
  operations: EffectOperation[];
}

export interface DebuffDefinition extends BuffDefinition {}

export interface SummonSpec {
  id: string;
  name: string;
  ownerId?: string;
  stats: StatsBlock;
  skills: string[];
  duration: number;
  tags: string[];
}

export interface CharacterSheet {
  id: string;
  name: string;
  tier: TierName;
  stats: StatsBlock;
  traits: string[];
  skills: string[];
  slots: SlotConfig;
  lootTable: LootEntry[];
  tags: string[];
  backstory: string;
}

export interface BattleUnit {
  sheet: CharacterSheet;
  hp: number;
  mp: number;
  baseStats: StatsBlock;
  currentStats: StatsBlock;
  statusTags: Set<string>;
  isSummon?: boolean;
  ownerId?: string;
}

export interface RangeCurveConfig {
  snipe: (distance: number) => number;
  shotgun: (distance: number) => number;
}

export interface BattleLogEntry {
  type: string;
  payload: Record<string, unknown>;
}

export interface LoaderOptions {
  format?: "yaml" | "json";
}

export interface CreatorContext {
  rngSeed?: string;
}
