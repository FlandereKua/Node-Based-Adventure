import { useEffect, useMemo } from 'react';
import { useContentStore } from '@app/state/useContentStore';
import { useBattleStore } from '@app/state/useBattleStore';
import type { SkillDefinition } from '@engine/core/types';
import BattleTimeline from '@app/components/battle/BattleTimeline';
import UnitPanel from '@app/components/battle/UnitPanel';
import DistancePrompt from '@app/components/battle/DistancePrompt';
import BattleLog from '@app/components/battle/BattleLog';
import TagPill from '@app/components/common/TagPill';

const BattleRoute = () => {
  const { characters, skills, terrains, loading } = useContentStore();
  const { snapshot, initialize, pendingSkill, queueSkill, confirmSkill, cancelSkill, distancePrompt } =
    useBattleStore();

  useEffect(() => {
    if (!characters.length || !skills.length || !terrains.length) return;
    initialize({ characters, skills, terrains });
  }, [characters, skills, terrains, initialize]);

  const currentUnit = useMemo(
    () => snapshot?.timeline.find((entry) => entry.id === snapshot.currentUnitId) ?? snapshot?.timeline[0],
    [snapshot]
  );

  const currentHero = useMemo(
    () => characters.find((char) => char.id === currentUnit?.id),
    [characters, currentUnit?.id]
  );

  const availableSkills = useMemo(() => {
    if (!currentHero) return [] as SkillDefinition[];
    return currentHero.skills
      .map((skillId) => skills.find((skill) => skill.id === skillId))
      .filter((entry): entry is SkillDefinition => Boolean(entry));
  }, [currentHero, skills]);

  if (loading && !snapshot) {
    return <p className="text-slate-400">Loading encounter…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr_260px]">
        <UnitPanel unit={currentUnit} />
        <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Turn {snapshot?.turn ?? 1}</p>
              <h2 className="text-xl font-semibold text-white">Battle Board</h2>
            </div>
            <TagPill label="SPD dictates order" tone="info" />
          </header>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {snapshot?.timeline.map((unit) => (
              <div
                key={unit.id}
                className={`rounded-lg border px-3 py-3 text-center ${
                  unit.id === currentUnit?.id ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/60'
                }`}
              >
                <p className="text-sm font-semibold text-white">{unit.name}</p>
                <p className="text-xs text-slate-400">{unit.side}</p>
                <p className="text-xs text-slate-300">
                  HP {unit.hp}/{unit.maxHp}
                </p>
              </div>
            )) || <p className="text-sm text-slate-400">No units deployed.</p>}
          </div>
          <div className="mt-4 border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-300">Action Bar</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {availableSkills.map((skill, index) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => queueSkill(skill)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                    pendingSkill?.id === skill.id
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-900/70'
                  }`}
                >
                  <span className="font-semibold text-white">{index + 1}. {skill.name}</span>
                  <p className="text-xs text-slate-400">{skill.tags.join(', ') || 'No tags'}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
        <BattleTimeline entries={snapshot?.timeline ?? []} currentUnitId={currentUnit?.id} />
      </div>
      <BattleLog snapshot={snapshot} />
      {distancePrompt && (
        <DistancePrompt
          skill={distancePrompt.skill}
          onConfirm={(value) => confirmSkill(value)}
          onCancel={cancelSkill}
        />
      )}
    </div>
  );
};

export default BattleRoute;
