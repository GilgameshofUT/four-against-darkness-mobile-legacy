/* ============================================================
   Attack modifiers vs. a specific Foe (book pp.91–92,147).

   The class's *base* bonus is only part of the story — several
   classes gain their bonus only against particular Foes (cleric
   vs undead, rogue vs outnumbered minors) or a bonus on top
   (dwarf vs goblins, elf vs orcs). This module computes the
   correct total for a class + level against a concrete Foe.
   ============================================================ */

export interface FoeContext {
  name: string
  tags: string[]
  kind: 'minor' | 'major'
  /** Foes remaining in the group (for minor groups). */
  count: number
}

export const isUndead = (f: FoeContext): boolean => f.tags.includes('undead')
export const isGoblin = (f: FoeContext): boolean => /goblin/i.test(f.name)
export const isOrc = (f: FoeContext): boolean => /\borc/i.test(f.name)

/**
 * Total attack modifier for a PC (class+level) attacking a Foe,
 * including foe-conditional class bonuses. partySize is used for
 * the rogue's "outnumbered Minor Foe" rule.
 */
export function attackModVs(classId: string, level: number, foe: FoeContext, partySize: number): number {
  const L = level
  const half = Math.floor(level / 2)
  const outnumbered = foe.kind === 'minor' && partySize > foe.count

  switch (classId) {
    // Full martial: +L to all attacks.
    case 'warrior':
    case 'barbarian':
    case 'paladin':
    case 'assassin':
    case 'ranger':
      return L
    // Dwarf: +L melee, +1 more vs goblins.
    case 'dwarf':
      return L + (isGoblin(foe) ? 1 : 0)
    // Elf: +L, +1 more vs orcs.
    case 'elf':
      return L + (isOrc(foe) ? 1 : 0)
    // Cleric: +1/2L, but +L when fighting undead.
    case 'cleric':
      return isUndead(foe) ? L : half
    // Rogue: no bonus normally; +L only vs an outnumbered Minor Foe.
    case 'rogue':
      return outnumbered ? L : 0
    // Partial martial: +1/2L.
    case 'acrobat':
    case 'bulwark':
    case 'druid':
    case 'swashbuckler':
    case 'light-gladiator':
      return half
    // Casters: no melee bonus.
    case 'wizard':
    case 'illusionist':
    case 'gnome':
    case 'halfling':
      return 0
    // Weapon-dependent classes: use the safe +1/2L baseline
    // (their +L applies only with signature weapons, which the
    // engine does not yet track per-PC).
    case 'mushroom-monk':
      return half
    case 'kukla':
      return 1
    default:
      return half
  }
}

/** Human-readable note for the chosen modifier (for UI). */
export function attackModNote(classId: string, foe: FoeContext, partySize: number): string {
  const outnumbered = foe.kind === 'minor' && partySize > foe.count
  switch (classId) {
    case 'cleric': return isUndead(foe) ? '+L vs undead' : ''
    case 'rogue': return outnumbered ? '+L vs outnumbered' : 'no bonus'
    case 'dwarf': return isGoblin(foe) ? '+1 vs goblins' : ''
    case 'elf': return isOrc(foe) ? '+1 vs orcs' : ''
    default: return ''
  }
}
