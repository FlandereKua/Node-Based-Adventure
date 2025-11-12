"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentStore = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const yaml_1 = require("yaml");
const schemas_1 = require("./schemas");
const EXT_TO_FORMAT = {
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json"
};
const schemaMap = {
    characters: schemas_1.characterSchema,
    skills: schemas_1.skillSchema,
    terrains: schemas_1.terrainSchema
};
class ContentStore {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.store = {
            characters: new Map(),
            skills: new Map(),
            terrains: new Map()
        };
    }
    async load(entity, fileName, options) {
        const filePath = path_1.default.isAbsolute(fileName)
            ? fileName
            : path_1.default.join(this.baseDir, fileName);
        const raw = await fs_1.promises.readFile(filePath, "utf8");
        const ext = options?.format ?? EXT_TO_FORMAT[path_1.default.extname(fileName).toLowerCase()];
        if (!ext) {
            throw new Error(`Unsupported file format for ${fileName}`);
        }
        const parsed = this.parseRaw(raw, ext);
        const schema = schemaMap[entity].array();
        const result = schema.parse(parsed);
        const bucket = this.getStore(entity);
        result.forEach((entry) => {
            bucket.set(entry.id, entry);
        });
        return result;
    }
    getCharacter(id) {
        return this.store.characters.get(id);
    }
    getSkill(id) {
        return this.store.skills.get(id);
    }
    getTerrain(id) {
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
    async save(entity, fileName) {
        const schema = schemaMap[entity].array();
        const bucket = this.getStore(entity);
        const data = Array.from(bucket.values());
        schema.parse(data);
        const filePath = path_1.default.isAbsolute(fileName)
            ? fileName
            : path_1.default.join(this.baseDir, fileName);
        const ext = EXT_TO_FORMAT[path_1.default.extname(fileName).toLowerCase()] ?? "yaml";
        const serialized = ext === "yaml" ? (0, yaml_1.stringify)(data) : JSON.stringify(data, null, 2);
        await fs_1.promises.writeFile(filePath, serialized, "utf8");
    }
    importFromString(entity, payload, format) {
        const data = this.parseRaw(payload, format);
        const schema = schemaMap[entity].array();
        const result = schema.parse(data);
        const bucket = this.getStore(entity);
        result.forEach((entry) => bucket.set(entry.id, entry));
        return result;
    }
    parseRaw(raw, format) {
        if (format === "yaml")
            return (0, yaml_1.parse)(raw);
        return JSON.parse(raw);
    }
    getStore(entity) {
        return this.store[entity];
    }
}
exports.ContentStore = ContentStore;
