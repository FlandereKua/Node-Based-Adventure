import { z } from "zod";
import { STAT_KEYS } from "../core/types";

const statsShape = Object.fromEntries(
  STAT_KEYS.map((key) => [key, z.number().int()])
);

export const statsSchema = z.object(statsShape);

export const lootSchema = z.object({
  itemId: z.string(),
  weight: z.number().nonnegative()
});

export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.string(),
  stats: statsSchema,
  traits: z.array(z.string()),
  skills: z.array(z.string()),
  slots: z.object({ passive: z.number().int(), active: z.number().int() }),
  lootTable: z.array(lootSchema),
  tags: z.array(z.string()),
  backstory: z.string()
});

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["Passive", "Active"]),
  tier: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  effects: z.object({
    hits: z
      .array(
        z.object({
          dice: z.string(),
          flat: z.number().optional(),
          scalingMultiplier: z.number().optional()
        })
      )
      .optional(),
    cost: z
      .object({
        HP: z.number().optional(),
        MP: z.number().optional()
      })
      .optional(),
    scaling: z
      .object({
        stat: z.string(),
        factor: z.number()
      })
      .optional(),
    stackingBonusPerHit: z.number().optional(),
    repeat: z.number().optional(),
    summon: z
      .object({
        id: z.string(),
        name: z.string(),
        stats: statsSchema,
        skills: z.array(z.string()),
        duration: z.number(),
        tags: z.array(z.string())
      })
      .optional(),
    aid: z.boolean().optional(),
    duration: z.number().optional(),
    traitsRequired: z.array(z.string()).optional()
  }),
  links: z.array(z.string()),
  uniqueTo: z.array(z.string()).optional()
});

export const terrainSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["Global", "Selective"]),
  tags: z.array(z.string()),
  effects: z.array(
    z.object({
      stat: z.string().optional(),
      tag: z.string().optional(),
      op: z.enum(["add", "mul", "resist"]),
      value: z.number()
    })
  )
});
