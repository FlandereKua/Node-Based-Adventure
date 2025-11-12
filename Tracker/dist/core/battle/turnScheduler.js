"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnScheduler = void 0;
class TurnScheduler {
    constructor() {
        this.queue = [];
        this.meta = new Map();
        this.joinCounter = 0;
        this.turnCounter = 0;
        this.actedThisRound = new Set();
    }
    addUnit(id, spd) {
        if (this.meta.has(id))
            return;
        const entry = { id, spd, joinOrder: this.joinCounter++ };
        this.meta.set(id, entry);
        this.queue.push(id);
        this.sortQueue();
    }
    removeUnit(id) {
        this.meta.delete(id);
        this.queue = this.queue.filter((item) => item !== id);
        this.actedThisRound.delete(id);
    }
    updateSpeed(id, spd) {
        const meta = this.meta.get(id);
        if (!meta)
            return;
        meta.spd = spd;
        this.sortQueue();
    }
    grantExtraTurn(id) {
        if (!this.meta.has(id))
            return;
        this.queue = [id, ...this.queue.filter((entry) => entry !== id)];
    }
    getOrder() {
        return [...this.queue];
    }
    nextTurn() {
        if (!this.queue.length) {
            this.reseedQueue();
        }
        if (!this.queue.length)
            return null;
        const unitId = this.queue.shift();
        this.turnCounter += 1;
        return { unitId, turnNumber: this.turnCounter };
    }
    completeTurn(unitId) {
        if (!this.meta.has(unitId))
            return;
        this.actedThisRound.add(unitId);
        if (!this.queue.length) {
            this.reseedQueue();
        }
    }
    sortQueue() {
        this.queue.sort((a, b) => {
            const metaA = this.meta.get(a);
            const metaB = this.meta.get(b);
            if (!metaA || !metaB)
                return 0;
            if (metaA.spd === metaB.spd) {
                return metaA.joinOrder - metaB.joinOrder;
            }
            return metaB.spd - metaA.spd;
        });
    }
    exportState() {
        return {
            queue: [...this.queue],
            meta: Array.from(this.meta.values()).map((entry) => ({ ...entry })),
            joinCounter: this.joinCounter,
            turnCounter: this.turnCounter,
            acted: Array.from(this.actedThisRound)
        };
    }
    importState(state) {
        this.queue = [...state.queue];
        this.meta = new Map(state.meta.map((entry) => [entry.id, { ...entry }]));
        this.joinCounter = state.joinCounter;
        this.turnCounter = state.turnCounter;
        this.actedThisRound = new Set(state.acted ?? []);
    }
    reseedQueue() {
        this.queue = Array.from(this.meta.keys()).filter((id) => !this.actedThisRound.has(id));
        if (!this.queue.length) {
            this.actedThisRound.clear();
            this.queue = Array.from(this.meta.keys());
        }
        this.sortQueue();
    }
}
exports.TurnScheduler = TurnScheduler;
