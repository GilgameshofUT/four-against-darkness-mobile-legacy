import { classes } from '../data/classes'
import { equipment } from '../data/equipment'
import type { HeroClass } from '../data/schema'
import { bonusHalfL, bonusL, tier as computeTier } from '../core/hcl'
import { rollNotation, defaultRng, type Rng } from '../core/dice'

/* ============================================================
   Player characters — full Play Sheet model (Book pp. 3, 7–8,
   19–65, 81–88, 110–111, 206–207).
   ============================================================ */

export type ArmorId = 'none' | 'light-armor' | 'heavy-armor' | 'leafsteel-armor' | 'clockwork-armor'
export type PCStatus = 'alive' | 'dead' | 'petrified' | 'paralyzed' | 'asleep'

export interface GemItem {
  id: string
  name: string
  value: number
}

export interface Companion {
  id: string
  name: string
  level: number
  life: number
  maxLife: number
  attackMod: number
  defenseMod: number
}

export interface LoadoutOption {
  id: string
  label: string
  mainHand: string | null
  offHand: string | null
  armor: ArmorId
  shieldOnBack?: boolean
  extraInventory?: string[]
}

export interface PC {
  id: string
  name: string
  classId: string
  level: number
  /** Position in Marching Order: 1 & 2 = Front row, 3 & 4 = Rear row. */
  marchingOrder: 1 | 2 | 3 | 4
  gold: number
  /** Current Life points. */
  life: number
  status: PCStatus
  madness: number
  clues: number
  xp: number
  /** Chosen trait names (1 for most classes, 2 for Halfling). */
  traits: string[]
  /** Traits already spent during the current combat / adventure. */
  usedTraitsCombat: string[]
  usedTraitsAdventure: string[]
  /** Class-specific specialization choices. */
  swornEnemy?: string
  specialistSpell?: string
  weaponTraining?: 'sword' | 'mace'
  /** Active Milestone from Book p. 120. */
  milestone?: {
    id: string
    name: string
    progress: number
    target: number
    completed: boolean
  }
  /** Prepared spell ids (one entry per slot; consumed when cast). */
  preparedSpells: string[]
  /** Spent spell ids (can be recovered when Resting). */
  spentSpells: string[]
  /** Scrolls / bark / prisms carried (spell ids). */
  scrolls: string[]
  /** Equipped in Main Hand (weapon, pole, bow, torch, etc.). */
  mainHand: string | null
  /** Equipped in Off Hand (shield, lantern, torch, off-hand weapon). */
  offHand: string | null
  /** Worn body armor. */
  armor: ArmorId
  /** Shield strapped on back (takes 1 turn to ready, gives 0 Defense while on back). */
  shieldOnBack: boolean
  /** Lantern hung on shield via a Lantern Hook (2gp). */
  lanternOnHook: boolean
  /** Kukla prehensile hair slot (can hold a lantern without using a hand). */
  kuklaHairLantern: boolean
  /** Illusionist wearable Continual Light (hands-free light source). */
  continualLight: boolean
  /** Remaining rooms of light if holding a lit torch (max 6). */
  torchRoomsLeft: number
  /** Carried equipment ids in backpack/belt. */
  inventory: string[]
  /** Food rations carried (max 10). */
  foodRations: number
  /** Gems and jewelry carried. */
  gems: GemItem[]
  /** Adventure-limited consumable flags (Book p. 84: max 1 bandage & 1 healing potion per adventure). */
  bandageUsed: boolean
  potionUsed: boolean
  /** Temporary buffs/debuffs (protection, barkskin, cursed-altar, blessed-temple, hide-in-shadows…). */
  activeEffects: string[]
  /** Class resource pools keyed by name (spellSlots, luck, tricks, rage, gadget, prayer, healing, blessing, panache, spores, hyphae, smite). */
  resources: Record<string, number>
  /** Optional Druid/Ranger animal companion. */
  companion?: Companion
}

export function getClass(classId: string): HeroClass {
  const c = classes.find((x) => x.id === classId)
  if (!c) throw new Error(`Unknown class: ${classId}`)
  return c
}

export function maxLife(cls: HeroClass, level: number, traits: string[] = []): number {
  let bonus = 0
  if (traits.includes('Holy Resilience')) bonus += level >= 10 ? 2 : 1
  if (traits.includes('Iron Stomach')) bonus += 1
  if (traits.includes('Street Thug')) bonus += 1
  return cls.life.base + level + bonus
}

/** Numeric attack bonus from the class's baseline modifier at a level. */
export function attackBonus(cls: HeroClass, level: number): number {
  switch (cls.attack.mod) {
    case 'L': return bonusL(level)
    case 'halfL': return bonusHalfL(level)
    default: return 0
  }
}

export function defenseBonus(cls: HeroClass, level: number): number {
  switch (cls.defense.mod) {
    case 'L': return bonusL(level)
    case 'halfL': return bonusHalfL(level)
    default: return 0
  }
}

/** Parse a spell-slot formula ("L+2", "2+L", "L", "L+3") at a level. */
export function computeSlots(cls: HeroClass, level: number, traits: string[] = []): number {
  const f = cls.magic?.slotsText
  if (!f) return 0
  let base = 0
  if (f === 'L') base = level
  else {
    const m = /^(\d+)\+L$/.exec(f) || /^L\+(\d+)$/.exec(f)
    if (m) base = level + parseInt(m[1] ?? '0', 10)
    else {
      const n = parseInt(f, 10)
      base = Number.isFinite(n) ? n : 0
    }
  }
  if (traits.includes('Arcane Memory')) base += 1
  return base
}

/** Starting resource pools a fresh PC of this class gets. */
export function initialResources(cls: HeroClass, level: number, traits: string[] = []): Record<string, number> {
  const res: Record<string, number> = {}
  const t = computeTier(level)
  if (cls.magic?.usesSpells && cls.magic.slotsText) {
    res.spellSlots = computeSlots(cls, level, traits)
  }
  for (const a of cls.abilities) {
    const n = a.name.toLowerCase()
    if (n.startsWith('tricks')) res.tricks = level + 3
    else if (n.startsWith('luck')) res.luck = level + 1
    else if (n.startsWith('panache')) res.panache = 0
    else if (n.startsWith('gadgeteer')) res.gadget = level + (traits.includes('Fixer') ? 8 : 6)
    else if (n.startsWith('prayer')) res.prayer = level + 1
    else if (n.startsWith('healing')) res.healing = 3
    else if (n.startsWith('blessing')) res.blessing = 3
    else if (n.startsWith('rage')) res.rage = 1 + Math.floor(level / 2)
    else if (n.startsWith('spores')) res.spores = t + (traits.includes('Abundant Spores') ? 1 : 0)
    else if (n.startsWith('hyphae')) res.hyphae = 1
    else if (n.startsWith('divine smite')) res.smite = 1
  }
  return res
}

/** Exact book starting equipment loadouts for each of the 20 classes. */
export function getStartingLoadouts(classId: string, traits: string[] = []): LoadoutOption[] {
  switch (classId) {
    case 'warrior':
      return [
        { id: 'war-sword-shield', label: 'Light Armor, Shield & Sword (Slashing)', mainHand: 'sword', offHand: 'shield', armor: 'light-armor' },
        { id: 'war-mace-shield', label: 'Light Armor, Shield & Mace (Crushing)', mainHand: 'mace', offHand: 'shield', armor: 'light-armor' },
        { id: 'war-2h-sword', label: 'Light Armor & Greatsword (2H Slashing +1)', mainHand: 'two-handed-sword', offHand: null, armor: 'light-armor' },
        { id: 'war-maul', label: 'Light Armor & Maul (2H Crushing +1)', mainHand: 'maul', offHand: null, armor: 'light-armor' },
        { id: 'war-bow', label: 'Light Armor, Bow & Backup Sword', mainHand: 'bow', offHand: null, armor: 'light-armor', extraInventory: ['sword'] },
      ]
    case 'barbarian':
      return [
        { id: 'bar-axe-shield', label: 'Light Armor, Shield & Battleaxe (Slashing)', mainHand: 'axe', offHand: 'shield', armor: 'light-armor' },
        { id: 'bar-2h-sword', label: 'Light Armor & Greataxe (2H Slashing +1)', mainHand: 'two-handed-sword', offHand: null, armor: 'light-armor' },
        { id: 'bar-maul', label: 'Light Armor & Great-Hammer (2H Crushing +1)', mainHand: 'maul', offHand: null, armor: 'light-armor' },
        { id: 'bar-bow', label: 'Light Armor, Bow & Dagger', mainHand: 'bow', offHand: null, armor: 'light-armor', extraInventory: ['dagger'] },
      ]
    case 'dwarf':
      return [
        { id: 'dwf-axe-shield', label: 'Light Armor, Shield & Battleaxe', mainHand: 'axe', offHand: 'shield', armor: 'light-armor' },
        { id: 'dwf-hammer-shield', label: 'Light Armor, Shield & Warhammer (Crushing)', mainHand: 'mace', offHand: 'shield', armor: 'light-armor' },
        { id: 'dwf-heavy-2h', label: 'Heavy Armor (+2 Def) & Two-Handed Axe (+1 Atk)', mainHand: 'two-handed-sword', offHand: null, armor: 'heavy-armor' },
        { id: 'dwf-heavy-maul', label: 'Heavy Armor (+2 Def) & Two-Handed Maul (+1 Atk)', mainHand: 'maul', offHand: null, armor: 'heavy-armor' },
      ]
    case 'elf':
      return [
        { id: 'elf-sword-bow', label: 'Light Armor, Sword & Bow (Free hand for Spells)', mainHand: 'sword', offHand: null, armor: 'light-armor', extraInventory: ['bow'] },
        { id: 'elf-bow-ready', label: 'Light Armor, Bow Ready & Sword on Belt', mainHand: 'bow', offHand: null, armor: 'light-armor', extraInventory: ['sword'] },
      ]
    case 'cleric':
      return [
        { id: 'clr-mace-shield', label: 'Light Armor, Shield & Mace (Crushing +1 vs Skeletons)', mainHand: 'mace', offHand: 'shield', armor: 'light-armor' },
        { id: 'clr-sword-shield', label: 'Light Armor, Shield & Sword (Slashing)', mainHand: 'sword', offHand: 'shield', armor: 'light-armor' },
        { id: 'clr-2h-maul', label: 'Light Armor & Two-Handed Maul (+1 Atk, Crushing)', mainHand: 'maul', offHand: null, armor: 'light-armor' },
      ]
    case 'rogue': {
      const base: LoadoutOption[] = [
        { id: 'rog-dagger', label: 'Light Armor, Dagger, Rope & Lockpicks', mainHand: 'dagger', offHand: null, armor: 'light-armor', extraInventory: ['rope'] },
      ]
      if (traits.includes('Street Thug')) {
        base.unshift(
          { id: 'rog-thug-sword', label: 'Light Armor, Sword (Street Thug), Rope & Lockpicks', mainHand: 'sword', offHand: null, armor: 'light-armor', extraInventory: ['dagger', 'rope'] },
          { id: 'rog-thug-mace', label: 'Light Armor, Cudgel (Street Thug), Rope & Lockpicks', mainHand: 'mace', offHand: null, armor: 'light-armor', extraInventory: ['dagger', 'rope'] },
        )
      }
      return base
    }
    case 'wizard':
      return [
        { id: 'wiz-dagger', label: 'Dagger & Spellbook (Off-hand free for Spells)', mainHand: 'dagger', offHand: null, armor: 'none' },
        { id: 'wiz-staff', label: 'Walking Stick (Crushing) & Spellbook', mainHand: 'club', offHand: null, armor: 'none' },
      ]
    case 'halfling':
      return [
        { id: 'hlf-sling', label: 'Sling Ready (+L Atk), Dagger & Rations', mainHand: 'sling', offHand: null, armor: 'none', extraInventory: ['dagger'] },
        { id: 'hlf-dagger', label: 'Dagger in Hand, Sling on Belt & Rations', mainHand: 'dagger', offHand: null, armor: 'none', extraInventory: ['sling'] },
      ]
    case 'acrobat':
      return [
        { id: 'acr-knife', label: 'Knife (Slashing Light) & Rope', mainHand: 'dagger', offHand: null, armor: 'none', extraInventory: ['rope'] },
        { id: 'acr-club', label: 'Club (Crushing Light) & Rope', mainHand: 'club', offHand: null, armor: 'none', extraInventory: ['rope'] },
      ]
    case 'assassin':
      return [
        { id: 'asn-sword-xbow', label: 'Light Armor, Sword, Crossbow & Lockpicks', mainHand: 'sword', offHand: null, armor: 'light-armor', extraInventory: ['crossbow'] },
        { id: 'asn-2h-bow', label: 'Light Armor, Greatsword (+1 Atk), Bow & Lockpicks', mainHand: 'two-handed-sword', offHand: null, armor: 'light-armor', extraInventory: ['bow'] },
      ]
    case 'bulwark':
      return [
        { id: 'bul-sword', label: 'Heavy Armor (+2 Def), Shield (+1 Def) & Sword', mainHand: 'sword', offHand: 'shield', armor: 'heavy-armor' },
        { id: 'bul-mace', label: 'Heavy Armor (+2 Def), Shield (+1 Def) & Warhammer', mainHand: 'mace', offHand: 'shield', armor: 'heavy-armor' },
      ]
    case 'druid':
      return [
        { id: 'drd-staff', label: 'Wooden Staff (Crushing Light) — Off-hand free for Spells', mainHand: 'club', offHand: null, armor: 'none' },
        { id: 'drd-sickle', label: 'Sickle (Slashing Light) — Off-hand free for Spells', mainHand: 'dagger', offHand: null, armor: 'none' },
      ]
    case 'gnome':
      return [
        { id: 'gnm-dagger', label: 'Dagger, Spell Contraption & Lockpicks', mainHand: 'dagger', offHand: null, armor: 'none' },
        { id: 'gnm-club', label: 'Light Hammer, Spell Contraption & Lockpicks', mainHand: 'club', offHand: null, armor: 'none' },
      ]
    case 'illusionist':
      return [
        { id: 'ill-knife', label: 'Knife & Continual Light Medallion (Hands-Free Light!)', mainHand: 'dagger', offHand: null, armor: 'none' },
        { id: 'ill-staff', label: 'Walking Stick & Continual Light Medallion (Hands-Free Light!)', mainHand: 'club', offHand: null, armor: 'none' },
      ]
    case 'kukla':
      return [
        { id: 'kuk-dagger', label: 'Dagger (+1 Kukla bonus) + Green & Red Rings', mainHand: 'dagger', offHand: null, armor: 'none' },
      ]
    case 'light-gladiator':
      return [
        { id: 'lgl-dual', label: 'Two Light Blades (Dual-Wield 2 Attacks/turn) + Rope & Lantern', mainHand: 'dagger', offHand: 'dagger', armor: 'none', extraInventory: ['rope', 'lantern'] },
        { id: 'lgl-lantern', label: 'Light Blade + Lantern in Off-Hand + Spare Blade & Rope', mainHand: 'dagger', offHand: 'lantern', armor: 'none', extraInventory: ['dagger', 'rope'] },
      ]
    case 'mushroom-monk':
      return [
        { id: 'mmk-nunchaku', label: 'Nunchaku / Bo (+L Atk & Flurry of Blows)', mainHand: 'nunchaku', offHand: null, armor: 'none' },
        { id: 'mmk-stars', label: 'Throwing Stars (2 Ranged Attacks/turn, +L Atk)', mainHand: 'throwing-star', offHand: null, armor: 'none' },
      ]
    case 'paladin':
      return [
        { id: 'pal-sword-shield', label: 'Heavy Armor (+2 Def), Shield (+1 Def) & Sword', mainHand: 'sword', offHand: 'shield', armor: 'heavy-armor' },
        { id: 'pal-mace-shield', label: 'Heavy Armor (+2 Def), Shield (+1 Def) & Warhammer', mainHand: 'mace', offHand: 'shield', armor: 'heavy-armor' },
        { id: 'pal-2h-sword', label: 'Heavy Armor (+2 Def) & Two-Handed Greatsword (+1 Atk)', mainHand: 'two-handed-sword', offHand: null, armor: 'heavy-armor' },
      ]
    case 'ranger':
      return [
        { id: 'rng-dual-swords', label: 'Light Armor, Twin Swords (2 Attacks), Bow & Dagger', mainHand: 'sword', offHand: 'sword', armor: 'light-armor', extraInventory: ['bow', 'dagger'] },
        { id: 'rng-bow-ready', label: 'Light Armor, Bow Ready, Twin Swords & Dagger', mainHand: 'bow', offHand: null, armor: 'light-armor', extraInventory: ['sword', 'sword', 'dagger'] },
      ]
    case 'swashbuckler':
      return [
        { id: 'swb-rapier-dagger', label: 'Rapier (Main Hand) + Dagger (Off-Hand) — 2 Attacks/turn & Lucky Hat', mainHand: 'sword', offHand: 'dagger', armor: 'none' },
      ]
    default:
      return [
        { id: 'def-hand', label: 'Hand Weapon', mainHand: 'sword', offHand: null, armor: 'none' },
      ]
  }
}

/** Default spell preparation for spellcasting classes so they never enter with empty slots. */
export function defaultPreparedSpells(classId: string, slots: number, specialistSpell?: string): string[] {
  if (slots <= 0) return []
  if (classId === 'wizard') {
    const base = specialistSpell
      ? [specialistSpell, 'fireball', 'lightning', 'sleep', 'protection', 'escape']
      : ['fireball', 'lightning', 'sleep', 'protection', 'escape', 'blessing']
    return Array.from({ length: slots }, (_, i) => base[i % base.length]!)
  }
  if (classId === 'elf') {
    const base = ['lightning', 'fireball', 'sleep', 'protection', 'escape']
    return Array.from({ length: slots }, (_, i) => base[i % base.length]!)
  }
  if (classId === 'druid') {
    const base = ['water-jet', 'barkskin', 'spiderweb', 'summon-beast', 'warp-wood']
    return Array.from({ length: slots }, (_, i) => base[i % base.length]!)
  }
  if (classId === 'illusionist') {
    const base = ['illusionary-armor', 'phantasmal-binding', 'shadow-strike', 'illusionary-mirror-image', 'disbelief']
    return Array.from({ length: slots }, (_, i) => base[i % base.length]!)
  }
  if (classId === 'gnome') {
    // Gnomes memorize a single chosen Illusionist spell in all L slots (Book p. 36)
    return Array.from({ length: slots }, () => 'phantasmal-binding')
  }
  return []
}

export interface CreatePCOptions {
  level?: number
  marchingOrder?: 1 | 2 | 3 | 4
  traits?: string[]
  loadoutId?: string
  preparedSpells?: string[]
  swornEnemy?: string
  specialistSpell?: string
  weaponTraining?: 'sword' | 'mace'
  rng?: Rng
}

let seq = 0
export function createPC(name: string, classId: string, levelOrOpts: number | CreatePCOptions = 1): PC {
  const opts: CreatePCOptions = typeof levelOrOpts === 'number' ? { level: levelOrOpts } : levelOrOpts
  const level = opts.level ?? 1
  const rng = opts.rng ?? defaultRng
  const cls = getClass(classId)

  // Default trait(s) if none passed: first trait (or first 2 for halfling)
  const defaultTraits =
    classId === 'halfling'
      ? [cls.traits[0]!.name, cls.traits[1]!.name]
      : [cls.traits[0]!.name]
  const traits = opts.traits ?? defaultTraits

  const loadouts = getStartingLoadouts(classId, traits)
  const chosenLoadout = loadouts.find((l) => l.id === opts.loadoutId) ?? loadouts[0]!

  const slots = computeSlots(cls, level, traits)
  const preparedSpells = opts.preparedSpells ?? defaultPreparedSpells(classId, slots, opts.specialistSpell)

  // Roll starting gold per book class entry (e.g. "2d6", "3d6", "4d6", "5d6", "d6")
  const gold = rollNotation(rng, cls.startingWealth.dice)

  // Starting rations (Halfling d6+3, Ranger d3)
  let foodRations = 0
  if (classId === 'halfling') foodRations = rollNotation(rng, 'd6+3')
  else if (classId === 'ranger') foodRations = rollNotation(rng, 'd3')

  const baseInventory = [...(chosenLoadout.extraInventory ?? [])]

  const pc: PC = {
    id: `pc-${Date.now()}-${seq++}`,
    name,
    classId,
    level,
    marchingOrder: opts.marchingOrder ?? 1,
    gold,
    life: maxLife(cls, level, traits),
    status: 'alive',
    madness: 0,
    clues: 0,
    xp: 0,
    traits,
    usedTraitsCombat: [],
    usedTraitsAdventure: [],
    preparedSpells,
    spentSpells: [],
    scrolls: [],
    mainHand: chosenLoadout.mainHand,
    offHand: chosenLoadout.offHand,
    armor: chosenLoadout.armor,
    shieldOnBack: Boolean(chosenLoadout.shieldOnBack),
    lanternOnHook: false,
    kuklaHairLantern: false,
    continualLight: classId === 'illusionist', // Illusionists cast Continual Light for free (p. 42)
    torchRoomsLeft: 0,
    inventory: baseInventory,
    foodRations,
    gems: [],
    bandageUsed: false,
    potionUsed: false,
    activeEffects: [],
    resources: initialResources(cls, level, traits),
  }

  if (opts.swornEnemy) pc.swornEnemy = opts.swornEnemy
  else if (classId === 'ranger') pc.swornEnemy = 'Orcs'

  if (opts.specialistSpell) pc.specialistSpell = opts.specialistSpell
  else if (classId === 'wizard' && traits.includes('Specialist')) pc.specialistSpell = 'fireball'

  if (opts.weaponTraining) pc.weaponTraining = opts.weaponTraining
  else if (classId === 'warrior' && traits.includes('Sword/Mace Training')) pc.weaponTraining = 'sword'

  return pc
}

/** Check if this PC is currently providing light for the party (Book p. 83 & p. 110). */
export function pcProvidesLight(pc: PC): boolean {
  if (pc.status !== 'alive') return false
  if (pc.continualLight) return true
  if (pc.mainHand === 'lantern' || pc.offHand === 'lantern') return true
  if (pc.kuklaHairLantern) return true
  if (pc.lanternOnHook && pc.offHand === 'shield') return true
  if ((pc.mainHand === 'torch' || pc.offHand === 'torch') && pc.torchRoomsLeft > 0) return true
  if (pc.activeEffects.includes('glittering-crystal')) return true
  return false
}

/** Check if the party has an active light source. */
export function partyHasLight(party: PC[], tileSelfLit = false): boolean {
  if (tileSelfLit) return true
  return party.some((pc) => pcProvidesLight(pc))
}

/** Check if a PC has at least one free hand to cast a spell (Book p. 110 & p. 146). */
export function hasFreeHandForSpell(pc: PC): boolean {
  if (pc.classId === 'cleric' || pc.classId === 'paladin') return true // Prayers don't require a free hand (p. 28)
  if (pc.activeEffects.includes('juggling')) return true // Acrobat Juggling trick grants an extra free hand (p. 20)
  const main = pc.mainHand ? equipment.find((e) => e.id === pc.mainHand) : null
  if (main && main.hands === 2) return false
  // One of mainHand or offHand must be empty
  return pc.mainHand === null || pc.offHand === null
}

/** Check if an Elf is allowed to cast a spell right now (Book p. 34: Light/Leafsteel armor and NO shield in hand). */
export function canCastSpellsNow(pc: PC): { ok: boolean; reason?: string } {
  if (pc.status !== 'alive') return { ok: false, reason: `${pc.name} is ${pc.status}.` }
  if (pc.classId === 'elf') {
    if (pc.armor === 'heavy-armor') {
      return { ok: false, reason: 'Elves cannot cast spells while wearing Heavy Armor (Book p. 34).' }
    }
    if (pc.offHand === 'shield' || pc.mainHand === 'shield') {
      return { ok: false, reason: 'Elves cannot cast spells while holding a Shield (strap it to back first, Book p. 34).' }
    }
  }
  if (!hasFreeHandForSpell(pc)) {
    return { ok: false, reason: `${pc.name} needs one free hand to cast a spell (Book p. 110 / p. 146).` }
  }
  return { ok: true }
}

/** Weapon modifier from the PC's currently equipped mainHand weapon (Book p. 147). */
export function equippedWeaponMod(pc: PC, narrowCorridor = false): number {
  const wid = pc.mainHand
  if (!wid || wid === 'lantern' || wid === 'shield') {
    // Unarmed fighting (Book p. 93 & p. 147)
    if (pc.classId === 'mushroom-monk') return pc.level >= 5 ? 0 : -1
    if (pc.classId === 'kukla') return -1
    return -2
  }
  const item = equipment.find((e) => e.id === wid)
  const baseMod = item?.attackMod ?? 0
  const isLight = wid === 'light-weapon' || wid === 'dagger' || wid === 'club' || wid === 'throwing-star' || wid === 'stake' || wid === 'crowbar'
  const isTwoHanded = wid === 'two-handed-weapon' || wid === 'two-handed-sword' || wid === 'maul'

  if (narrowCorridor) {
    if (isTwoHanded) return -1 // Book p. 82 & p. 95: 2H weapons attack at net -1 in narrow corridors
    if (isLight) return 0 // Book p. 81 & p. 95: light weapons ignore -1 in narrow corridors
  }

  // Kukla using dagger: 0 (cancels -1 for light weapon, Book p. 44 & p. 147)
  if (pc.classId === 'kukla' && (wid === 'dagger' || wid === 'light-weapon')) return 0
  // Wizard with Scrapper trait ignores -1 on light weapon (Book p. 65 & p. 147)
  if (pc.classId === 'wizard' && pc.traits.includes('Scrapper') && isLight) return 0

  return baseMod
}

/** Armor + Shield defense bonus (Book p. 148). */
export function equippedArmorDefenseMod(pc: PC, ignoreShield = false, ignoreHeavyArmor = false): number {
  let mod = 0
  if (pc.armor === 'light-armor') mod += 1
  else if (pc.armor === 'heavy-armor' && !ignoreHeavyArmor) mod += 2
  else if (pc.armor === 'leafsteel-armor') mod += 2
  else if (pc.armor === 'clockwork-armor') {
    mod += pc.activeEffects.includes('clockwork-active') ? 3 : 1
  }

  const holdingShield = pc.offHand === 'shield' || pc.mainHand === 'shield'
  if (holdingShield && !ignoreShield) mod += 1

  // Trait passive defense bonuses (Book p. 148)
  if (pc.traits.includes('Nimble Dodge')) mod += 1
  if (pc.traits.includes('Tough Cap')) mod += 1
  if (pc.traits.includes('Scrapper')) mod += 1
  if (pc.traits.includes('Leafsteel Familiarity') && pc.armor === 'leafsteel-armor') mod += 1

  // Active spell/curse defense modifiers
  if (pc.activeEffects.includes('protection')) mod += 1
  if (pc.activeEffects.includes('barkskin')) mod += 2
  if (pc.activeEffects.includes('illusionary-armor')) mod += computeTier(pc.level)
  if (pc.activeEffects.includes('cursed-altar')) mod -= 1
  if (pc.activeEffects.includes('bear-trap')) mod -= 1

  return mod
}

export interface Derived {
  cls: HeroClass
  attack: number
  defense: number
  maxLife: number
  slots: number
  tier: number
  weaponName: string
  armorName: string
  /** Attack roll display, e.g. "d6+3" (tier die + bonus). */
  attackRoll: string
  defenseRoll: string
}

export function derive(pc: PC): Derived {
  const cls = getClass(pc.classId)
  const t = computeTier(pc.level)
  const die = [6, 8, 10, 12, 20][t - 1] ?? 6
  const atk = attackBonus(cls, pc.level) + equippedWeaponMod(pc)
  const def = defenseBonus(cls, pc.level) + equippedArmorDefenseMod(pc)
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  const wep = pc.mainHand ? equipment.find((e) => e.id === pc.mainHand)?.name ?? pc.mainHand : 'Unarmed (-2)'
  const arm =
    pc.armor === 'none'
      ? 'No Armor'
      : equipment.find((e) => e.id === pc.armor)?.name ?? pc.armor
  return {
    cls,
    attack: atk,
    defense: def,
    maxLife: maxLife(cls, pc.level, pc.traits),
    slots: computeSlots(cls, pc.level, pc.traits),
    tier: t,
    weaponName: wep,
    armorName: arm,
    attackRoll: `d${die}${fmt(atk)}`,
    defenseRoll: `d${die}${fmt(def)}`,
  }
}
