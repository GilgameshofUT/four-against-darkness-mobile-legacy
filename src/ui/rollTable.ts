import { rollDie, rollNotation, type Rng, defaultRng } from '../core/dice'
import type { RandTable } from '../data/schema'

/** Roll a table's dice ("d6", "2d6") to get a value. */
export function rollTableValue(dice: string, rng: Rng = defaultRng): number {
  if (/^d\d+$/.test(dice)) return rollDie(rng, parseInt(dice.slice(1), 10))
  return rollNotation(rng, dice)
}

/** Does an entry's roll range ("2", "0-1", "6+", "4-6") contain the value? */
export function entryMatches(rollStr: string, value: number): boolean {
  const s = rollStr.trim()
  const plus = /^(\d+)\+$/.exec(s)
  if (plus) return value >= parseInt(plus[1]!, 10)
  const range = /^(\d+)\s*[-–—]\s*(\d+)$/.exec(s)
  if (range) return value >= parseInt(range[1]!, 10) && value <= parseInt(range[2]!, 10)
  const single = /^(\d+)$/.exec(s)
  if (single) return value === parseInt(single[1]!, 10)
  return false
}

/** Faithfully roll a table: roll its dice, then pick the matching entry. */
export function rollTable(table: RandTable, rng: Rng = defaultRng): { value: number; text: string } {
  const value = rollTableValue(table.dice, rng)
  const entry = table.entries.find((e) => entryMatches(e.roll, value)) ?? table.entries[0]
  return { value, text: entry?.result ?? '' }
}
