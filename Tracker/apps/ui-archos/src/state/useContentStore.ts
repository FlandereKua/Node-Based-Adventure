import create from 'zustand';
import type { CharacterSheet, SkillDefinition, TerrainDefinition } from '@engine/core/types';
import type { ContentPreset } from '@app/typings/content';
import { fetchYaml } from '@app/services/httpClient';

interface ContentStoreState {
  characters: CharacterSheet[];
  skills: SkillDefinition[];
  terrains: TerrainDefinition[];
  preset: ContentPreset;
  loading: boolean;
  error?: string;
  loadContent: (preset?: ContentPreset) => Promise<void>;
}

const SOURCE_MAP: Record<ContentPreset, { characters: string; skills: string; terrains: string }> = {
  sample: {
    characters: '/data/sample/characters.yaml',
    skills: '/data/sample/skills.yaml',
    terrains: '/data/sample/terrains.yaml'
  },
  mock: {
    characters: '/data/mock/skill_graph_characters.yaml',
    skills: '/data/mock/skill_graph_skills.yaml',
    terrains: '/data/sample/terrains.yaml'
  }
};

export const useContentStore = create<ContentStoreState>((set) => ({
  characters: [],
  skills: [],
  terrains: [],
  preset: 'sample',
  loading: false,
  async loadContent(preset = 'sample') {
    set({ loading: true, error: undefined });
    try {
      const paths = SOURCE_MAP[preset];
      const [characters, skills, terrains] = await Promise.all([
        fetchYaml<CharacterSheet[]>(paths.characters),
        fetchYaml<SkillDefinition[]>(paths.skills),
        fetchYaml<TerrainDefinition[]>(paths.terrains)
      ]);
      set({ characters, skills, terrains, preset, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  }
}));
