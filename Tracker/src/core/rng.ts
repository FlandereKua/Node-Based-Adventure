const GOLDEN_RATIO = 0x9e3779b97f4a7c15;

const hashSeed = (seed: string) => {
  let h = 0n;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= BigInt(seed.charCodeAt(i)) << BigInt((i % 8) * 8);
    h *= 0x100000001b3n;
  }
  return Number(h & 0xffffffffn);
};

export class SeededRNG {
  private state: number;

  constructor(seed = "codex-rpg") {
    this.state = hashSeed(seed) || 1;
  }

  next() {
    this.state = (this.state + GOLDEN_RATIO) | 0;
    let t = this.state;
    t ^= t >>> 15;
    t *= t | 1;
    t ^= t + (t ^ (t >>> 7)) * (t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  integer(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  rollDice(expr: string): number {
    const dicePattern = /^(\d+)d(\d+)([+-]\d+)?$/i;
    const match = expr.match(dicePattern);
    if (!match) {
      throw new Error(`Invalid dice expression: ${expr}`);
    }
    const count = Number(match[1]);
    const sides = Number(match[2]);
    const modifier = match[3] ? Number(match[3]) : 0;
    let total = 0;
    for (let i = 0; i < count; i += 1) {
      total += this.integer(1, sides);
    }
    return total + modifier;
  }
}
