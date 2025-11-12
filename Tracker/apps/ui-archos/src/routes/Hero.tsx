import { useEffect } from 'react';
import { useContentStore } from '@app/state/useContentStore';
import { useHeroStore } from '@app/state/useHeroStore';
import TagPill from '@app/components/common/TagPill';
import StatEditor from '@app/components/hero/StatEditor';
import SkillGraphView from '@app/components/hero/SkillGraphView';

const HeroRoute = () => {
  const { characters, skills } = useContentStore();
  const { activeHeroId, selectHero, applyStatDelta, tierUp, learnSkill, lastMessage, getActiveHero, getSkillGraph } =
    useHeroStore();
  const activeHero = getActiveHero();
  const graph = getSkillGraph();

  useEffect(() => {
    if (!activeHeroId && characters.length) {
      selectHero(characters[0].id);
    }
  }, [characters, activeHeroId, selectHero]);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        {characters.map((hero) => (
          <button
            key={hero.id}
            type="button"
            onClick={() => selectHero(hero.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
              hero.id === activeHeroId ? 'border-emerald-400 bg-emerald-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-200'
            }`}
          >
            <p className="text-xs uppercase text-slate-400">Tier {hero.tier}</p>
            <p className="text-base font-semibold">{hero.name}</p>
            <p className="text-xs text-slate-500">PT {hero.stats.PT}</p>
          </button>
        ))}
      </aside>
      <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        {activeHero ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-slate-400">Hero dossier</p>
                <h2 className="text-2xl font-semibold text-white">{activeHero.name}</h2>
                <p className="text-sm text-slate-300">{activeHero.backstory}</p>
              </div>
              <div className="flex items-center gap-3">
                <img src="/assets/icons/skill-available.svg" alt="Skill icon" className="h-10 w-10" />
                <TagPill label={`PT ${activeHero.stats.PT}`} tone="info" />
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Stat Editor</h3>
                  <button
                    type="button"
                    onClick={tierUp}
                    className="rounded-md border border-emerald-400 px-3 py-1 text-xs text-emerald-200"
                  >
                    Tier Up
                  </button>
                </div>
                <StatEditor hero={activeHero} onAdjust={applyStatDelta} lastMessage={lastMessage} />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Skill Graph</h3>
                <SkillGraphView
                  data={graph}
                  onSelect={(skillId) => {
                    const skill = skills.find((entry) => entry.id === skillId);
                    if (skill) learnSkill(skill);
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">No hero selected.</p>
        )}
      </section>
    </div>
  );
};

export default HeroRoute;
