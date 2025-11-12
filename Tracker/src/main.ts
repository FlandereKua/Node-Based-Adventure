import path from "path";
import { readFile } from "fs/promises";
import chalk from "chalk";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { ContentStore, SchemaKey } from "./content/contentStore";
import { HeroManager } from "./core/hero/heroManager";
import { BattleEngine } from "./core/battle/battleEngine";
import { TargetScope } from "./core/battle/targeting";
import { selectOption, promptValue, pause } from "./ui/cli/helpers";
import { buildSkillLinkGraph } from "./ui/cli/skillGraph";
import {
  CharacterSheet,
  CoreStat,
  SkillDefinition,
  SkillHit,
  STAT_KEYS,
  TerrainDefinition
} from "./core/types";

const DATA_DIR = path.resolve(__dirname, "..", "data", "sample");
const SAMPLE_FILES = {
  characters: "characters.yaml",
  skills: "skills.yaml",
  terrains: "terrains.yaml"
} as const;

type MenuAction = "battle" | "hero" | "creator" | "import" | "save" | "quit";

const needsDistance = (skill: SkillDefinition) =>
  skill.tags.includes("Snipe") || skill.tags.includes("Shotgun");

const inferScope = (skill: SkillDefinition): TargetScope => {
  if (skill.tags.includes("Heal")) return "ally";
  if (skill.tags.includes("Summon")) return "self";
  if (skill.tags.includes("Shotgun")) return "all-enemies";
  return "enemy";
};

const defaultDistance = (skill: SkillDefinition) => {
  if (skill.tags.includes("Snipe")) return 7;
  if (skill.tags.includes("Shotgun")) return 1;
  return 0;
};

const toList = (value: string) =>
  value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

const parseLoot = (value: string) =>
  value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((entry) => {
      const [itemId, weightStr] = entry.split(":");
      return { itemId: itemId.trim(), weight: Number(weightStr ?? 10) };
    });

const addEntity = (store: ContentStore, entity: SchemaKey, payload: unknown) => {
  store.importFromString(entity, JSON.stringify([payload]), "json");
};

async function runBattleDemo(store: ContentStore, rl: ReturnType<typeof createInterface>) {
  const skills = store.listSkills();
  const terrains = store.listTerrains();
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const engine = new BattleEngine(skills, terrains);

  const heroes = store.listCharacters().filter((char) => !char.tags.includes("Enemy")).slice(0, 2);
  const enemies = store.listCharacters().filter((char) => char.tags.includes("Enemy")).slice(0, 2);
  heroes.forEach((hero) => engine.addCombatant(hero, "Heroes", hero.id));
  enemies.forEach((enemy) => engine.addCombatant(enemy, "Enemies", enemy.id));

  console.log(chalk.green("Battle start! Heroes vs. Enemies"));

  while (true) {
    const units = engine.getUnits();
    const heroesAlive = units.filter((entry) => entry.side === "Heroes");
    const enemiesAlive = units.filter((entry) => entry.side === "Enemies");
    if (!heroesAlive.length || !enemiesAlive.length) {
      console.log(chalk.green("Battle resolved."));
      break;
    }

    const turn = engine.nextTurn();
    if (!turn) break;
    const side = engine.getSide(turn.unitId) ?? "Neutral";
    console.log(
      chalk.yellow(`\nTurn ${turn.turnNumber}: ${turn.unit.sheet.name} (${side}) acts. HP ${turn.unit.hp}/${turn.unit.currentStats.HP}`)
    );

    try {
      if (side === "Heroes") {
        await handlePlayerTurn(engine, skillMap, rl, turn.unitId, side);
      } else {
        handleEnemyTurn(engine, skillMap, turn.unitId);
      }
    } catch (error) {
      console.log(chalk.red((error as Error).message));
      continue;
    }

    engine.completeTurn(turn.unitId);
  }

  const loot = engine.getLootLog();
  if (loot.length) {
    console.log(chalk.magenta("Loot drops:"));
    loot.forEach((entry) => console.log(`- ${entry.itemId} from ${entry.unitId}`));
  }
  await pause(rl, "Battle demo finished. Press Enter to return to menu.");
}

async function handlePlayerTurn(
  engine: BattleEngine,
  skillMap: Map<string, SkillDefinition>,
  rl: ReturnType<typeof createInterface>,
  unitId: string,
  side: string
) {
  const unit = engine.getUnit(unitId);
  if (!unit) throw new Error("Unit missing");
  const skills = unit.sheet.skills
    .map((skillId) => skillMap.get(skillId))
    .filter((skill): skill is SkillDefinition => Boolean(skill));
  const skill = await selectOption(rl, "Choose a skill", skills.map((entry) => ({ label: entry.name, value: entry })));
  const scope = inferScope(skill);
  let targetId: string | undefined;
  if (scope === "enemy" || scope === "ally") {
    const candidates = engine
      .getUnits()
      .filter((entry) => (scope === "enemy" ? entry.side !== side : entry.side === side))
      .map((entry) => ({ label: `${entry.unit.sheet.name} (${entry.id})`, value: entry.id }));
    if (!candidates.length) throw new Error("No valid targets");
    targetId = await selectOption(rl, "Pick a target", candidates);
  }
  const distance = needsDistance(skill)
    ? Number(await promptValue(rl, "Distance to target", String(defaultDistance(skill))))
    : undefined;
  const result = engine.executeSkill(unitId, skill.id, { scope, targetId, distance });
  result.damageReports.forEach(({ targetId: impacted }) => {
    const target = engine.getUnit(impacted);
    if (target) {
      console.log(
        chalk.gray(
          `${target.sheet.name} now at HP ${target.hp}/${target.currentStats.HP}`
        )
      );
    }
  });
}

function handleEnemyTurn(
  engine: BattleEngine,
  skillMap: Map<string, SkillDefinition>,
  unitId: string
) {
  const unit = engine.getUnit(unitId);
  if (!unit) return;
  const skillId =
    unit.sheet.skills.find((id) => skillMap.get(id)?.effects.hits?.length) ?? unit.sheet.skills[0];
  const skill = skillMap.get(skillId);
  if (!skill) return;
  const scope = inferScope(skill);
  const targetId =
    scope === "enemy"
      ? engine.getUnits().find((entry) => entry.side !== (engine.getSide(unitId) ?? ""))?.id
      : undefined;
  const distance = needsDistance(skill) ? defaultDistance(skill) : undefined;
  const result = engine.executeSkill(unitId, skill.id, { scope, targetId, distance });
  result.damageReports.forEach(({ targetId: impacted }) => {
    const target = engine.getUnit(impacted);
    if (target) {
      console.log(
        chalk.gray(
          `${target.sheet.name} now at HP ${target.hp}/${target.currentStats.HP}`
        )
      );
    }
  });
}

async function runHeroEditor(store: ContentStore, heroManager: HeroManager, rl: ReturnType<typeof createInterface>) {
  const heroes = store.listCharacters().filter((char) => !char.tags.includes("Enemy"));
  if (!heroes.length) {
    console.log(chalk.red("No heroes available."));
    return;
  }
  const hero = await selectOption(rl, "Select a hero", heroes.map((entry) => ({ label: entry.name, value: entry })));
  let editing = true;
  while (editing) {
    console.log(chalk.green(`\n${hero.name} — Tier ${hero.tier}`));
    STAT_KEYS.forEach((stat) => console.log(`  ${stat}: ${hero.stats[stat]}`));
    console.log(`  Slots passive/active: ${hero.slots.passive}/${hero.slots.active}`);
    console.log(`  Potential: ${hero.stats.PT}`);
    console.log(chalk.blue("\nSkill link graph:"));
    const graphLines = buildSkillLinkGraph(hero, store.listSkills(), heroManager);
    graphLines.forEach((line) => console.log(`  ${line}`));

    const action = await selectOption(rl, "Hero editor", [
      { label: "Adjust stat", value: "stat" },
      { label: "Tier up", value: "tier" },
      { label: "Raise potential", value: "potential" },
      { label: "Back", value: "back" }
    ]);

    switch (action) {
      case "stat": {
        const stat = await selectOption(rl, "Which stat?", STAT_KEYS.map((key) => ({ label: key, value: key })));
        const delta = Number(await promptValue(rl, "Delta (+/-)", "1"));
        const result = heroManager.applyStatChange(hero, stat, delta);
        console.log(
          result.highlight === "boost"
            ? chalk.green(`High Potential boost! ${stat} +${result.actualDelta}`)
            : result.highlight === "penalty"
            ? chalk.red(`Low Potential penalty! ${stat} ${result.actualDelta}`)
            : chalk.gray(`${stat} adjusted by ${result.actualDelta}`)
        );
        break;
      }
      case "tier": {
        try {
          const outcome = heroManager.tierUp(hero);
          console.log(chalk.green(`Tier raised to ${outcome.newTier}; PT left ${outcome.potentialLeft}`));
        } catch (error) {
          console.log(chalk.red((error as Error).message));
        }
        break;
      }
      case "potential": {
        const amount = Number(await promptValue(rl, "Raise Potential by", "5"));
        heroManager.raisePotential(hero, amount);
        console.log(chalk.green(`Potential now ${hero.stats.PT}`));
        break;
      }
      case "back":
        editing = false;
        break;
    }
  }
}

async function runCreator(store: ContentStore, rl: ReturnType<typeof createInterface>) {
  const action = await selectOption(rl, "Creator", [
    { label: "New character", value: "character" },
    { label: "New skill", value: "skill" },
    { label: "New terrain", value: "terrain" },
    { label: "Back", value: "back" }
  ]);
  if (action === "back") return;
  if (action === "character") {
    const id = await promptValue(rl, "Character id");
    const name = await promptValue(rl, "Name");
    const tier = await promptValue(rl, "Tier", "Common");
    const stats = {} as CharacterSheet["stats"];
    for (const stat of STAT_KEYS) {
      stats[stat] = Number(await promptValue(rl, `${stat}`, "5"));
    }
    const traits = toList(await promptValue(rl, "Traits (comma)", "Human"));
    const skillIds = toList(await promptValue(rl, "Skill IDs (comma)", "skill_life_core"));
    const passiveSlots = Number(await promptValue(rl, "Passive slots", "1"));
    const activeSlots = Number(await promptValue(rl, "Active slots", "2"));
    const lootTable = parseLoot(await promptValue(rl, "Loot table item:weight pairs", "potion_small:20"));
    const tags = toList(await promptValue(rl, "Tags", "Hero"));
    const backstory = await promptValue(rl, "Backstory", "Custom hero");
    const character: CharacterSheet = {
      id,
      name,
      tier: tier as CharacterSheet["tier"],
      stats,
      traits,
      skills: skillIds,
      slots: { passive: passiveSlots, active: activeSlots },
      lootTable,
      tags,
      backstory
    };
    addEntity(store, "characters", character);
    console.log(chalk.green(`Character ${name} added.`));
  } else if (action === "skill") {
    const id = await promptValue(rl, "Skill id");
    const name = await promptValue(rl, "Name");
    const tier = await promptValue(rl, "Tier", "Common");
    const type = await selectOption<SkillDefinition["type"]>(rl, "Type", [
      { label: "Active", value: "Active" },
      { label: "Passive", value: "Passive" }
    ]);
    const tags = toList(await promptValue(rl, "Tags", type === "Active" ? "Strike" : "Passive"));
    const description = await promptValue(rl, "Description", "Creator skill");
    const hitCount = type === "Active" ? Number(await promptValue(rl, "Number of hits", "1")) : 0;
    const hits: SkillHit[] = [];
    for (let i = 0; i < hitCount; i += 1) {
      const dice = await promptValue(rl, `Hit ${i + 1} dice`, "1d4");
      const flat = Number(await promptValue(rl, `Hit ${i + 1} flat`, "0"));
      hits?.push({ dice, flat });
    }
    const mpCost = Number(await promptValue(rl, "MP cost", "0"));
    const scalingStat = await promptValue(rl, "Scaling stat", "STR");
    const scalingFactor = Number(await promptValue(rl, "Scaling factor", "0.5"));
    const links = toList(await promptValue(rl, "Linked skill IDs", "skill_life_core"));
    const skill: SkillDefinition = {
      id,
      name,
      type,
      tier: tier as SkillDefinition["tier"],
      tags,
      description,
      effects: {
        hits: hits.length ? hits : undefined,
        cost: mpCost ? { MP: mpCost } : undefined,
        scaling:
          type === "Active"
            ? { stat: scalingStat as CoreStat, factor: scalingFactor }
            : undefined
      },
      links,
      uniqueTo: undefined
    };
    addEntity(store, "skills", skill);
    console.log(chalk.green(`Skill ${name} added.`));
  } else if (action === "terrain") {
    const id = await promptValue(rl, "Terrain id");
    const name = await promptValue(rl, "Name");
    const type = await selectOption<TerrainDefinition["type"]>(rl, "Type", [
      { label: "Global", value: "Global" },
      { label: "Selective", value: "Selective" }
    ]);
    const tags = toList(await promptValue(rl, "Tags", "Custom"));
    const effectCount = Number(await promptValue(rl, "Number of effects", "1"));
    const effects = [] as TerrainDefinition["effects"];
    for (let i = 0; i < effectCount; i += 1) {
      const stat = await promptValue(rl, `Effect ${i + 1} stat (blank for tag-only)`, "");
      const op = await selectOption<"add" | "mul" | "resist">(rl, `Effect ${i + 1} operation`, [
        { label: "add", value: "add" },
        { label: "mul", value: "mul" },
        { label: "resist", value: "resist" }
      ]);
      const value = Number(await promptValue(rl, `Effect ${i + 1} value`, "1"));
      const tag = await promptValue(rl, `Effect ${i + 1} tag label (optional)`, "");
      effects.push({
        stat: (stat ? (stat as CoreStat) : undefined) as CoreStat | undefined,
        op,
        value,
        tag: tag || undefined
      });
    }
    const terrain: TerrainDefinition = { id, name, type, tags, effects };
    addEntity(store, "terrains", terrain);
    console.log(chalk.green(`Terrain ${name} added.`));
  }
}

async function runImporter(store: ContentStore, rl: ReturnType<typeof createInterface>) {
  const entity = await selectOption<SchemaKey>(rl, "Import which entity type?", [
    { label: "Characters", value: "characters" },
    { label: "Skills", value: "skills" },
    { label: "Terrains", value: "terrains" }
  ]);
  const filePath = await promptValue(rl, "Path to YAML/JSON file");
  const ext = path.extname(filePath).toLowerCase();
  const format: "yaml" | "json" = ext === ".json" ? "json" : "yaml";
  const payload = await readFile(filePath, "utf8");
  store.importFromString(entity, payload, format);
  console.log(chalk.green(`Imported content from ${filePath}`));
}

async function saveContent(store: ContentStore) {
  await Promise.all([
    store.save("characters", SAMPLE_FILES.characters),
    store.save("skills", SAMPLE_FILES.skills),
    store.save("terrains", SAMPLE_FILES.terrains)
  ]);
  console.log(chalk.green("Content saved to data/sample."));
}

async function main() {
  const rl = createInterface({ input, output });
  const store = new ContentStore(DATA_DIR);
  await Promise.all([
    store.load("characters", SAMPLE_FILES.characters),
    store.load("skills", SAMPLE_FILES.skills),
    store.load("terrains", SAMPLE_FILES.terrains)
  ]);
  const heroManager = new HeroManager();

  let running = true;
  while (running) {
    const action = await selectOption<MenuAction>(rl, "Main menu", [
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
