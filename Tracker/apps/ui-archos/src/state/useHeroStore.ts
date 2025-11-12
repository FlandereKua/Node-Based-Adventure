import create from 'zustand';
import type { CharacterSheet, CoreStat, SkillDefinition } from '@engine/core/types';
import { HeroManager } from '@engine/core/hero/heroManager';
import { useContentStore } from './useContentStore';
import { buildSkillGraph } from '@app/services/skillGraph';
import type { SkillGraphData } from '@app/typings/content';

const heroManager = new HeroManager();

const cloneHero = (hero: CharacterSheet): CharacterSheet => JSON.parse(JSON.stringify(hero));

interface HeroStoreState {
  activeHeroId?: string;
  heroDrafts: Record<string, CharacterSheet>;
  lastMessage?: string;
  selectHero: (id: string) => void;
  applyStatDelta: (stat: CoreStat, delta: number) => void;
  tierUp: () => void;
  learnSkill: (skill: SkillDefinition) => void;
  getActiveHero: () => CharacterSheet | undefined;
  getSkillGraph: () => SkillGraphData | undefined;
}

export const useHeroStore = create<HeroStoreState>((set, get) => ({
  heroDrafts: {},
  selectHero(id) {
    const drafts = { ...get().heroDrafts };
    if (!drafts[id]) {
      const hero = useContentStore.getState().characters.find((char) => char.id === id);
      if (hero) drafts[id] = cloneHero(hero);
    }
    set({ activeHeroId: id, heroDrafts: drafts });
  },
  applyStatDelta(stat, delta) {
    const hero = get().getActiveHero();
    if (!hero) return;
    const result = heroManager.applyStatChange(hero, stat, delta);
    set({
      heroDrafts: { ...get().heroDrafts, [hero.id]: hero },
      lastMessage:
        result.highlight === 'boost'
          ? `Applied +${result.actualDelta} thanks to Potential`
          : result.highlight === 'penalty'
          ? `Applied ${result.actualDelta} due to low Potential`
          : `Applied ${result.actualDelta}`
    });
  },
  tierUp() {
    const hero = get().getActiveHero();
    if (!hero) return;
    try {
      heroManager.tierUp(hero);
      set({ heroDrafts: { ...get().heroDrafts, [hero.id]: hero }, lastMessage: `Tier raised to ${hero.tier}` });
    } catch (error) {
      set({ lastMessage: error instanceof Error ? error.message : String(error) });
    }
  },
  learnSkill(skill) {
    const hero = get().getActiveHero();
    if (!hero) return;
    try {
      heroManager.learnSkill(hero, skill);
      set({ heroDrafts: { ...get().heroDrafts, [hero.id]: hero }, lastMessage: `${skill.name} acquired` });
    } catch (error) {
      set({ lastMessage: error instanceof Error ? error.message : String(error) });
    }
  },
  getActiveHero() {
    const { activeHeroId, heroDrafts } = get();
    if (!activeHeroId) return undefined;
    return heroDrafts[activeHeroId];
  },
  getSkillGraph() {
    const hero = get().getActiveHero();
    if (!hero) return undefined;
    return buildSkillGraph(hero, useContentStore.getState().skills);
  }
}));
