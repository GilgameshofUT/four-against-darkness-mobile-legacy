/* ============================================================
   HCL & Tier — how danger scales with the party (book pp.3–5).
   ============================================================ */

/** Highest Character Level of the party. */
export function hcl(levels: readonly number[]): number {
  if (levels.length === 0) return 1
  return Math.max(...levels)
}

/** Tier Number by level:1-4→1,5-9→2,10-14→3,15-19→4,20+→5. */
export function tier(level: number): number {
  if (level >= 20) return 5
  if (level >= 15) return 4
  if (level >= 10) return 3
  if (level >= 5) return 2
  return 1
}

/**
 * A foe's Level = HCL + modifier, clamped to [1, maxLevel] if a cap is given.
 * HCL is fixed when the foe is first encountered.
 */
export function foeLevel(hclValue: number, mod: number, maxLevel?: number): number {
  let l = hclValue + mod
  if (l < 1) l = 1
  if (maxLevel !== undefined && l > maxLevel) l = maxLevel
  return l
}

/** +L modifier value at a given level. */
export function bonusL(level: number): number {
  return level
}

/** +1/2 L modifier (rounded down) at a given level. */
export function bonusHalfL(level: number): number {
  return Math.floor(level / 2)
}

/** +Tier modifier value at a given level. */
export function bonusTier(level: number): number {
  return tier(level)
}
