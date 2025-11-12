import { useState } from 'react';
import { useBattleStore } from '@app/state/useBattleStore';

interface SaveSlot {
  id: string;
  label: string;
  timestamp: number;
  snapshot: string;
}

const STORAGE_KEY = 'codex-archos-saves';

const LoadSaveRoute = () => {
  const [saves, setSaves] = useState<SaveSlot[]>(() => {
    if (typeof localStorage === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as SaveSlot[]) : [];
  });
  const snapshot = useBattleStore((state) => state.snapshot);

  const persist = (next: SaveSlot[]) => {
    setSaves(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleSave = () => {
    if (!snapshot) return;
    const slot: SaveSlot = {
      id: crypto.randomUUID(),
      label: `Turn ${snapshot.turn}`,
      timestamp: Date.now(),
      snapshot: JSON.stringify(snapshot, null, 2)
    };
    persist([slot, ...saves].slice(0, 5));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!snapshot}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Save Current Battle
        </button>
        <p className="text-xs text-slate-400">Stores up to five slots locally.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {saves.map((slot) => (
          <article key={slot.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <h3 className="text-lg font-semibold text-white">{slot.label}</h3>
            <p className="text-xs text-slate-400">{new Date(slot.timestamp).toLocaleString()}</p>
            <pre className="mt-2 max-h-40 overflow-y-auto rounded bg-slate-900/70 p-2 text-xs text-slate-200">
              {slot.snapshot}
            </pre>
          </article>
        ))}
      </div>
      {!saves.length && <p className="text-sm text-slate-400">No saves yet.</p>}
    </section>
  );
};

export default LoadSaveRoute;
