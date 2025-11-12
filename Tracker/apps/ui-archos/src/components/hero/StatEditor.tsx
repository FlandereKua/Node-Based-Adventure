import type { CharacterSheet, CoreStat } from '@engine/core/types';

interface Props {
  hero?: CharacterSheet;
  onAdjust: (stat: CoreStat, delta: number) => void;
  lastMessage?: string;
}

const STAT_KEYS: CoreStat[] = ['STR', 'DEX', 'INT', 'WIS', 'CHA', 'LCK', 'END', 'SPD', 'HP', 'MP', 'PT'];

const StatEditor = ({ hero, onAdjust, lastMessage }: Props) => {
  if (!hero) {
    return <p className="text-sm text-slate-400">Select a hero to edit stats.</p>;
  }

  return (
    <div className="space-y-3">
      {STAT_KEYS.map((stat) => (
        <div key={stat} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-white">{stat}</p>
            <p className="text-xs text-slate-400">Current: {hero.stats[stat]}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Decrease ${stat}`}
              onClick={() => onAdjust(stat, -1)}
              className="rounded-md border border-slate-700 px-3 py-1 text-lg text-slate-200 hover:border-rose-400"
            >
              −
            </button>
            <button
              type="button"
              aria-label={`Increase ${stat}`}
              onClick={() => onAdjust(stat, 1)}
              className="rounded-md border border-slate-700 px-3 py-1 text-lg text-slate-200 hover:border-emerald-400"
            >
              +
            </button>
          </div>
        </div>
      ))}
      {lastMessage && <p className="text-xs text-emerald-300">{lastMessage}</p>}
    </div>
  );
};

export default StatEditor;
