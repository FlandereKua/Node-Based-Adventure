import type { CharacterSheet, SkillDefinition, TerrainDefinition } from '@engine/core/types';

export type ContentPreset = 'sample' | 'mock';

export interface ContentPayload {
  characters: CharacterSheet[];
  skills: SkillDefinition[];
  terrains: TerrainDefinition[];
}

export interface TimelineEntry {
  id: string;
  name: string;
  side: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  spd: number;
  tags: string[];
}

export interface BattleSnapshotView {
  turn: number;
  currentUnitId?: string;
  timeline: TimelineEntry[];
  log: { id: string; text: string; detail?: Record<string, unknown> }[];
  terrainTags: string[];
}

export interface SkillGraphNode {
  id: string;
  name: string;
  tier: string;
  state: 'owned' | 'available' | 'locked' | 'unique';
  tags: string[];
  links: string[];
}

export interface SkillGraphEdge {
  from: string;
  to: string;
}

export interface SkillGraphData {
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
}
