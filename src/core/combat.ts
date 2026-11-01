import { rollExploding, type ExplodingRoll, type Rng, defaultRng } from './dice'

/* ============================================================
   Combat resolution (book pp.91–99).
   Foes never roll dice: heroes roll Attack and Defense.
   ============================================================ */

export type FoeClass = 'minor' | 'major'

export interface AttackInput {
  /** The PC's tier-die sides (6/8/10/12/20). */
  dieSides: number
  /** Sum of all attack modifiers (+L, weapon, situational…). */
  modifiers: number
  rng?: Rng
}

export interface AttackOutcome extends ExplodingRoll {
  /** total + modifiers — the number compared against the Foe's L. */
  attackTotal: number
}

/** Roll an Attack: exploding tier die plus modifiers. */
export function rollAttack(input: AttackInput): AttackOutcome {
  const rng = input.rng ?? defaultRng
  const base = rollExploding(rng, input.dieSides)
  return { ...base, attackTotal: base.total + input.modifiers }
}

/**
 * Resolve an attack against a Foe's L.
 * The attack total is "damage": divided by the Foe's L, rounded down,
 * gives Minor Foes slain or Major Foe damage (0 if the total < L).
 */
export function resolveAttack(attackTotal: number, foeL: number, _class: FoeClass): number {
  if (foeL <= 0) return 0
  const hits = Math.floor(attackTotal / foeL)
  return hits > 0 ? hits : 0
}

export interface DefenseInput {
  foeL: number
  dieSides: number
  /** Armor/shield/class modifiers. */
  modifiers: number
  rng?: Rng
}

export interface DefenseOutcome {
  success: boolean
  /** total + modifiers. */
  defenseTotal: number
  rolls: number[]
  exploded: boolean
  /** True when the first die showed1 (always a failure, per the book). */
  rolledOne: boolean
}

/**
 * Roll a Defense vs. the Foe's L.
 * - A first die of1 is always a failure, no matter the modifiers.
 * - Success requires rolling STRICTLY HIGHER than the Foe's L.
 * - A max-tier die result explodes (adds more dice), but is not auto-success.
 */
export function rollDefense(input: DefenseInput): DefenseOutcome {
  const rng = input.rng ?? defaultRng
  const base = rollExploding(rng, input.dieSides)
  const rolledOne = base.rolls[0] === 1
  const defenseTotal = base.total + input.modifiers
  const success = !rolledOne && defenseTotal > input.foeL
  return { success, defenseTotal, rolls: base.rolls, exploded: base.exploded, rolledOne }
}

/**
 * Morale check when a Minor Foe group drops below half.
 * d6 + modifier; ≤3 the group flees, otherwise it keeps fighting.
 * "Morale: Never" / "fight to the death" Foes never test.
 */
export function moraleCheck(roll: number, modifier = 0): 'flee' | 'fight' {
  return roll + modifier <= 3 ? 'flee' : 'fight'
}

/** True if a Foe never tests Morale (from its morale string). */
export function neverTestsMorale(morale: string): boolean {
  const m = morale.toLowerCase()
  return m.includes('never') || m.includes('fight to the death')
}
