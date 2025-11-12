import type { SkillGraphData } from '@app/typings/content';

interface Props {
  data?: SkillGraphData;
  onSelect?: (skillId: string) => void;
}

const toneMap: Record<string, string> = {
  owned: 'border-emerald-400 bg-emerald-500/10 text-emerald-100',
  available: 'border-amber-400 bg-amber-500/10 text-amber-100',
  locked: 'border-slate-700 bg-slate-900 text-slate-200',
  unique: 'border-sky-400 bg-sky-500/10 text-sky-100'
};

const SkillGraphView = ({ data, onSelect }: Props) => {
  if (!data) {
    return <p className="text-sm text-slate-400">Select a hero to visualize skill links.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> [O] Owned</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> [A] Available</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" /> [L] Locked</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" /> [U] Unique</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data.nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect?.(node.id)}
            className={`rounded-xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${toneMap[node.state]}`}
          >
            <p className="text-xs uppercase text-slate-400">[{node.state.charAt(0).toUpperCase()}]</p>
            <h4 className="text-lg font-semibold text-white">{node.name}</h4>
            <p className="text-xs text-slate-300">Tier {node.tier}</p>
            <p className="mt-2 text-xs text-slate-200">{node.tags.join(', ') || 'No tags'}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SkillGraphView;
