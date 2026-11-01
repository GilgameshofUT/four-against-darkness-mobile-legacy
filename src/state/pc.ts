import { classes } from '../data/classes'
import type { HeroClass } from '../data/schema'
import { bonusHalfL, bonusL } from '../core/hcl'

/* ============================================================
   Player characters — model + stats computed from class data.
   ============================================================ */

export interface PC {
  id: string
  name: string
  classId: string
  level: number
  gold: number
  /** Current Life points. */
  life: number
  clues: number
  xp: number
  /** Chosen trait names. */
  traits: string[]
  /** Prepared spell ids (spellcasters). */
  preparedSpells: string[]
  /** Equipment ids carried. */
  inventory: string[]
  /** Class resource pools keyed by name (spellSlots, luck, tricks…). */
  resources: Record<string, number>
}

export function getClass(classId: string): HeroClass {
  const c = classes.find((x) => x.id === classId)
  if (!c) throw new Error(`Unknown class: ${classId}`)
  return c
}

export function maxLife(cls: HeroClass, level: number): number {
  return cls.life.base + level
}

/** Numeric attack bonus from the class's attack modifier at a level. */
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
export function computeSlots(cls: HeroClass, level: number): number {
  const f = cls.magic?.slotsText
  if (!f) return 0
  if (f === 'L') return level
  const m = /^(\d+)\+L$/.exec(f) || /^L\+(\d+)$/.exec(f)
  if (m) return level + parseInt(m[1] ?? '0', 10)
  const n = parseInt(f, 10)
  return Number.isFinite(n) ? n : 0
}

/** Starting resource pools a fresh PC of this class gets. */
function initialResources(cls: HeroClass, level: number): Record<string, number> {
  const res: Record<string, number> = {}
  if (cls.magic?.usesSpells && cls.magic.slotsText) res.spellSlots = computeSlots(cls, level)
  for (const a of cls.abilities) {
    const n = a.name.toLowerCase()
    if (n.startsWith('tricks')) res.tricks = level + 3
    else if (n.startsWith('luck')) res.luck = level + 1
    else if (n.startsWith('panache')) res.panache = 0
    else if (n.startsWith('gadgeteer')) res.gadget = level + 6
    else if (n.startsWith('prayer')) res.prayer = level + 1
    else if (n.startsWith('healing')) res.healing = 3
    else if (n.startsWith('blessing')) res.blessing = 3
    else if (n.startsWith('rage')) res.rage = 1 + Math.floor(level / 2)
  }
  return res
}

let seq = 0
export function createPC(name: string, classId: string, level = 1): PC {
  const cls = getClass(classId)
  return {
    id: `pc-${Date.now()}-${seq++}`,
    name,
    classId,
    level,
    gold: 0,
    life: maxLife(cls, level),
    clues: 0,
    xp: 0,
    traits: [],
    preparedSpells: [],
    inventory: [],
    resources: initialResources(cls, level),
  }
}

export interface Derived {
  cls: HeroClass
  attack: number
  defense: number
  maxLife: number
  slots: number
  tier: number
  /** Attack roll display, e.g. "d6+3" (tier die + bonus). */
  attackRoll: string
  defenseRoll: string
}

export function derive(pc: PC): Derived {
  const cls = getClass(pc.classId)
  const tier = pc.level >= 20 ? 5 : pc.level >= 15 ? 4 : pc.level >= 10 ? 3 : pc.level >= 5 ? 2 : 1
  const die = [6, 8, 10, 12, 20][tier - 1] ?? 6
  const atk = attackBonus(cls, pc.level)
  const def = defenseBonus(cls, pc.level)
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  return {
    cls,
    attack: atk,
    defense: def,
    maxLife: maxLife(cls, pc.level),
    slots: computeSlots(cls, pc.level),
    tier,
    attackRoll: `d${die}${fmt(atk)}`,
    defenseRoll: `d${die}${fmt(def)}`,
  }
}
