"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const chalk_1 = __importDefault(require("chalk"));
const promises_2 = require("readline/promises");
const process_1 = require("process");
const contentStore_1 = require("./content/contentStore");
const heroManager_1 = require("./core/hero/heroManager");
const battleEngine_1 = require("./core/battle/battleEngine");
const helpers_1 = require("./ui/cli/helpers");
const skillGraph_1 = require("./ui/cli/skillGraph");
const types_1 = require("./core/types");
const DATA_DIR = path_1.default.resolve(__dirname, "..", "data", "sample");
const SAMPLE_FILES = {
    characters: "characters.yaml",
    skills: "skills.yaml",
    terrains: "terrains.yaml"
};
const needsDistance = (skill) => skill.tags.includes("Snipe") || skill.tags.includes("Shotgun");
const inferScope = (skill) => {
    if (skill.tags.includes("Heal"))
        return "ally";
    if (skill.tags.includes("Summon"))
        return "self";
    if (skill.tags.includes("Shotgun"))
        return "all-enemies";
    return "enemy";
};
const defaultDistance = (skill) => {
    if (skill.tags.includes("Snipe"))
        return 7;
    if (skill.tags.includes("Shotgun"))
        return 1;
    return 0;
};
const toList = (value) => value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
const parseLoot = (value) => value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((entry) => {
    const [itemId, weightStr] = entry.split(":");
    return { itemId: itemId.trim(), weight: Number(weightStr ?? 10) };
});
const addEntity = (store, entity, payload) => {
    store.importFromString(entity, JSON.stringify([payload]), "json");
};
async function runBattleDemo(store, rl) {
    const skills = store.listSkills();
    const terrains = store.listTerrains();
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
    const engine = new battleEngine_1.BattleEngine(skills, terrains);
    const heroes = store.listCharacters().filter((char) => !char.tags.includes("Enemy")).slice(0, 2);
    const enemies = store.listCharacters().filter((char) => char.tags.includes("Enemy")).slice(0, 2);
    heroes.forEach((hero) => engine.addCombatant(hero, "Heroes", hero.id));
    enemies.forEach((enemy) => engine.addCombatant(enemy, "Enemies", enemy.id));
    console.log(chalk_1.default.green("Battle start! Heroes vs. Enemies"));
    while (true) {
        const units = engine.getUnits();
        const heroesAlive = units.filter((entry) => entry.side === "Heroes");
        const enemiesAlive = units.filter((entry) => entry.side === "Enemies");
        if (!heroesAlive.length || !enemiesAlive.length) {
            console.log(chalk_1.default.green("Battle resolved."));
            break;
        }
        const turn = engine.nextTurn();
        if (!turn)
            break;
        const side = engine.getSide(turn.unitId) ?? "Neutral";
        console.log(chalk_1.default.yellow(`\nTurn ${turn.turnNumber}: ${turn.unit.sheet.name} (${side}) acts. HP ${turn.unit.hp}/${turn.unit.currentStats.HP}`));
        try {
            if (side === "Heroes") {
                await handlePlayerTurn(engine, skillMap, rl, turn.unitId, side);
            }
            else {
                handleEnemyTurn(engine, skillMap, turn.unitId);
            }
        }
        catch (error) {
            console.log(chalk_1.default.red(error.message));
            continue;
        }
        engine.completeTurn(turn.unitId);
    }
    const loot = engine.getLootLog();
    if (loot.length) {
        console.log(chalk_1.default.magenta("Loot drops:"));
        loot.forEach((entry) => console.log(`- ${entry.itemId} from ${entry.unitId}`));
    }
    await (0, helpers_1.pause)(rl, "Battle demo finished. Press Enter to return to menu.");
}
async function handlePlayerTurn(engine, skillMap, rl, unitId, side) {
    const unit = engine.getUnit(unitId);
    if (!unit)
        throw new Error("Unit missing");
    const skills = unit.sheet.skills
        .map((skillId) => skillMap.get(skillId))
        .filter((skill) => Boolean(skill));
    const skill = await (0, helpers_1.selectOption)(rl, "Choose a skill", skills.map((entry) => ({ label: entry.name, value: entry })));
    const scope = inferScope(skill);
    let targetId;
    if (scope === "enemy" || scope === "ally") {
        const candidates = engine
            .getUnits()
            .filter((entry) => (scope === "enemy" ? entry.side !== side : entry.side === side))
            .map((entry) => ({ label: `${entry.unit.sheet.name} (${entry.id})`, value: entry.id }));
        if (!candidates.length)
            throw new Error("No valid targets");
        targetId = await (0, helpers_1.selectOption)(rl, "Pick a target", candidates);
    }
    const distance = needsDistance(skill)
        ? Number(await (0, helpers_1.promptValue)(rl, "Distance to target", String(defaultDistance(skill))))
        : undefined;
    const result = engine.executeSkill(unitId, skill.id, { scope, targetId, distance });
    result.damageReports.forEach(({ targetId: impacted }) => {
        const target = engine.getUnit(impacted);
        if (target) {
            console.log(chalk_1.default.gray(`${target.sheet.name} now at HP ${target.hp}/${target.currentStats.HP}`));
        }
    });
}
function handleEnemyTurn(engine, skillMap, unitId) {
    const unit = engine.getUnit(unitId);
    if (!unit)
        return;
    const skillId = unit.sheet.skills.find((id) => skillMap.get(id)?.effects.hits?.length) ?? unit.sheet.skills[0];
    const skill = skillMap.get(skillId);
    if (!skill)
        return;
    const scope = inferScope(skill);
    const targetId = scope === "enemy"
        ? engine.getUnits().find((entry) => entry.side !== (engine.getSide(unitId) ?? ""))?.id
        : undefined;
    const distance = needsDistance(skill) ? defaultDistance(skill) : undefined;
    const result = engine.executeSkill(unitId, skill.id, { scope, targetId, distance });
    result.damageReports.forEach(({ targetId: impacted }) => {
        const target = engine.getUnit(impacted);
        if (target) {
            console.log(chalk_1.default.gray(`${target.sheet.name} now at HP ${target.hp}/${target.currentStats.HP}`));
        }
    });
}
async function runHeroEditor(store, heroManager, rl) {
    const heroes = store.listCharacters().filter((char) => !char.tags.includes("Enemy"));
    if (!heroes.length) {
        console.log(chalk_1.default.red("No heroes available."));
        return;
    }
    const hero = await (0, helpers_1.selectOption)(rl, "Select a hero", heroes.map((entry) => ({ label: entry.name, value: entry })));
    let editing = true;
    while (editing) {
        console.log(chalk_1.default.green(`\n${hero.name} — Tier ${hero.tier}`));
        types_1.STAT_KEYS.forEach((stat) => console.log(`  ${stat}: ${hero.stats[stat]}`));
        console.log(`  Slots passive/active: ${hero.slots.passive}/${hero.slots.active}`);
        console.log(`  Potential: ${hero.stats.PT}`);
        console.log(chalk_1.default.blue("\nSkill link graph:"));
        const graphLines = (0, skillGraph_1.buildSkillLinkGraph)(hero, store.listSkills(), heroManager);
        graphLines.forEach((line) => console.log(`  ${line}`));
        const action = await (0, helpers_1.selectOption)(rl, "Hero editor", [
            { label: "Adjust stat", value: "stat" },
            { label: "Tier up", value: "tier" },
            { label: "Raise potential", value: "potential" },
            { label: "Back", value: "back" }
        ]);
        switch (action) {
            case "stat": {
                const stat = await (0, helpers_1.selectOption)(rl, "Which stat?", types_1.STAT_KEYS.map((key) => ({ label: key, value: key })));
                const delta = Number(await (0, helpers_1.promptValue)(rl, "Delta (+/-)", "1"));
                const result = heroManager.applyStatChange(hero, stat, delta);
                console.log(result.highlight === "boost"
                    ? chalk_1.default.green(`High Potential boost! ${stat} +${result.actualDelta}`)
                    : result.highlight === "penalty"
                        ? chalk_1.default.red(`Low Potential penalty! ${stat} ${result.actualDelta}`)
                        : chalk_1.default.gray(`${stat} adjusted by ${result.actualDelta}`));
                break;
            }
            case "tier": {
                try {
                    const outcome = heroManager.tierUp(hero);
                    console.log(chalk_1.default.green(`Tier raised to ${outcome.newTier}; PT left ${outcome.potentialLeft}`));
                }
                catch (error) {
                    console.log(chalk_1.default.red(error.message));
                }
                break;
            }
            case "potential": {
                const amount = Number(await (0, helpers_1.promptValue)(rl, "Raise Potential by", "5"));
                heroManager.raisePotential(hero, amount);
                console.log(chalk_1.default.green(`Potential now ${hero.stats.PT}`));
                break;
            }
            case "back":
                editing = false;
                break;
        }
    }
}
async function runCreator(store, rl) {
    const action = await (0, helpers_1.selectOption)(rl, "Creator", [
        { label: "New character", value: "character" },
        { label: "New skill", value: "skill" },
        { label: "New terrain", value: "terrain" },
        { label: "Back", value: "back" }
    ]);
    if (action === "back")
        return;
    if (action === "character") {
        const id = await (0, helpers_1.promptValue)(rl, "Character id");
        const name = await (0, helpers_1.promptValue)(rl, "Name");
        const tier = await (0, helpers_1.promptValue)(rl, "Tier", "Common");
        const stats = {};
        for (const stat of types_1.STAT_KEYS) {
            stats[stat] = Number(await (0, helpers_1.promptValue)(rl, `${stat}`, "5"));
        }
        const traits = toList(await (0, helpers_1.promptValue)(rl, "Traits (comma)", "Human"));
        const skillIds = toList(await (0, helpers_1.promptValue)(rl, "Skill IDs (comma)", "skill_life_core"));
        const passiveSlots = Number(await (0, helpers_1.promptValue)(rl, "Passive slots", "1"));
        const activeSlots = Number(await (0, helpers_1.promptValue)(rl, "Active slots", "2"));
        const lootTable = parseLoot(await (0, helpers_1.promptValue)(rl, "Loot table item:weight pairs", "potion_small:20"));
        const tags = toList(await (0, helpers_1.promptValue)(rl, "Tags", "Hero"));
        const backstory = await (0, helpers_1.promptValue)(rl, "Backstory", "Custom hero");
        const character = {
            id,
            name,
            tier: tier,
            stats,
            traits,
            skills: skillIds,
            slots: { passive: passiveSlots, active: activeSlots },
            lootTable,
            tags,
            backstory
        };
        addEntity(store, "characters", character);
        console.log(chalk_1.default.green(`Character ${name} added.`));
    }
    else if (action === "skill") {
        const id = await (0, helpers_1.promptValue)(rl, "Skill id");
        const name = await (0, helpers_1.promptValue)(rl, "Name");
        const tier = await (0, helpers_1.promptValue)(rl, "Tier", "Common");
        const type = await (0, helpers_1.selectOption)(rl, "Type", [
            { label: "Active", value: "Active" },
            { label: "Passive", value: "Passive" }
        ]);
        const tags = toList(await (0, helpers_1.promptValue)(rl, "Tags", type === "Active" ? "Strike" : "Passive"));
        const description = await (0, helpers_1.promptValue)(rl, "Description", "Creator skill");
        const hitCount = type === "Active" ? Number(await (0, helpers_1.promptValue)(rl, "Number of hits", "1")) : 0;
        const hits = [];
        for (let i = 0; i < hitCount; i += 1) {
            const dice = await (0, helpers_1.promptValue)(rl, `Hit ${i + 1} dice`, "1d4");
            const flat = Number(await (0, helpers_1.promptValue)(rl, `Hit ${i + 1} flat`, "0"));
            hits?.push({ dice, flat });
        }
        const mpCost = Number(await (0, helpers_1.promptValue)(rl, "MP cost", "0"));
        const scalingStat = await (0, helpers_1.promptValue)(rl, "Scaling stat", "STR");
        const scalingFactor = Number(await (0, helpers_1.promptValue)(rl, "Scaling factor", "0.5"));
        const links = toList(await (0, helpers_1.promptValue)(rl, "Linked skill IDs", "skill_life_core"));
        const skill = {
            id,
            name,
            type,
            tier: tier,
            tags,
            description,
            effects: {
                hits: hits.length ? hits : undefined,
                cost: mpCost ? { MP: mpCost } : undefined,
                scaling: type === "Active"
                    ? { stat: scalingStat, factor: scalingFactor }
                    : undefined
            },
            links,
            uniqueTo: undefined
        };
        addEntity(store, "skills", skill);
        console.log(chalk_1.default.green(`Skill ${name} added.`));
    }
    else if (action === "terrain") {
        const id = await (0, helpers_1.promptValue)(rl, "Terrain id");
        const name = await (0, helpers_1.promptValue)(rl, "Name");
        const type = await (0, helpers_1.selectOption)(rl, "Type", [
            { label: "Global", value: "Global" },
            { label: "Selective", value: "Selective" }
        ]);
        const tags = toList(await (0, helpers_1.promptValue)(rl, "Tags", "Custom"));
        const effectCount = Number(await (0, helpers_1.promptValue)(rl, "Number of effects", "1"));
        const effects = [];
        for (let i = 0; i < effectCount; i += 1) {
            const stat = await (0, helpers_1.promptValue)(rl, `Effect ${i + 1} stat (blank for tag-only)`, "");
            const op = await (0, helpers_1.selectOption)(rl, `Effect ${i + 1} operation`, [
                { label: "add", value: "add" },
                { label: "mul", value: "mul" },
                { label: "resist", value: "resist" }
            ]);
            const value = Number(await (0, helpers_1.promptValue)(rl, `Effect ${i + 1} value`, "1"));
            const tag = await (0, helpers_1.promptValue)(rl, `Effect ${i + 1} tag label (optional)`, "");
            effects.push({
                stat: (stat ? stat : undefined),
                op,
                value,
                tag: tag || undefined
            });
        }
        const terrain = { id, name, type, tags, effects };
        addEntity(store, "terrains", terrain);
        console.log(chalk_1.default.green(`Terrain ${name} added.`));
    }
}
async function runImporter(store, rl) {
    const entity = await (0, helpers_1.selectOption)(rl, "Import which entity type?", [
        { label: "Characters", value: "characters" },
        { label: "Skills", value: "skills" },
        { label: "Terrains", value: "terrains" }
    ]);
    const filePath = await (0, helpers_1.promptValue)(rl, "Path to YAML/JSON file");
    const ext = path_1.default.extname(filePath).toLowerCase();
    const format = ext === ".json" ? "json" : "yaml";
    const payload = await (0, promises_1.readFile)(filePath, "utf8");
    store.importFromString(entity, payload, format);
    console.log(chalk_1.default.green(`Imported content from ${filePath}`));
}
async function saveContent(store) {
    await Promise.all([
        store.save("characters", SAMPLE_FILES.characters),
        store.save("skills", SAMPLE_FILES.skills),
        store.save("terrains", SAMPLE_FILES.terrains)
    ]);
    console.log(chalk_1.default.green("Content saved to data/sample."));
}
async function main() {
    const rl = (0, promises_2.createInterface)({ input: process_1.stdin, output: process_1.stdout });
    const store = new contentStore_1.ContentStore(DATA_DIR);
    await Promise.all([
        store.load("characters", SAMPLE_FILES.characters),
        store.load("skills", SAMPLE_FILES.skills),
        store.load("terrains", SAMPLE_FILES.terrains)
    ]);
    const heroManager = new heroManager_1.HeroManager();
    let running = true;
    while (running) {
        const action = await (0, helpers_1.selectOption)(rl, "Main menu", [
            { label: "Battle sandbox", value: "battle" },
            { label: "Hero editor", value: "hero" },
            { label: "Creator tools", value: "creator" },
            { label: "Import content", value: "import" },
            { label: "Save content", value: "save" },
            { label: "Quit", value: "quit" }
        ]);
        switch (action) {
            case "battle":
                await runBattleDemo(store, rl);
                break;
            case "hero":
                await runHeroEditor(store, heroManager, rl);
                break;
            case "creator":
                await runCreator(store, rl);
                break;
            case "import":
                await runImporter(store, rl);
                break;
            case "save":
                await saveContent(store);
                break;
            case "quit":
                running = false;
                break;
        }
    }
    rl.close();
    process.exit(0);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
