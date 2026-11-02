import { equipment } from '../data/equipment'
import { tier as computeTier } from './hcl'
import { equippedArmorDefenseMod, equippedWeaponMod, type PC } from '../state/pc'

/* ============================================================
   Attack, Defense, Stealth & Save modifiers (Book pp. 77–79,
   91–97, 147–148 — verified via vision transcription).
   ============================================================ */

export interface FoeContext {
  name: string
  tags: string[]
  kind: 'minor' | 'major'
  /** Foes remaining in the group (for minor groups). */
  count: number
}

export const isUndead = (f: FoeContext): boolean =>
  f.tags.includes('undead') || /skeleton|zombie|mummy|wraith|ghost|vampire|phantom/i.test(f.name)
export const isSkeleton = (f: FoeContext): boolean => /skeleton/i.test(f.name) && !/armored skeleton/i.test(f.name)
export const isGoblin = (f: FoeContext): boolean => /goblin/i.test(f.name)
export const isOrc = (f: FoeContext): boolean => /\borc|orcling/i.test(f.name)
export const isGiantTrollOgre = (f: FoeContext): boolean => /giant|troll|ogre/i.test(f.name)
export const isDemon = (f: FoeContext): boolean => f.tags.includes('demon') || /demon/i.test(f.name)
export const isWeird = (f: FoeContext): boolean => f.tags.includes('weird')

/**
 * Class + Foe conditional Attack modifier (Book p. 147).
 * Kept backward-compatible with modifiers.test.ts.
 */
export function attackModVs(classId: string, level: number, foe: FoeContext, partySize: number): number {
  const L = level
  const half = Math.floor(level / 2)
  const outnumbered = foe.kind === 'minor' && partySize > foe.count

  switch (classId) {
    case 'warrior':
    case 'barbarian':
    case 'paladin':
    case 'assassin':
    case 'ranger':
      return L
    case 'dwarf':
      return L + (isGoblin(foe) ? 1 : 0)
    case 'elf':
      return L + (isOrc(foe) ? 1 : 0)
    case 'cleric':
      return isUndead(foe) ? L : half
    case 'rogue':
      return outnumbered ? L : 0
    case 'acrobat':
    case 'bulwark':
    case 'druid':
    case 'swashbuckler':
    case 'light-gladiator':
      return half
    case 'wizard':
    case 'illusionist':
    case 'gnome':
    case 'halfling':
      return 0
    case 'mushroom-monk':
      return half
    case 'kukla':
      return 1
    default:
      return half
  }
}

/**
 * Complete Attack modifier for a full PC Play Sheet attacking a Foe (Book p. 147),
 * incorporating Class, Weapon, Darkness, Traits, and Active Spells/Gadgets.
 */
export function fullAttackModVs(
  pc: PC,
  foe: FoeContext,
  partySize: number,
  opts: { inDarkness?: boolean; narrowCorridor?: boolean; subdual?: boolean; ranged?: boolean } = {},
): { total: number; breakdown: string[] } {
  const L = pc.level
  const half = Math.floor(L / 2)
  const t = computeTier(L)
  const breakdown: string[] = []
  let total = 0

  const wid = pc.mainHand
  const wepItem = wid ? equipment.find((e) => e.id === wid) : null
  const isTwoHandedMelee = wid === 'two-handed-weapon' || wid === 'two-handed-sword' || wid === 'maul'
  const isRanged =
    opts.ranged ||
    wid === 'bow' ||
    wid === 'crossbow' ||
    wid === 'sling' ||
    wid === 'handgun' ||
    wid === 'black-powder-rifle' ||
    wid === 'throwing-star'
  const isCrushing = wepItem?.damageType === 'crushing'

  // 1. Class-based modifier (Book p. 147)
  let classMod = 0
  switch (pc.classId) {
    case 'warrior':
    case 'barbarian':
    case 'paladin':
    case 'assassin':
    case 'ranger':
      classMod = L
      break
    case 'dwarf':
      // Dwarves add +L to melee only (no ranged bonus), +1 vs goblins (p. 30, p. 147)
      classMod = (isRanged ? 0 : L) + (isGoblin(foe) ? 1 : 0)
      break
    case 'elf':
      // Elves add +L except with two-handed melee weapons, +1 vs orcs (p. 34, p. 147)
      classMod = (isTwoHandedMelee ? 0 : L) + (isOrc(foe) ? 1 : 0)
      break
    case 'cleric':
      classMod = isUndead(foe) ? L : half
      break
    case 'rogue': {
      const outnumbered =
        (foe.kind === 'minor' || pc.traits.includes('Backstabber')) && partySize > foe.count
      classMod = outnumbered ? L : 0
      break
    }
    case 'bulwark':
      classMod = isRanged ? t : half
      break
    case 'acrobat':
    case 'druid':
    case 'swashbuckler':
    case 'light-gladiator':
      classMod = half
      break
    case 'halfling':
      classMod = wid === 'sling' ? L : 0
      break
    case 'mushroom-monk':
      classMod = !wid || wid === 'nunchaku' || wid === 'throwing-star' ? L : half
      break
    case 'kukla':
      classMod = wid === 'dagger' || wid === 'light-weapon' ? 1 : 0
      break
    case 'gnome':
      classMod = pc.activeEffects.includes('gadget-weapon') ? L : 0
      break
    case 'wizard':
    case 'illusionist':
      classMod = pc.activeEffects.includes('illusionary-sword') ? L : 0
      break
    default:
      classMod = half
  }
  if (classMod !== 0) {
    total += classMod
    breakdown.push(`Class ${classMod >= 0 ? `+${classMod}` : classMod}`)
  }

  // 2. Weapon-based modifier (Book p. 147)
  const wepMod = equippedWeaponMod(pc, opts.narrowCorridor)
  if (wepMod !== 0) {
    total += wepMod
    breakdown.push(`${wepItem?.name ?? 'Weapon'} ${wepMod >= 0 ? `+${wepMod}` : wepMod}`)
  }

  // Crushing weapon vs Skeleton (+1, Book p. 92 & p. 147)
  if (isCrushing && isSkeleton(foe)) {
    total += 1
    breakdown.push('Crushing vs Skeleton +1')
  }

  // Torch vs Mummy / Flammable (+2, Book p. 83 & p. 147)
  if (wid === 'torch' && /mummy/i.test(foe.name)) {
    total += 3 // +2 instead of -1
    breakdown.push('Torch vs Mummy +2')
  }

  // 3. Trait-based modifiers (Book p. 147)
  if (pc.traits.includes('Beast Slayer') && isWeird(foe)) {
    total += 1
    breakdown.push('Beast Slayer +1')
  }
  if (pc.traits.includes('Axe Mastery') && wid === 'axe') {
    total += 1
    breakdown.push('Axe Mastery +1')
  }
  if (pc.traits.includes('Sling Skill') && wid === 'sling') {
    total += t
    breakdown.push(`Sling Skill +${t}`)
  }
  if (pc.traits.includes('Deadeye') && (wid === 'bow' || wid === 'crossbow')) {
    total += 1
    breakdown.push('Deadeye +1')
  }
  if (pc.traits.includes('Knife Fighter') && wid === 'dagger') {
    total += t
    breakdown.push(`Knife Fighter +${t}`)
  }
  if (pc.traits.includes('Good Shot') && isRanged) {
    total += 1
    breakdown.push('Good Shot +1')
  }
  if (
    pc.traits.includes('Sword/Mace Training') &&
    ((pc.weaponTraining === 'sword' && wid === 'sword') ||
      (pc.weaponTraining === 'mace' && wid === 'mace'))
  ) {
    total += t
    breakdown.push(`Weapon Training +${t}`)
  }

  // 4. Active buffs / debuffs / situational (Book p. 147)
  if (opts.inDarkness) {
    total -= 2
    breakdown.push('Darkness -2')
  }
  if (opts.subdual && !pc.activeEffects.includes('subdual-blessing')) {
    total -= 1
    breakdown.push('Subdual -1')
  }
  if (pc.activeEffects.includes('blessed-temple') && (isUndead(foe) || isDemon(foe))) {
    total += 1
    breakdown.push('Blessed Shrine +1')
  }
  if (pc.activeEffects.includes('chant-of-valor')) {
    total += 1
    breakdown.push('Chant of Valor +1')
  }
  if (pc.activeEffects.includes('bladesong')) {
    total += 1
    breakdown.push('Bladesong +1')
  }
  if (pc.activeEffects.includes('envenomed-weapon')) {
    total += 1
    breakdown.push('Blade Poison +1')
  }
  if (pc.activeEffects.includes('panache-atk')) {
    total += 1
    breakdown.push('Panache +1')
  }
  if (pc.activeEffects.includes('bear-trap')) {
    total -= 1
    breakdown.push('Bear Trap -1')
  }

  return { total, breakdown }
}

/**
 * Complete Defense modifier for a PC defending against a Foe (Book p. 148).
 */
export function fullDefenseModVs(
  pc: PC,
  foe: FoeContext,
  opts: {
    inDarkness?: boolean
    fleeing?: boolean
    withdrawing?: boolean
    surprisedByWandering?: boolean
    firstAttackOfCombat?: boolean
    hasLightSource?: boolean
  } = {},
): { total: number; breakdown: string[] } {
  const L = pc.level
  const half = Math.floor(L / 2)
  const t = computeTier(L)
  const breakdown: string[] = []
  let total = 0

  // 1. Class-based Defense modifier (Book p. 148)
  let classMod = 0
  if (pc.classId === 'rogue' || pc.classId === 'acrobat') classMod = L
  else if (
    pc.classId === 'bulwark' ||
    pc.classId === 'gnome' ||
    pc.classId === 'kukla' ||
    pc.classId === 'light-gladiator' ||
    pc.classId === 'mushroom-monk' ||
    pc.classId === 'swashbuckler'
  ) {
    classMod = half
  }
  if (pc.classId === 'dwarf' && isGiantTrollOgre(foe)) classMod += 1
  if (pc.classId === 'halfling' && isGiantTrollOgre(foe)) classMod += L

  if (classMod !== 0) {
    total += classMod
    breakdown.push(`Class +${classMod}`)
  }

  // 2. Armor & Shield (Book p. 96 & p. 148)
  const ignoreShield =
    Boolean(opts.fleeing) ||
    Boolean(opts.surprisedByWandering) ||
    /rat men/i.test(foe.name) // Rat Men flails ignore shield
  const ignoreHeavy = /iron eater/i.test(foe.name)
  const armMod = equippedArmorDefenseMod(pc, ignoreShield, ignoreHeavy)
  if (armMod !== 0) {
    total += armMod
    breakdown.push(`Gear/Buffs ${armMod >= 0 ? `+${armMod}` : armMod}`)
  }

  // 3. Trait & Foe-situational Defense modifiers (Book p. 148)
  if (pc.traits.includes('Sacred Defense') && (isUndead(foe) || isDemon(foe))) {
    total += 1
    breakdown.push('Sacred Defense +1')
  }
  if (pc.traits.includes('Tight Guard') && opts.firstAttackOfCombat) {
    total += 1
    breakdown.push('Tight Guard +1')
  }
  if (
    pc.traits.includes('Clockwork Armor Specialist') &&
    pc.armor === 'clockwork-armor' &&
    opts.firstAttackOfCombat
  ) {
    total += 1
    breakdown.push('Clockwork Specialist +1')
  }
  if (pc.activeEffects.includes('hazy-veil')) {
    total += t
    breakdown.push(`Hazy Veil +${t}`)
  }
  if (pc.activeEffects.includes('panache-def')) {
    total += 1
    breakdown.push('Panache +1')
  }
  if (/morlock/i.test(foe.name) && opts.hasLightSource) {
    total += 2
    breakdown.push('Light vs Morlock +2')
  }
  if (opts.withdrawing) {
    total += 1
    breakdown.push('Withdrawing +1')
  }
  if (opts.inDarkness) {
    total -= 2
    breakdown.push('Darkness -2')
  }

  return { total, breakdown }
}

/** Stealth Save modifier for a single PC (Book p. 78 Stealth Modifiers Summary). */
export function stealthSaveMod(pc: PC, inDarkness = false): number {
  const L = pc.level
  const half = Math.floor(L / 2)
  const t = computeTier(L)
  let mod = 0

  if (pc.classId === 'rogue' || pc.classId === 'assassin' || pc.classId === 'acrobat' || pc.classId === 'halfling') {
    mod += L
  } else if (
    pc.classId === 'swashbuckler' ||
    pc.classId === 'kukla' ||
    pc.classId === 'barbarian' ||
    pc.classId === 'cleric' ||
    pc.classId === 'dwarf' ||
    pc.classId === 'druid' ||
    pc.classId === 'illusionist' ||
    pc.classId === 'mushroom-monk' ||
    pc.classId === 'ranger'
  ) {
    mod += half
  } else if (pc.classId === 'elf') {
    mod += 1
  }

  if (pc.offHand === 'shield' || pc.mainHand === 'shield') mod -= 1
  if (pc.armor === 'heavy-armor') mod -= 1
  if (pc.traits.includes('Silent Step') || pc.traits.includes('Shadow-walker')) mod += t
  if (inDarkness) mod -= 2

  return mod
}

/** Disarm Trap / Lockpick modifier for a PC (Book pp. 60, 109–110, 164). */
export function trapOrLockMod(pc: PC, kind: 'disarm' | 'lockpick', inDarkness = false): number {
  const L = pc.level
  const half = Math.floor(L / 2)
  const t = computeTier(L)
  let mod = 0

  if (pc.classId === 'rogue') mod += L
  else if (pc.classId === 'gnome' && kind === 'disarm') mod += L
  else if (pc.classId === 'kukla') mod += half
  else if (pc.classId === 'acrobat' && kind === 'disarm') mod += half

  if (pc.traits.includes('Trap Expert') || pc.traits.includes('Delicate Touch')) mod += t
  if (kind === 'lockpick' && pc.inventory.includes('good-lockpicks')) mod += 1
  if (inDarkness) mod -= 2

  return mod
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
