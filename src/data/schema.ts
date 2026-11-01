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
