import { useMemo, useState } from 'react';
import { stringify } from 'yaml';
import YamlEditor from '@app/components/creator/YamlEditor';

const MODES = [
  { id: 'skill', label: 'Skill' },
  { id: 'character', label: 'Character' },
  { id: 'terrain', label: 'Terrain' }
] as const;

type Mode = (typeof MODES)[number]['id'];

const CreatorRoute = () => {
  const [mode, setMode] = useState<Mode>('skill');
  const [payload, setPayload] = useState<Record<string, unknown>>({
    name: 'New Skill',
    tier: 'Common',
    tags: ['Strike'],
    description: 'Describe the ability…'
  });

  const yaml = useMemo(() => stringify({ type: mode, ...payload }), [mode, payload]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setMode(entry.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              entry.id === mode ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-200'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <label className="block text-sm font-medium text-slate-200">
            Name
            <input
              type="text"
              value={(payload.name as string) ?? ''}
              onChange={(event) => setPayload({ ...payload, name: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Tier
            <input
              type="text"
              value={(payload.tier as string) ?? ''}
              onChange={(event) => setPayload({ ...payload, tier: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Tags (comma separated)
            <input
              type="text"
              value={Array.isArray(payload.tags) ? payload.tags.join(', ') : ''}
              onChange={(event) =>
                setPayload({
                  ...payload,
                  tags: event.target.value
                    .split(',')
                    .map((token) => token.trim())
                    .filter(Boolean)
                })
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Description
            <textarea
              value={(payload.description as string) ?? ''}
              onChange={(event) => setPayload({ ...payload, description: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
        </form>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">YAML Preview</h3>
          <YamlEditor value={yaml} onChange={() => {}} />
          <p className="mt-2 text-xs text-slate-400">Copy into data files or import via Load/Save.</p>
        </div>
      </div>
    </div>
  );
};

export default CreatorRoute;
