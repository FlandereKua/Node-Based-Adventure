import type { TimelineEntry } from '@app/typings/content';

interface Props {
  unit?: TimelineEntry;
}

const UnitPanel = ({ unit }: Props) => {
  if (!unit) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-sm text-slate-400">Select a unit to inspect stats.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 shadow">
      <p className="text-xs uppercase tracking-wide text-slate-500">Acting Unit</p>
      <h2 className="text-xl font-semibold text-white">{unit.name}</h2>
      <p className="text-sm text-slate-400">{unit.side}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between text-slate-200">
          <dt className="text-slate-400">HP</dt>
          <dd>
            {unit.hp}/{unit.maxHp}
          </dd>
        </div>
        <div className="flex items-center justify-between text-slate-200">
          <dt className="text-slate-400">MP</dt>
          <dd>
            {unit.mp}/{unit.maxMp}
          </dd>
        </div>
        <div className="flex items-center justify-between text-slate-200">
          <dt className="text-slate-400">SPD</dt>
          <dd>{unit.spd}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-400">Tags: {unit.tags.join(', ') || '—'}</p>
    </section>
  );
};

export default UnitPanel;
