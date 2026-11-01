import { z } from 'zod'

/* ============================================================
   Shared primitives
   ============================================================ */

/** How a class modifies a roll with respect to its Level (L). */
export const BonusMod = z.enum(['none', 'L', 'halfL', 'special'])
export type BonusMod = z.infer<typeof BonusMod>

/**
 * A class's save profile is the exemplar the book names, e.g. "As a rogue".
 * Kept as a string because the book references many exemplars
 * (warrior, rogue, wizard, cleric, dwarf, elf, halfling, barbarian…).
 */

/** Spell school a class draws from. */
export const SpellSchool = z.enum(['wizard', 'druid', 'illusionist', 'cleric'])
export type SpellSchool = z.infer<typeof SpellSchool>

/** Dice notation as written in the book, e.g. "2d6", "d6", "4d6". */
export const DieCode = z.string()
export type DieCode = z.infer<typeof DieCode>

/* ============================================================
   Building blocks
   ============================================================ */

export const Trait = z.object({
  name: z.string(),
  text: z.string(),
})
export type Trait = z.infer<typeof Trait>

export const Ability = z.object({
  name: z.string(),
  text: z.string(),
})
export type Ability = z.infer<typeof Ability>

/** Life = base + Level (e.g. Warrior "6+L" → base 6). */
export const Life = z.object({
  base: z.number(),
  text: z.string(),
})
export type Life = z.infer<typeof Life>

export const RollBonus = z.object({
  mod: BonusMod,
  /** Full book wording for the bonus, e.g. "+1/2 L to Attack rolls and +L to Defense rolls". */
  text: z.string(),
})
export type RollBonus = z.infer<typeof RollBonus>

export const Saves = z.object({
  /** Save exemplar named by the book, e.g. "rogue", "warrior", "cleric". */
  profile: z.string(),
  /** Full book wording, including any class-specific save bonuses. */
  text: z.string(),
})
export type Saves = z.infer<typeof Saves>

export const MagicUse = z.object({
  usesSpells: z.boolean(),
  school: SpellSchool.nullable(),
  /** Spell-slot formula if the class has slots, e.g. "L+2". */
  slotsText: z.string().optional(),
  text: z.string().optional(),
})
export type MagicUse = z.infer<typeof MagicUse>

export const Wealth = z.object({
  dice: DieCode,
  text: z.string(),
})
export type Wealth = z.infer<typeof Wealth>

/* ============================================================
   Hero class
   ============================================================ */

export const HeroClass = z.object({
  id: z.string(),
  name: z.string(),
  /** One of the eight "core" classes the rules reference by name. */
  core: z.boolean(),
  /** One-line role descriptor. */
  role: z.string(),

  attack: RollBonus,
  defense: RollBonus,
  life: Life,
  saves: Saves,
  magic: MagicUse.optional(),

  armorAllowed: z.string(),
  weaponsAllowed: z.string(),
  startingEquipment: z.string(),
  startingWealth: Wealth,

  /** e.g. "+L", "+1/2 L", "None". */
  stealth: z.string(),
  advancedSkills: z.string().optional(),

  /** Class-defining abilities (tricks, rage, spellcasting, panache…). */
  abilities: z.array(Ability).default([]),

  /** Optional character trait table — always exactly 6 entries. */
  traits: z.array(Trait).length(6),

  /** Umbrella-term references and misc. rules text (e.g. racial hatred). */
  notes: z.string().optional(),
})
export type HeroClass = z.infer<typeof HeroClass>

export const HeroClassList = z.array(HeroClass)

/* ============================================================
   Random tables (the heart of 4AD)
   ============================================================ */

/** One row of a random table: a roll range and its result text. */
export const TableEntry = z.object({
  /** Roll range as written in the book: "2", "0-1", "6+", "1-2", "4-6". */
  roll: z.string(),
  result: z.string(),
})
export type TableEntry = z.infer<typeof TableEntry>

/** Which environment a table belongs to (for foe/treasure tables). */
export const Environment = z.enum(['dungeon', 'caverns', 'fungal', 'fiendish', 'all', 'scenario'])
export type Environment = z.infer<typeof Environment>

export const RandTable = z.object({
  id: z.string(),
  name: z.string(),
  /** Dice used to roll the table, e.g. "d6", "2d6". */
  dice: z.string(),
  environment: Environment.optional(),
  entries: z.array(TableEntry).min(1),
  /** Footnotes / rules text printed with the table. */
  note: z.string().optional(),
})
export type RandTable = z.infer<typeof RandTable>

export const RandTableList = z.array(RandTable)

/* ============================================================
   Foes (monsters) — one structured statblock per creature
   ============================================================ */

/** Coarse foe class, matching the book's table groupings. */
export const FoeKind = z.enum(['vermin', 'minion', 'weird', 'boss', 'event'])
export type FoeKind = z.infer<typeof FoeKind>

export const Foe = z.object({
  name: z.string(),
  /** How many appear, e.g. "3d6", "d6+3", "d3", "2d6+1". */
  count: z.string().optional(),
  kind: FoeKind,
  /** Level formula relative to HCL, e.g. "HCL+2", "HCL". */
  level: z.string(),
  /** Level cap, e.g. 4, 6, 10. */
  maxLevel: z.number().optional(),
  /** Life for major foes, e.g. "Tier+3", "HCL+3", "7", "HCL (min. 3)". */
  life: z.string().optional(),
  /** Attacks per turn. */
  attacks: z.number().optional(),
  /** Per-attack damage when not the default 1, e.g. "Tier+1". */
  damage: z.string().optional(),
  /** Treasure as written: "none", "-1", "+2", "2 rolls", "1 roll", "see below". */
  treasure: z.string(),
  /** Morale: "standard", "-1", "+1", "+2", "never", "always fight to the death". */
  morale: z.string(),
  /** Reactions as written, e.g. "1-3 Flee, 4-6 Fight", "Always Fight". */
  reactions: z.string(),
  /** Tags: undead, animal, chaos, artificial, elemental, slime, mushroom, dragon, were… */
  tags: z.array(z.string()).default([]),
  /** Special rules text (abilities, immunities, on-hit effects). */
  text: z.string().optional(),
})
export type Foe = z.infer<typeof Foe>

export const FoeEntry = z.object({
  /** d6 result, "1"–"6". */
  roll: z.string(),
  /** One foe normally; two for "roll d6: 1-3 = X, 4-6 = Y" choice rows. */
  foes: z.array(Foe).min(1),
  /** For choice rows: how to sub-roll among the foes. */
  subRoll: z.string().optional(),
  /** Special text shared by every Foe in this row. */
  text: z.string().optional(),
})
export type FoeEntry = z.infer<typeof FoeEntry>

export const FoeTable = z.object({
  id: z.string(),
  name: z.string(),
  dice: z.string(),
  environment: Environment,
  entries: z.array(FoeEntry).min(1),
  note: z.string().optional(),
})
export type FoeTable = z.infer<typeof FoeTable>

export const FoeTableList = z.array(FoeTable)

/* ============================================================
   Spells
   ============================================================ */

export const Spell = z.object({
  id: z.string(),
  name: z.string(),
  school: SpellSchool,
  /** Position on the school's random table (wizard d6; druid/illusionist d12). */
  roll: z.number(),
  /** Whether casting needs a spellcasting roll vs the target's L. */
  requiresRoll: z.boolean(),
  text: z.string(),
})
export type Spell = z.infer<typeof Spell>

export const SpellList = z.array(Spell)

/* ============================================================
   Equipment
   ============================================================ */

export const EquipCategory = z.enum(['weapon', 'armor', 'light', 'consumable', 'item', 'service'])
export type EquipCategory = z.infer<typeof EquipCategory>

export const Equipment = z.object({
  id: z.string(),
  name: z.string(),
  /** Price in gp (services may be a flat fee). */
  price: z.number(),
  /** Price qualifier, e.g. "per dozen", "per vial", "service". */
  priceNote: z.string().optional(),
  category: EquipCategory,
  /** Weapon Attack modifier, e.g. -1, +1, +2, +3. */
  attackMod: z.number().optional(),
  /** Armor/Shield Defense bonus. */
  defenseMod: z.number().optional(),
  /** Hands required (1 or 2). */
  hands: z.number().optional(),
  damageType: z.enum(['crushing', 'slashing']).optional(),
  text: z.string(),
})
export type Equipment = z.infer<typeof Equipment>

export const EquipmentList = z.array(Equipment)

/* ============================================================
   Scenarios (adventures)
   ============================================================ */

export const Scenario = z.object({
  id: z.string(),
  name: z.string(),
  intro: z.string(),
  /** "table-driven" rolls on its own tables; "scripted" is a paragraph adventure. */
  kind: z.enum(['table-driven', 'scripted']),
  /** Scenario-specific random tables. */
  tables: z.array(RandTable).default([]),
  /** Scenario-specific foe tables. */
  foeTables: z.array(FoeTable).default([]),
  /** Rules, bosses, secrets and endings printed with the scenario. */
  notes: z.array(z.string()).default([]),
})
export type Scenario = z.infer<typeof Scenario>

export const ScenarioList = z.array(Scenario)
