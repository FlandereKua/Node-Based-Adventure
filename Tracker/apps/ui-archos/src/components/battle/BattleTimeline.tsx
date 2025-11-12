import type { TimelineEntry } from '@app/typings/content';

interface Props {
  entries: TimelineEntry[];
  currentUnitId?: string;
}

const BattleTimeline = ({ entries, currentUnitId }: Props) => (
  <section aria-label="Turn timeline" className="space-y-2">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Timeline</h3>
      <span className="text-xs text-slate-500">SPD driven</span>
    </div>
    <ol className="space-y-1">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={`rounded-md border px-3 py-2 text-sm transition ${
            entry.id === currentUnitId ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100' : 'border-slate-800 bg-slate-900 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{entry.name}</span>
            <span className="text-xs text-slate-400">SPD {entry.spd}</span>
          </div>
          <p className="text-xs text-slate-500">
            HP {entry.hp}/{entry.maxHp} · MP {entry.mp}/{entry.maxMp}
          </p>
        </li>
      ))}
    </ol>
  </section>
);

export default BattleTimeline;
