import type { BattleSnapshotView } from '@app/typings/content';

interface Props {
  snapshot?: BattleSnapshotView;
}

const BattleLog = ({ snapshot }: Props) => (
  <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Combat Log</h3>
      <span className="text-xs text-slate-500">Last {snapshot?.log.length ?? 0}</span>
    </div>
    <ol className="mt-2 max-h-56 space-y-1 overflow-y-auto scroller pr-2 text-sm text-slate-200">
      {snapshot?.log.map((entry) => (
        <li key={entry.id} className="rounded-md bg-slate-900/70 px-3 py-2">
          {entry.text}
        </li>
      )) || <li className="text-slate-500">No activity recorded.</li>}
    </ol>
  </section>
);

export default BattleLog;
