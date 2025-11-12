import { useState } from 'react';
import { defaultRangeCurves } from '@app/services/rangeCurves';

const SettingsRoute = () => {
  const [seed, setSeed] = useState('archos-seed');
  const [contrast, setContrast] = useState(false);
  const [logVerbosity, setLogVerbosity] = useState<'concise' | 'verbose'>('concise');

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-white">Simulation</h2>
        <label className="mt-2 block text-sm text-slate-300">
          RNG Seed
          <input
            type="text"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
        <p className="text-xs text-slate-500">Snipe(9) bonus: {defaultRangeCurves.snipe(9)}</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-white">Accessibility</h2>
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input type="checkbox" checked={contrast} onChange={(event) => setContrast(event.target.checked)} />
          Enable high-contrast mode
        </label>
        <label className="mt-3 block text-sm text-slate-200">
          Combat log verbosity
          <select
            value={logVerbosity}
            onChange={(event) => setLogVerbosity(event.target.value as 'concise' | 'verbose')}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            <option value="concise">Concise</option>
            <option value="verbose">Verbose</option>
          </select>
        </label>
      </div>
    </section>
  );
};

export default SettingsRoute;
