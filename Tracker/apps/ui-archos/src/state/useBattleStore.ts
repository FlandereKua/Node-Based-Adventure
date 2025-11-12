import create from 'zustand';
import type { SkillDefinition } from '@engine/core/types';
import type { BattleSnapshotView } from '@app/typings/content';
import type { BattleInitPayload } from '@app/services/engineBridge';
import { BattleClient } from '@app/services/engineBridge';

const battleClient = new BattleClient();

interface DistancePromptState {
  skill: SkillDefinition;
  targetId?: string;
}

interface BattleStoreState {
  snapshot?: BattleSnapshotView;
  loading: boolean;
  pendingSkill?: SkillDefinition;
  distancePrompt?: DistancePromptState;
  error?: string;
  initialize: (payload: BattleInitPayload) => Promise<void>;
  queueSkill: (skill: SkillDefinition, targetId?: string) => void;
  confirmSkill: (distance?: number) => Promise<void>;
  cancelSkill: () => void;
}

export const useBattleStore = create<BattleStoreState>((set, get) => ({
  loading: false,
  async initialize(payload) {
    set({ loading: true, error: undefined });
    try {
      const snapshot = await battleClient.initialize(payload);
      set({ snapshot, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },
  queueSkill(skill, targetId) {
    if (skill.tags.some((tag) => tag === 'Snipe' || tag === 'Shotgun')) {
      set({ distancePrompt: { skill, targetId }, pendingSkill: skill });
      return;
    }
    set({ pendingSkill: skill, distancePrompt: undefined });
  },
  async confirmSkill(distance = 0) {
    const pendingSkill = get().pendingSkill;
    if (!pendingSkill) return;
    try {
      const snapshot = await battleClient.performAction({
        skillId: pendingSkill.id,
        targetId: get().distancePrompt?.targetId,
        distance
      });
      set({ snapshot, pendingSkill: undefined, distancePrompt: undefined });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },
  cancelSkill() {
    set({ pendingSkill: undefined, distancePrompt: undefined });
  }
}));
