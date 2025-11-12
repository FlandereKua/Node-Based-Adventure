import { useMemo, useState } from 'react';
import { useContentStore } from '@app/state/useContentStore';
import { useHeroStore } from '@app/state/useHeroStore';
import SkillCard from '@app/components/skills/SkillCard';

const SkillsRoute = () => {
  const { skills } = useContentStore();
  const { learnSkill } = useHeroStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return skills.filter((skill) =>
      !lower ||
      skill.name.toLowerCase().includes(lower) ||
      skill.tags.some((tag) => tag.toLowerCase().includes(lower))
    );
  }, [skills, query]);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search skills or tags"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        <p className="text-xs text-slate-500">{filtered.length} skills</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filtered.map((skill) => (
          <SkillCard key={skill.id} skill={skill} onAcquire={learnSkill} />
        ))}
      </div>
      {!filtered.length && <p className="mt-4 text-sm text-slate-400">No skills match the filter.</p>}
    </section>
  );
};

export default SkillsRoute;
