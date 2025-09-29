const fs = require("fs");
const path = require("path");
const { loadCharacters } = require("../lib/characterParser");

const TRACKER_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(TRACKER_ROOT, "..");
const CHARACTERS_DIR = path.join(PROJECT_ROOT, "Characters");
const OUTPUT_DIR = path.join(TRACKER_ROOT, "output");

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

function writeCsv(filePath, characters) {
  const header = [
    "Name",
    "Tier",
    "Race",
    "SPD",
    "MV",
    "HP (max)",
    "Resource (max)",
    "AC"
  ];

  const rows = characters.map(character => {
    const { name, tier, race, combat } = character;
    const hpMax = combat?.hp?.max ?? "";
    const resourceMax = combat?.resource?.max ?? "";
    const spd = combat?.spd ?? "";
    const mv = combat?.mv ?? "";
    const ac = combat?.ac ?? "";
    return [name, tier ?? "", race ?? "", spd, mv, hpMax, resourceMax, ac]
      .map(escapeCsvValue)
      .join(",");
  });
  const csvContent = [header.join(","), ...rows].join("\n");
  fs.writeFileSync(filePath, csvContent, "utf8");
}

function convertCharacters() {
  ensureDirectory(OUTPUT_DIR);

  const characters = loadCharacters(CHARACTERS_DIR);
  if (!characters.length) {
    console.warn("No characters found to convert.");
    return;
  }

  writeJson(path.join(OUTPUT_DIR, "characters.json"), characters);

  const charactersDir = path.join(OUTPUT_DIR, "characters");
  ensureDirectory(charactersDir);
  characters.forEach(character => {
    const filename = `${character.id}.json`;
    writeJson(path.join(charactersDir, filename), character);
  });

  writeCsv(path.join(OUTPUT_DIR, "characters-summary.csv"), characters);

  console.log(`Converted ${characters.length} character sheet(s) to JSON and CSV in ${OUTPUT_DIR}`);
}

convertCharacters();