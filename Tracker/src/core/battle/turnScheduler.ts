interface UnitMeta {
  id: string;
  spd: number;
  joinOrder: number;
}

export interface TurnResult {
  unitId: string;
  turnNumber: number;
}

export interface SchedulerState {
  queue: string[];
  meta: UnitMeta[];
  joinCounter: number;
  turnCounter: number;
  acted?: string[];
}

export class TurnScheduler {
  private queue: string[] = [];
  private meta = new Map<string, UnitMeta>();
  private joinCounter = 0;
  private turnCounter = 0;
  private actedThisRound = new Set<string>();

  addUnit(id: string, spd: number) {
    if (this.meta.has(id)) return;
    const entry: UnitMeta = { id, spd, joinOrder: this.joinCounter++ };
    this.meta.set(id, entry);
    this.queue.push(id);
    this.sortQueue();
  }

  removeUnit(id: string) {
    this.meta.delete(id);
    this.queue = this.queue.filter((item) => item !== id);
    this.actedThisRound.delete(id);
  }

  updateSpeed(id: string, spd: number) {
    const meta = this.meta.get(id);
    if (!meta) return;
    meta.spd = spd;
    this.sortQueue();
  }

  grantExtraTurn(id: string) {
    if (!this.meta.has(id)) return;
    this.queue = [id, ...this.queue.filter((entry) => entry !== id)];
  }

  getOrder() {
    return [...this.queue];
  }

  nextTurn(): TurnResult | null {
    if (!this.queue.length) {
      this.reseedQueue();
    }
    if (!this.queue.length) return null;
    const unitId = this.queue.shift()!;
    this.turnCounter += 1;
    return { unitId, turnNumber: this.turnCounter };
  }

  completeTurn(unitId: string) {
    if (!this.meta.has(unitId)) return;
    this.actedThisRound.add(unitId);
    if (!this.queue.length) {
      this.reseedQueue();
    }
  }

  private sortQueue() {
    this.queue.sort((a, b) => {
      const metaA = this.meta.get(a);
      const metaB = this.meta.get(b);
      if (!metaA || !metaB) return 0;
      if (metaA.spd === metaB.spd) {
        return metaA.joinOrder - metaB.joinOrder;
      }
      return metaB.spd - metaA.spd;
    });
  }

  exportState(): SchedulerState {
    return {
      queue: [...this.queue],
      meta: Array.from(this.meta.values()).map((entry) => ({ ...entry })),
      joinCounter: this.joinCounter,
      turnCounter: this.turnCounter,
      acted: Array.from(this.actedThisRound)
    };
  }

  importState(state: SchedulerState) {
    this.queue = [...state.queue];
    this.meta = new Map(state.meta.map((entry) => [entry.id, { ...entry }]));
    this.joinCounter = state.joinCounter;
    this.turnCounter = state.turnCounter;
    this.actedThisRound = new Set(state.acted ?? []);
  }

  private reseedQueue() {
    this.queue = Array.from(this.meta.keys()).filter((id) => !this.actedThisRound.has(id));
    if (!this.queue.length) {
      this.actedThisRound.clear();
      this.queue = Array.from(this.meta.keys());
    }
    this.sortQueue();
  }
}
