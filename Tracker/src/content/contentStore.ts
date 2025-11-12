import { promises as fs } from "fs";
import path from "path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import {
  CharacterSheet,
  LoaderOptions,
  SkillDefinition,
  TerrainDefinition
} from "../core/types";
import { characterSchema, skillSchema, terrainSchema } from "./schemas";

const EXT_TO_FORMAT: Record<string, "yaml" | "json"> = {
  ".yaml": "yaml",
  ".yml": "yaml",
  ".json": "json"
};

const schemaMap = {
  characters: characterSchema,
  skills: skillSchema,
  terrains: terrainSchema
};

export type SchemaKey = keyof typeof schemaMap;

type EntityRecord = {
  characters: CharacterSheet;
  skills: SkillDefinition;
  terrains: TerrainDefinition;
};

type EntityMap = {
  [K in SchemaKey]: Map<string, EntityRecord[K]>;
};

export class ContentStore {
  private store: EntityMap = {
    characters: new Map(),
    skills: new Map(),
    terrains: new Map()
  };

  constructor(private baseDir: string) {}

  async load(entity: SchemaKey, fileName: string, options?: LoaderOptions) {
    const filePath = path.isAbsolute(fileName)
      ? fileName
      : path.join(this.baseDir, fileName);
    const raw = await fs.readFile(filePath, "utf8");
    const ext = options?.format ?? EXT_TO_FORMAT[path.extname(fileName).toLowerCase()];
    if (!ext) {
      throw new Error(`Unsupported file format for ${fileName}`);
    }
    const parsed = this.parseRaw(raw, ext);
    const schema = schemaMap[entity].array();
    const result = schema.parse(parsed);
    const bucket = this.getStore(entity);
    result.forEach((entry) => {
      bucket.set(entry.id, entry as never);
    });
    return result;
  }

  getCharacter(id: string) {
    return this.store.characters.get(id);
  }

  getSkill(id: string) {
    return this.store.skills.get(id);
  }

  getTerrain(id: string) {
    return this.store.terrains.get(id);
  }

  listCharacters() {
    return Array.from(this.store.characters.values());
  }

  listSkills() {
    return Array.from(this.store.skills.values());
  }

  listTerrains() {
    return Array.from(this.store.terrains.values());
  }

  async save(entity: SchemaKey, fileName: string) {
    const schema = schemaMap[entity].array();
    const bucket = this.getStore(entity);
    const data = Array.from(bucket.values());
    schema.parse(data);
    const filePath = path.isAbsolute(fileName)
      ? fileName
      : path.join(this.baseDir, fileName);
    const ext = EXT_TO_FORMAT[path.extname(fileName).toLowerCase()] ?? "yaml";
    const serialized = ext === "yaml" ? stringifyYaml(data) : JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, serialized, "utf8");
  }

  importFromString(entity: SchemaKey, payload: string, format: "yaml" | "json") {
    const data = this.parseRaw(payload, format);
    const schema = schemaMap[entity].array();
    const result = schema.parse(data);
    const bucket = this.getStore(entity);
    result.forEach((entry) => bucket.set(entry.id, entry as never));
    return result;
  }

  private parseRaw(raw: string, format: "yaml" | "json") {
    if (format === "yaml") return parseYaml(raw);
    return JSON.parse(raw);
  }

  private getStore<K extends SchemaKey>(entity: K): Map<string, EntityRecord[K]> {
    return this.store[entity] as Map<string, EntityRecord[K]>;
  }
}
