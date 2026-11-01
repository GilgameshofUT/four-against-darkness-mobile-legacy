/* ============================================================
   Dice — the mechanical heart of 4AD.
   Seeded RNG for reproducible tests; the Explosion rule
   (roll the threshold → roll again and add, cumulative).
   ============================================================ */

export type Rng = () => number

/** Deterministic RNG (mulberry32). Default engine uses Math.random. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const defaultRng: Rng = Math.random

/** Integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/** Tier → die sides:1=d6,2=d8,3=d10,4=d12,5=d20. */
export const TIER_DIE: Record<number, number> = {1: 6, 2: 8, 3: 10, 4: 12, 5: 20}

/** Minimum roll on a die that triggers an Explosion (book p.5). */
export function explodeThreshold(sides: number): number {
  switch (sides) {
    case 6: return 6
    case 8: return 7
    case 10: return 8
    case 12: return 9
    case 20: return 10
    default: return sides // non-standard dice explode only on max
  }
}

export function rollDie(rng: Rng, sides: number): number {
  return randInt(rng, 1, sides)
}

export interface ExplodingRoll {
  /** Sum of every die rolled (the final number used). */
  total: number
  /** Each individual die in order, for showing the explosion chain. */
  rolls: number[]
  /** True if at least one explosion occurred. */
  exploded: boolean
}

/**
 * Roll a die, exploding on the threshold: keep rolling and adding while
 * the last die meets the threshold (cumulative; a reroll may explode again).
 */
export function rollExploding(rng: Rng, sides: number): ExplodingRoll {
  const threshold = explodeThreshold(sides)
  const rolls: number[] = []
  let total = 0
  let die = rollDie(rng, sides)
  for (;;) {
    rolls.push(die)
    total += die
    if (die < threshold) break
    die = rollDie(rng, sides)
  }
  return { total, rolls, exploded: rolls.length > 1 }
}

/** Roll dice notation: "d6", "2d6", "3d6", "d6+3", "d6-1", "2d6+HCL" is handled upstream. */
export function rollNotation(rng: Rng, notation: string): number {
  const m = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/.exec(notation)
  if (!m) throw new Error(`Bad dice notation: ${notation}`)
  const count = m[1] ? parseInt(m[1], 10) : 1
  const sides = parseInt(m[2] ?? '6', 10)
  const bonus = m[3] ? parseInt(m[3].replace(/\s+/g, ''), 10) : 0
  let sum = 0
  for (let i = 0; i < count; i++) sum += rollDie(rng, sides)
  return sum + bonus
}

/** d66: two d6s as tens+units →11..66. */
export function rollD66(rng: Rng): number {
  const tens = rollDie(rng, 6)
  const units = rollDie(rng, 6)
  return tens * 10 + units
}

/** d100: two d10s as tens+units →1..100. */
export function rollD100(rng: Rng): number {
  const tens = rollDie(rng, 10)
  const units = rollDie(rng, 10)
  const v = tens * 10 + units
  return v === 0 ? 100 : v
}

/** d3: roll a d6,1-2=1,3-4=2,5-6=3. */
export function rollD3(rng: Rng): number {
  return Math.ceil(rollDie(rng, 6) / 2)
}
