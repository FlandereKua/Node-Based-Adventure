import { useState } from 'react';
import type { FormEvent } from 'react';
import type { SkillDefinition } from '@engine/core/types';

interface Props {
  skill: SkillDefinition;
  onConfirm: (distance: number) => void;
  onCancel: () => void;
}

const DistancePrompt = ({ skill, onConfirm, onCancel }: Props) => {
  const [distance, setDistance] = useState(5);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm(distance);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 text-white shadow-xl"
      >
        <h3 className="text-lg font-semibold">Distance Prompt</h3>
        <p className="text-sm text-slate-300">
          {skill.name} has the {skill.tags.find((tag) => tag === 'Snipe' || tag === 'Shotgun') ?? 'ranged'} tag.
          Enter distance to apply bonuses.
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-200">
          Distance (tiles)
          <input
            type="number"
            min={0}
            value={distance}
            onChange={(event) => setDistance(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Confirm
          </button>
        </div>
      </form>
    </div>
  );
};

export default DistancePrompt;
