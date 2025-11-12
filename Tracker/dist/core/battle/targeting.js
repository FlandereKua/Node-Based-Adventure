"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TargetingService = void 0;
class TargetingService {
    constructor(roster, teams) {
        this.roster = roster;
        this.teams = teams;
    }
    getTargets(actorId, scope, preferredId) {
        if (scope === "self") {
            const unit = this.roster.get(actorId);
            return unit ? [unit] : [];
        }
        const actorSide = this.teams.get(actorId);
        const entries = Array.from(this.roster.entries()).filter(([id]) => this.teams.get(id) === actorSide);
        const enemyEntries = Array.from(this.roster.entries()).filter(([id]) => this.teams.get(id) !== actorSide);
        switch (scope) {
            case "ally":
                return this.pickSpecific(entries, preferredId);
            case "enemy":
                return this.pickSpecific(enemyEntries, preferredId);
            case "all-allies":
                return entries.map(([, unit]) => unit);
            case "all-enemies":
                return enemyEntries.map(([, unit]) => unit);
            default:
                return [];
        }
    }
    pickSpecific(entries, preferredId) {
        if (preferredId) {
            const match = entries.find(([id]) => id === preferredId);
            if (match)
                return [match[1]];
        }
        if (!entries.length)
            return [];
        return [entries[0][1]];
    }
}
exports.TargetingService = TargetingService;
