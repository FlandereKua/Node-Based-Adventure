"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.terrainSchema = exports.skillSchema = exports.characterSchema = exports.lootSchema = exports.statsSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../core/types");
const statsShape = Object.fromEntries(types_1.STAT_KEYS.map((key) => [key, zod_1.z.number().int()]));
exports.statsSchema = zod_1.z.object(statsShape);
exports.lootSchema = zod_1.z.object({
    itemId: zod_1.z.string(),
    weight: zod_1.z.number().nonnegative()
});
exports.characterSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    tier: zod_1.z.string(),
    stats: exports.statsSchema,
    traits: zod_1.z.array(zod_1.z.string()),
    skills: zod_1.z.array(zod_1.z.string()),
    slots: zod_1.z.object({ passive: zod_1.z.number().int(), active: zod_1.z.number().int() }),
    lootTable: zod_1.z.array(exports.lootSchema),
    tags: zod_1.z.array(zod_1.z.string()),
    backstory: zod_1.z.string()
});
exports.skillSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(["Passive", "Active"]),
    tier: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    description: zod_1.z.string(),
    effects: zod_1.z.object({
        hits: zod_1.z
            .array(zod_1.z.object({
            dice: zod_1.z.string(),
            flat: zod_1.z.number().optional(),
            scalingMultiplier: zod_1.z.number().optional()
        }))
            .optional(),
        cost: zod_1.z
            .object({
            HP: zod_1.z.number().optional(),
            MP: zod_1.z.number().optional()
        })
            .optional(),
        scaling: zod_1.z
            .object({
            stat: zod_1.z.string(),
            factor: zod_1.z.number()
        })
            .optional(),
        stackingBonusPerHit: zod_1.z.number().optional(),
        repeat: zod_1.z.number().optional(),
        summon: zod_1.z
            .object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            stats: exports.statsSchema,
            skills: zod_1.z.array(zod_1.z.string()),
            duration: zod_1.z.number(),
            tags: zod_1.z.array(zod_1.z.string())
        })
            .optional(),
        aid: zod_1.z.boolean().optional(),
        duration: zod_1.z.number().optional(),
        traitsRequired: zod_1.z.array(zod_1.z.string()).optional()
    }),
    links: zod_1.z.array(zod_1.z.string()),
    uniqueTo: zod_1.z.array(zod_1.z.string()).optional()
});
exports.terrainSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(["Global", "Selective"]),
    tags: zod_1.z.array(zod_1.z.string()),
    effects: zod_1.z.array(zod_1.z.object({
        stat: zod_1.z.string().optional(),
        tag: zod_1.z.string().optional(),
        op: zod_1.z.enum(["add", "mul", "resist"]),
        value: zod_1.z.number()
    }))
});
