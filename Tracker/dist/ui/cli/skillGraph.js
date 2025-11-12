"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSkillLinkGraph = void 0;
const chalk_1 = __importDefault(require("chalk"));
const formatSkill = (skill, state) => {
    const label = `${skill.name} [${skill.tier}]`;
    switch (state) {
        case "owned":
            return chalk_1.default.green(`[O] ${label}`);
        case "available":
            return chalk_1.default.yellow(`[A] ${label}`);
        default:
            return chalk_1.default.gray(`[L] ${label}`);
    }
};
const getState = (hero, heroManager, skill) => {
    if (hero.skills.includes(skill.id))
        return "owned";
    return heroManager.canLearnSkill(hero, skill) ? "available" : "locked";
};
const buildSkillLinkGraph = (hero, skills, heroManager) => {
    if (!skills.length) {
        return [chalk_1.default.gray("No skills loaded in the content store.")];
    }
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
    const stateMap = new Map();
    skills.forEach((skill) => stateMap.set(skill.id, getState(hero, heroManager, skill)));
    const childMap = new Map();
    const parentMap = new Map();
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
        return [chalk_1.default.gray("Hero has no registered skills in the content store.")];
    }
    const relevant = new Set();
    while (queue.length) {
        const current = queue.shift();
        if (relevant.has(current))
            continue;
        relevant.add(current);
        const children = childMap.get(current) ?? [];
        children.forEach((childId) => {
            if (!relevant.has(childId)) {
                queue.push(childId);
            }
        });
    }
    if (!relevant.size) {
        return [chalk_1.default.gray("No linked skills discovered for this hero.")];
    }
    const orderedRoots = [...relevant]
        .filter((skillId) => {
        const parents = parentMap.get(skillId) ?? [];
        return !parents.some((parentId) => relevant.has(parentId));
    })
        .sort((a, b) => {
        const nameA = skillMap.get(a).name.toLowerCase();
        const nameB = skillMap.get(b).name.toLowerCase();
        return nameA.localeCompare(nameB);
    });
    if (!orderedRoots.length) {
        hero.skills.forEach((skillId) => {
            if (relevant.has(skillId) && !orderedRoots.includes(skillId)) {
                orderedRoots.push(skillId);
            }
        });
    }
    const lines = [];
    lines.push(chalk_1.default.blue("Legend: ") +
        chalk_1.default.green("[O] Owned ") +
        chalk_1.default.yellow("[A] Unlockable ") +
        chalk_1.default.gray("[L] Locked"));
    const renderNode = (skillId, prefix, isLast, stack) => {
        const skill = skillMap.get(skillId);
        if (!skill)
            return;
        const state = stateMap.get(skillId) ?? "locked";
        const connector = prefix ? (isLast ? "└─ " : "├─ ") : "";
        lines.push(`${prefix}${connector}${formatSkill(skill, state)}`);
        if (stack.has(skillId)) {
            lines.push(`${prefix}${isLast ? "   " : "│  "}${chalk_1.default.red("↺ Cycle detected")}`);
            return;
        }
        const children = (childMap.get(skillId) ?? [])
            .filter((childId) => relevant.has(childId))
            .sort((a, b) => {
            const nameA = skillMap.get(a).name.toLowerCase();
            const nameB = skillMap.get(b).name.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        if (!children.length)
            return;
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
exports.buildSkillLinkGraph = buildSkillLinkGraph;
