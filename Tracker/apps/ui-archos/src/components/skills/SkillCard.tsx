import type { SkillDefinition } from '@engine/core/types';
import TagPill from '@app/components/common/TagPill';

interface Props {
  skill: SkillDefinition;
  onAcquire?: (skill: SkillDefinition) => void;
  disabled?: boolean;
}

const SkillCard = ({ skill, onAcquire, disabled }: Props) => (
  <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/70 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase text-slate-400">Tier {skill.tier}</p>
        <h3 className="text-lg font-semibold text-white">{skill.name}</h3>
      </div>
      <TagPill label={skill.type} tone={skill.type === 'Passive' ? 'warning' : 'info'} />
    </div>
    <p className="mt-2 text-sm text-slate-300">{skill.description}</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {skill.tags.map((tag) => (
        <TagPill key={tag} label={tag} tone="info" />
      ))}
    </div>
    {onAcquire && (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAcquire(skill)}
        className="mt-4 rounded-md border border-emerald-400 px-3 py-2 text-sm font-medium text-emerald-200 transition disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
      >
        {disabled ? 'Locked' : 'Acquire'}
      </button>
    )}
  </div>
);

export default SkillCard;
