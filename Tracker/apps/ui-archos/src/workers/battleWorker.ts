import { BattleEngine } from '@engine/core/battle/battleEngine';
import type { CharacterSheet, SkillDefinition, TerrainDefinition } from '@engine/core/types';
import type { BattleSnapshotView } from '@app/typings/content';
import { deriveTimeline, snapshotFromEngine } from '@app/services/engineBridge';

interface InitPayload {
  characters: CharacterSheet[];
  skills: SkillDefinition[];
  terrains: TerrainDefinition[];
}

interface ActionPayload {
  skillId: string;
  targetId?: string;
  distance?: number;
}

type WorkerMessage = {
  id: string;
  type: 'init' | 'action' | 'advance';
  payload?: unknown;
};

let engine: BattleEngine | undefined;
let currentTurn: ReturnType<BattleEngine['nextTurn']> | null = null;

const ensureEngine = () => {
  if (!engine) throw new Error('Battle engine not initialized');
  return engine;
};

const initialize = (payload: InitPayload) => {
  engine = new BattleEngine(payload.skills, payload.terrains);
  const heroes = payload.characters.filter((char) => !char.tags.includes('Enemy')).slice(0, 3);
  const enemies = payload.characters.filter((char) => char.tags.includes('Enemy')).slice(0, 3);
  heroes.forEach((hero) => engine!.addCombatant(hero, 'Heroes', hero.id));
  enemies.forEach((enemy) => engine!.addCombatant(enemy, 'Enemies', enemy.id));
  currentTurn = engine!.nextTurn();
  return snapshotFromEngine(engine!, currentTurn?.turnNumber ?? 1);
};

const performAction = ({ skillId, targetId, distance }: ActionPayload) => {
  const activeTurn = currentTurn ?? ensureEngine().nextTurn();
  if (!activeTurn) throw new Error('No unit ready to act');
  const actorId = activeTurn.unitId;
  ensureEngine().executeSkill(actorId, skillId, { scope: 'enemy', targetId, distance });
  ensureEngine().completeTurn(actorId);
  currentTurn = ensureEngine().nextTurn();
  return snapshotFromEngine(ensureEngine(), currentTurn?.turnNumber ?? activeTurn.turnNumber + 1);
};

const serialize = (): BattleSnapshotView => {
  const timeline = deriveTimeline(ensureEngine());
  return {
    turn: currentTurn?.turnNumber ?? 1,
    currentUnitId: currentTurn?.unitId ?? timeline[0]?.id,
    timeline,
    log: ensureEngine()
      .getBattleLog()
      .slice(-20)
      .map((entry, idx) => ({ id: `${entry.type}-${idx}`, text: entry.type, detail: entry.payload })),
    terrainTags: []
  };
};

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  try {
    let payload: BattleSnapshotView;
    switch (message.type) {
      case 'init':
        payload = initialize(message.payload as InitPayload);
        break;
      case 'action':
        payload = performAction(message.payload as ActionPayload);
        break;
      case 'advance':
        currentTurn = ensureEngine().nextTurn();
        payload = serialize();
        break;
      default:
        payload = serialize();
    }
    self.postMessage({ id: message.id, success: true, payload });
  } catch (error) {
    self.postMessage({
      id: message.id,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export {};
