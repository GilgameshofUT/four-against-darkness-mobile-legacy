import { rollDie, type Rng } from './dice'
import { tier } from './hcl'

/* ============================================================
   Experience & leveling (book pp.117–118).
   Four official systems; the engine supports all four.
   ============================================================ */

/**
 * Classical XP roll: roll d6, try to roll HIGHER than the PC's current L.
 * A6 always succeeds. Success → +1 Level.
 */
export function xpRollSucceeds(roll: number, currentLevel: number): boolean {
  return roll === 6 || roll > currentLevel
}

/** Perform an XP roll for a PC; returns whether they level up. */
export function attemptLevelUp(rng: Rng, currentLevel: number): boolean {
  return xpRollSucceeds(rollDie(rng, 6), currentLevel)
}

/** Old School: XP for defeating a group of Minor Foes (L each; halved if Vermin). */
export function minorFoeXp(foeLevel: number, count: number, isVermin: boolean): number {
  const xp = foeLevel * count
  return isVermin ? Math.floor(xp / 2) : xp
}

/** Old School: XP for a Major Foe = L×10 +5 per Life point. */
export function majorFoeXp(foeLevel: number, life: number): number {
  return foeLevel * 10 + life * 5
}

/** Old School: spend (Tier+2)×100 XP to level up or gain a skill. */
export function oldSchoolLevelCost(characterLevel: number): number {
  return (tier(characterLevel) + 2) * 100
}

/** Slower Advancement: XP required to attempt the roll to reach `targetLevel`. */
export function slowerAdvancementCost(targetLevel: number): number {
  return targetLevel
}

/** Training/guild fee to cross into a new tier (Slower Advancement). */
export function tierTrainingCost(tierNumber: number): number {
  switch (tierNumber) {
    case 2: return 500
    case 3: return 1000
    case 4: return 2500
    case 5: return 5000
    default: return 0
  }
}
