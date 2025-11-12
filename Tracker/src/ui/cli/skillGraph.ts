import chalk from "chalk";
import { CharacterSheet, SkillDefinition } from "../../core/types";
import { HeroManager } from "../../core/hero/heroManager";

type SkillState = "owned" | "available" | "locked";

const formatSkill = (skill: SkillDefinition, state: SkillState) => {
  const label = `${skill.name} [${skill.tier}]`;
  switch (state) {
    case "owned":
      return chalk.green(`[O] ${label}`);
    case "available":
      return chalk.yellow(`[A] ${label}`);
    default:
      return chalk.gray(`[L] ${label}`);
  }
};

const getState = (
  hero: CharacterSheet,
  heroManager: HeroManager,
  skill: SkillDefinition
): SkillState => {
  if (hero.skills.includes(skill.id)) return "owned";
  return heroManager.canLearnSkill(hero, skill) ? "available" : "locked";
};

export const buildSkillLinkGraph = (
  hero: CharacterSheet,
  skills: SkillDefinition[],
  heroManager: HeroManager
) => {
  if (!skills.length) {
    return [chalk.gray("No skills loaded in the content store.")];
  }

  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const stateMap = new Map<string, SkillState>();
  skills.forEach((skill) => stateMap.set(skill.id, getState(hero, heroManager, skill)));

  const childMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();
  skills.forEach((skill) => {
    skill.links.forEach((linkId) => {
      const list = childMap.get(linkId) ?? [];
      list.push(skill.id);
      childMap.set(linkId, list);
      const parents = parentMap.get(skill.id) ?? [];
      parents.push(linkId);
      parentMap.set(skill.id, parents);
    });
  });

  const queue = hero.skills.filter((skillId) => skillMap.has(skillId));
  if (!queue.length) {
    return [chalk.gray("Hero has no registered skills in the content store.")];
  }

  const relevant = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (relevant.has(current)) continue;
    relevant.add(current);
    const children = childMap.get(current) ?? [];
    children.forEach((childId) => {
      if (!relevant.has(childId)) {
        queue.push(childId);
      }
    });
  }

  if (!relevant.size) {
    return [chalk.gray("No linked skills discovered for this hero.")];
  }

  const orderedRoots = [...relevant]
    .filter((skillId) => {
      const parents = parentMap.get(skillId) ?? [];
      return !parents.some((parentId) => relevant.has(parentId));
    })
    .sort((a, b) => {
      const nameA = skillMap.get(a)!.name.toLowerCase();
      const nameB = skillMap.get(b)!.name.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  if (!orderedRoots.length) {
    hero.skills.forEach((skillId) => {
      if (relevant.has(skillId) && !orderedRoots.includes(skillId)) {
        orderedRoots.push(skillId);
      }
    });
  }

  const lines: string[] = [];
  lines.push(
    chalk.blue("Legend: ") +
      chalk.green("[O] Owned ") +
      chalk.yellow("[A] Unlockable ") +
      chalk.gray("[L] Locked")
  );

  const renderNode = (skillId: string, prefix: string, isLast: boolean, stack: Set<string>) => {
    const skill = skillMap.get(skillId);
    if (!skill) return;
    const state = stateMap.get(skillId) ?? "locked";
    const connector = prefix ? (isLast ? "└─ " : "├─ ") : "";
    lines.push(`${prefix}${connector}${formatSkill(skill, state)}`);
    if (stack.has(skillId)) {
      lines.push(`${prefix}${isLast ? "   " : "│  "}${chalk.red("↺ Cycle detected")}`);
      return;
    }
    const children = (childMap.get(skillId) ?? [])
      .filter((childId) => relevant.has(childId))
      .sort((a, b) => {
        const nameA = skillMap.get(a)!.name.toLowerCase();
        const nameB = skillMap.get(b)!.name.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    if (!children.length) return;
    const nextStack = new Set(stack);
    nextStack.add(skillId);
    const nextPrefix = prefix + (isLast ? "   " : "│  ");
    children.forEach((childId, index) => {
      renderNode(childId, nextPrefix, index === children.length - 1, nextStack);
    });
  };

  orderedRoots.forEach((rootId, index) => {
    renderNode(rootId, "", index === orderedRoots.length - 1, new Set());
    if (index < orderedRoots.length - 1) {
      lines.push("");
    }
  });

  return lines;
};
