import { create } from 'zustand'
import { foeTables } from '../data/monsters'
import type { Foe, FoeKind } from '../data/schema'
import { rollDie, rollExploding, rollNotation, type Rng, defaultRng } from '../core/dice'
import { tier } from '../core/hcl'
import {
  moraleCheck,
  neverTestsMorale,
  parseFoeLevel,
  parseFoeLife,
  resolveAttack,
  rollAttack,
  rollDefense,
} from '../core/combat'
import { isAggressive, rollReaction } from '../core/reactions'
import {
  attackModVs,
  fullAttackModVs,
  fullDefenseModVs,
  isUndead,
  stealthSaveMod,
  type FoeContext,
} from '../core/modifiers'
import { resolveSpellCast } from '../core/spelleffects'
import { canCastSpellsNow, derive, partyHasLight, type PC } from './pc'
import { useParty } from './party'
import type { Environment } from './dungeon'

export type EncounterPhase =
  | 'approach'
  | 'reaction-choice'
  | 'pc-turn'
  | 'foe-turn'
  | 'victory'
  | 'fled'

export interface FoeInstance {
  uid: string
  name: string
  kind: FoeKind
  level: number
  baseLevel: number
  /** Minor groups: how many remain (and started). */
  remaining?: number
  initial?: number
  /** Major foes: current/max life. */
  life?: number
  maxLife?: number
  /** True once Major Foe has dropped below 50% Life (-1 L applied, Book p. 94). */
  woundedPenaltyApplied?: boolean
  /** True if this Major Foe is the dungeon's Final Boss (Book p. 105). */
  isFinalBoss?: boolean
  attacks: number
  damage: string
  treasure: string
  morale: string
  moraleTested?: boolean
  reactions: string
  reactionLabel: string
  tags: string[]
  text?: string | undefined
}

export interface AttackResult {
  pcName: string
  foeName: string
  total: number
  rolls: number[]
  exploded: boolean
  slain: number
  damage: number
  killed: boolean
  note: string
}

export interface BeginCombatOptions {
  inCorridor?: boolean
  wandering?: boolean
  isFinalBoss?: boolean
   bossRollInfo?: string
}

interface CombatState {
  active: boolean
  phase: EncounterPhase
  environment: Environment
  tileId: string | null
  inCorridor: boolean
  wandering: boolean
  surprised: boolean
  ambushBonus: boolean
  goldSensePreview: string | null
  foes: FoeInstance[]
  round: number
  log: string[]
  /** Set once a PC has acted this round. */
  pcsActed: Set<string>
  lastAttack: AttackResult | null
  lastFoeTurn: string[] | null
  lootReady: boolean

  begin: (foeKind: FoeKind, env: Environment, hclValue: number, opts?: BeginCombatOptions) => void
  /** Pre-combat approach choices (Book pp. 79, 90, 101, 146). */
  chooseAttackImmediately: () => void
  chooseWaitForReaction: (hclValue: number) => void
  chooseAttemptStealth: (mode: 'sneak-past' | 'ambush') => { ok: boolean; message: string }
  useDwarfGoldSense: (dwarfId: string) => { ok: boolean; message: string }
  /** Interactive reaction resolutions (Bribe, Blood Offering, Puzzle, Magic Challenge, Pass). */
  payBribe: (amountGp?: number, foodCount?: number) => { ok: boolean; message: string }
  payBloodOffering: (pcId: string) => { ok: boolean; message: string }
  attemptPuzzleReaction: (pcId: string) => { ok: boolean; message: string }
  attemptMagicChallenge: (pcId: string) => { ok: boolean; message: string }
  acceptPeacefulPass: () => void

  /** Check whether a PC can make a melee attack in the current tile/marching order (Book p. 95). */
  canPcMelee: (pc: PC) => { ok: boolean; reason?: string }
  /** Standard orRage/Smite attack. */
  attack: (
    pc: PC,
    foeUid: string,
    rng?: Rng,
    spell?: boolean,
    opts?: { rage?: boolean; smite?: boolean; subdual?: boolean },
  ) => AttackResult | null
  /** Cast a specific prepared spell (or default first slot). */
  castSpell: (pc: PC, foeUid: string, rng?: Rng, spellId?: string) => AttackResult | null
  /** Use class active ability in combat (Acrobat Trick, Gnome Gadget, Illusionist Lights, Monk Spores, Holy Water). */
  useCombatAbility: (
    pc: PC,
    ability:
      | 'distract'
      | 'distracting-lights'
      | 'spores'
      | 'gadget-weapon'
      | 'grenade'
      | 'smokescreen'
      | 'holy-water'
      | 'panache-atk'
      | 'panache-def',
    foeUid?: string,
  ) => { ok: boolean; message: string }
  /** Spend 1 Halfling Luck point to reroll the last missed attack or flee safely (Book p. 40). */
  spendHalflingLuck: (halflingId: string, mode: 'reroll-attack' | 'flee', foeUid?: string) => { ok: boolean; message: string }
  /** Withdraw (+1 Defense, requires door) or Flee (Book pp. 97–98). */
  withdrawOrFlee: (mode: 'withdraw' | 'flee', hclValue: number) => { ok: boolean; message: string }

  foeTurn: (hclValue: number, rng?: Rng) => string[]
  tryMorale: (foeUid: string, rng?: Rng) => 'flee' | 'fight' | 'never'
  markLoot: () => void
  clear: () => void
}

let u = 0
const uid = () => `foe-${u++}`

function parseMoraleMod(morale: string): number {
  const m = /^([+-]\d+)$/.exec(morale.trim())
  return m ? parseInt(m[1]!, 10) : 0
}

function parseCount(count: string | undefined, rng: Rng): number {
  if (!count) return 1
  try {
    const v = rollNotation(rng, count)
    return Math.max(1, v)
  } catch {
    return 1
  }
}

function parseAttackDamage(dmg: string | undefined, tierValue: number): number {
  if (!dmg) return 1
  const s = dmg.trim()
  const n = /^(\d+)$/.exec(s)
  if (n) return parseInt(n[1]!, 10)
  const t = /^Tier\s*([+-]\s*\d+)?/.exec(s)
  if (t) return tierValue + (t[1] ? parseInt(t[1].replace(/\s+/g, ''), 10) : 0)
  return 1
}

/** Pick a Foe from a d6 table entry (choosing among foes if the row is a choice). */
function pickFoe(tableId: string, rng: Rng): Foe | null {
  const table = foeTables.find((t) => t.id === tableId)
  if (!table) return null
  const entry = table.entries[rollDie(rng, 6) - 1]
  if (!entry || entry.foes.length === 0) return null
  if (entry.foes.length === 1) return entry.foes[0]!
  return entry.foes[rollDie(rng, entry.foes.length) - 1] ?? entry.foes[0]!
}

/** CheckMajor Foe < 50% Life rule (Book p. 94: reduce L by 1 when more than half Life is lost). */
function applyWoundedAndCountUpdate(foe: FoeInstance, slainDelta: number, damageDelta: number): FoeInstance {
  const minor = foe.kind === 'vermin' || foe.kind === 'minion'
  if (minor) {
    const remaining = Math.max(0, (foe.remaining ?? 0) - slainDelta)
    return { ...foe, remaining }
  }
  const life = Math.max(0, (foe.life ?? 0) - damageDelta)
  const maxLife = foe.maxLife ?? life
  const underHalf = life > 0 && life < Math.ceil(maxLife / 2)
  if (underHalf && !foe.woundedPenaltyApplied) {
    return {
      ...foe,
      life,
      level: Math.max(1, foe.level - 1),
      woundedPenaltyApplied: true,
    }
  }
  return { ...foe, life }
}

export const useCombat = create<CombatState>((set, get) => ({
  active: false,
  phase: 'pc-turn',
  environment: 'dungeon',
  tileId: null,
  inCorridor: false,
  wandering: false,
  surprised: false,
  ambushBonus: false,
  goldSensePreview: null,
  foes: [],
  round: 0,
  log: [],
  pcsActed: new Set<string>(),
  lastAttack: null,
  lastFoeTurn: null,
  lootReady: false,

  begin: (foeKind, env, hclValue, opts = {}) => {
    const rng = defaultRng
    const tableId = foeKind === 'minion' ? `${env}-minions` : `${env}-${foeKind}`
    let f = pickFoe(tableId, rng)
    // Invisible Gremlins are an event; if rolled in combat or as wandering, pick another foe if needed
    if (f && f.kind === 'event') {
      f = foeTables.find((t) => t.id === tableId)?.entries[0]?.foes[0] ?? f
    }
    if (!f) return
    const tierValue = tier(hclValue)
    const level = parseFoeLevel(f.level, hclValue, f.maxLevel)
    const minor = f.kind === 'vermin' || f.kind === 'minion'
    const isFinalBoss = Boolean(opts.isFinalBoss && !minor)
    const reaction = isFinalBoss
      ? 'Always Fight to the death (Final Boss!)'
      : rollReaction(f.reactions, rollDie(rng, 6))

    const inst: FoeInstance = {
      uid: uid(),
      name: isFinalBoss ? `${f.name} (FINAL BOSS)` : f.name,
      kind: f.kind,
      level,
      baseLevel: level,
      isFinalBoss,
      attacks: (f.attacks ?? 1) + (isFinalBoss ? 1 : 0),
      damage: f.damage ?? '1',
      treasure: f.treasure,
      morale: isFinalBoss ? 'never' : f.morale,
      reactions: f.reactions,
      reactionLabel: reaction,
      tags: f.tags,
      text: f.text,
    }
    if (minor) {
      const c = parseCount(f.count, rng)
      inst.remaining = c
      inst.initial = c
    } else {
      const baseLife = parseFoeLife(f.life, hclValue, tierValue) ?? 5
      const life = baseLife + (isFinalBoss ? 1 : 0)
      inst.life = life
      inst.maxLife = life
    }

    // Check surprise (Wandering Monsters always surprise unless Track Master / Keen Nose; or X-in-6 in text)
    let surprised = Boolean(opts.wandering)
    const surpriseMatch = /(\d+)-in-6 chance of surpris/i.exec(f.text ?? '')
    if (!surprised && surpriseMatch) {
      const chance = parseInt(surpriseMatch[1]!, 10)
      if (rollDie(rng, 6) <= chance) surprised = true
    }

    const initialLog: string[] = [
      `Encounter: ${minor ? `${inst.remaining}× ` : ''}${inst.name} (L${level}${!minor ? `, ${inst.life} Life` : ''})`,
    ]
    if (opts.bossRollInfo) initialLog.push(opts.bossRollInfo)
    if (surprised) {
      initialLog.push(
        opts.wandering
          ? `Wandering Monsters ambush the party${opts.inCorridor ? ' from the rear (Positions 3 & 4)' : ''}! Shields negated on Turn 1.`
          : `${inst.name} surprises the party! Reaction: ${reaction}`,
      )
    } else {
      initialLog.push(
        `You spot ${inst.name} before they act! Choose: Attack Immediately, Wait for Reaction, or Attempt Stealth.`,
      )
    }

    set({
      active: true,
      phase: isFinalBoss ? 'pc-turn' : surprised ? 'foe-turn' : 'approach',
      environment: env,
      inCorridor: Boolean(opts.inCorridor),
      wandering: Boolean(opts.wandering),
      surprised,
      ambushBonus: false,
      goldSensePreview: null,
      foes: [inst],
      round: 1,
      log: initialLog,
      pcsActed: new Set(),
      lastAttack: null,
      lastFoeTurn: null,
      lootReady: false,
    })
  },

  chooseAttackImmediately: () => {
    set((s) => ({
      phase: 'pc-turn',
      log: [...s.log, 'The party charges in and attacks first!'],
    }))
  },

  chooseWaitForReaction: (_hclValue) => {
    const st = get()
    const foe = st.foes[0]
    if (!foe) return
    const r = foe.reactionLabel.toLowerCase()

    if (r.includes('flee if outnumbered')) {
      const partyCount = useParty.getState().party.filter((p) => p.status === 'alive').length
      const foeCount = foe.remaining ?? 1
      if (partyCount > foeCount) {
        set({
          phase: 'fled',
          active: false,
          log: [...st.log, `Reaction: ${foe.reactionLabel} — outnumbered (${foeCount} vs ${partyCount}), ${foe.name} flees!`],
        })
        return
      }
      set({
        phase: 'foe-turn',
        log: [...st.log, `Reaction: ${foe.reactionLabel} — not outnumbered, so ${foe.name} attacks first!`],
      })
      return
    }

    if (r.startsWith('flee')) {
      set({
        phase: 'fled',
        active: false,
        log: [...st.log, `Reaction: ${foe.reactionLabel} — ${foe.name} turns tail and flees!`],
      })
      return
    }

    if (r.includes('offer food and rest')) {
      const party = useParty.getState()
      for (const p of party.party) {
        if (p.status === 'alive') party.setLife(p.id, p.life + 1)
      }
      set({
        phase: 'fled',
        active: false,
        log: [...st.log, `Reaction: Offer Food and Rest — friendly ${foe.name} shares food and tends your wounds (+1 Life to all)!`],
      })
      return
    }

    if (
      r.includes('bribe') ||
      r.includes('peaceful') ||
      r.includes('ignore') ||
      r.includes('blood offering') ||
      r.includes('puzzle') ||
      r.includes('magic challenge') ||
      r.includes('quest')
    ) {
      set({
        phase: 'reaction-choice',
        log: [...st.log, `Reaction rolled: ${foe.reactionLabel}. Choose how to respond.`],
      })
      return
    }

    // Fight or Fight to the death -> Foes attack first (Book p. 90 & p. 146)
    set({
      phase: 'foe-turn',
      log: [...st.log, `Reaction: ${foe.reactionLabel} — ${foe.name} attacks first!`],
    })
  },

  chooseAttemptStealth: (mode) => {
    const st = get()
    const foe = st.foes[0]
    if (!foe) return { ok: false, message: 'No foe.' }
    if (st.wandering) {
      return { ok: false, message: 'Cannot use Stealth against Wandering Monsters (Book p. 79).' }
    }
    const party = useParty.getState().party.filter((p) => p.status === 'alive')
    if (party.length === 0) return { ok: false, message: 'No living PCs.' }
    const hasLight = partyHasLight(party)
    // Group Stealth uses the WORST modifier in the party (Book p. 78)
    const worstMod = Math.min(...party.map((p) => stealthSaveMod(p, !hasLight)))
    const roll = rollExploding(defaultRng, 6)
    const total = roll.total + worstMod
    const success = roll.rolls[0] !== 1 && total >= foe.level

    if (!success) {
      set({
        phase: 'foe-turn',
        log: [
          ...st.log,
          `Stealth Save failed (rolled ${total} [worst mod ${worstMod >= 0 ? `+${worstMod}` : worstMod}] vs L${foe.level})! ${foe.name} spots you and attacks first!`,
        ],
      })
      return { ok: false, message: `Stealth failed (${total} vs L${foe.level}) — Foes attack first!` }
    }

    if (mode === 'sneak-past') {
      set({
        phase: 'fled',
        active: false,
        log: [...st.log, `Stealth Save succeeded (${total} vs L${foe.level})! The party slips past ${foe.name} unnoticed.`],
      })
      return { ok: true, message: `Slipped past ${foe.name} quietly!` }
    }

    // Ambush: reduce Foe's L by 1 (min 1) on Turn 1 and PCs attack first (Book p. 79)
    set({
      phase: 'pc-turn',
      ambushBonus: true,
      foes: st.foes.map((f) => ({ ...f, level: Math.max(1, f.level - 1) })),
      log: [
        ...st.log,
        `Stealth Ambush succeeded (${total} vs L${foe.level})! ${foe.name}'s Level is reduced by 1 to L${Math.max(1, foe.level - 1)} and the party strikes first!`,
      ],
    })
    return { ok: true, message: `Ambush! ${foe.name} is -1 L and you strike first!` }
  },

  useDwarfGoldSense: (dwarfId) => {
    const st = get()
    const foe = st.foes[0]
    const dwarf = useParty.getState().party.find((p) => p.id === dwarfId)
    if (!foe || !dwarf) return { ok: false, message: 'No Dwarf or Foe.' }
    if (st.goldSensePreview) return { ok: false, message: 'Already used Gold Sense on this encounter.' }
    const r = rollExploding(defaultRng, 6)
    const total = r.total + dwarf.level
    if (r.rolls[0] !== 1 && total >= 6) {
      const preview = `Dwarf Gold Sense (${total} vs L6): ${foe.name} carries Treasure [${foe.treasure}]!`
      set({ goldSensePreview: preview, log: [...st.log, preview] })
      return { ok: true, message: preview }
    }
    const fail = `Dwarf Gold Sense failed (${total} vs L6) — could not smell the hoard.`
    set({ goldSensePreview: fail, log: [...st.log, fail] })
    return { ok: false, message: fail }
  },

  payBribe: (amountGp, foodCount) => {
    const st = get()
    const foe = st.foes[0]
    if (!foe) return { ok: false, message: 'No foe.' }
    const partySt = useParty.getState()
    const dwarves = partySt.party.filter((p) => p.classId === 'dwarf' && p.status === 'alive').length
    // Book p. 30 Miser rule: A party with 2+ dwarves may NOT Bribe Foes!
    if (dwarves >= 2) {
      return { ok: false, message: 'Dwarf Miser Rule (Book p. 30): A party with 2+ Dwarves refuses to Bribe Foes!' }
    }

    if (foodCount && foodCount > 0) {
      const totalFood = partySt.party.reduce((sum, p) => sum + p.foodRations, 0)
      if (totalFood < foodCount) {
        return { ok: false, message: `Need ${foodCount} Food Rations (party has ${totalFood}).` }
      }
      let rem = foodCount
      for (const p of partySt.party) {
        if (rem <= 0) break
        const take = Math.min(p.foodRations, rem)
        if (take > 0) {
          partySt.updateHero(p.id, { foodRations: p.foodRations - take })
          rem -= take
        }
      }
      set({
        active: false,
        phase: 'fled',
        log: [...st.log, `Paid ${foodCount} Food Rations to ${foe.name} — they let you pass peacefully!`],
      })
      return { ok: true, message: `Bribed ${foe.name} with ${foodCount} Food Rations.` }
    }

    // Parse gp amount from reactionLabel if not explicitly provided
    let cost = amountGp ?? 20
    const m = /(\d+)\s*gp/i.exec(foe.reactionLabel)
    if (!amountGp && m) {
      const perEach = /each|per/i.test(foe.reactionLabel)
      cost = parseInt(m[1]!, 10) * (perEach ? (foe.remaining ?? 1) : 1)
    }
    const totalGold = partySt.party.reduce((sum, p) => sum + p.gold, 0)
    if (totalGold < cost) {
      return { ok: false, message: `Need ${cost}gp for bribe (party has ${totalGold}gp).` }
    }
    let rem = cost
    for (const p of partySt.party) {
      if (rem <= 0) break
      const take = Math.min(p.gold, rem)
      if (take > 0) {
        partySt.addGold(p.id, -take)
        rem -= take
      }
    }
    set({
      active: false,
      phase: 'fled',
      log: [...st.log, `Paid ${cost}gp Bribe to ${foe.name} — they stand aside peacefully!`],
    })
    return { ok: true, message: `Bribed ${foe.name} with ${cost}gp!` }
  },

  payBloodOffering: (pcId) => {
    const st = get()
    const foe = st.foes[0]
    const pc = useParty.getState().party.find((p) => p.id === pcId)
    if (!foe || !pc) return { ok: false, message: 'Character not found.' }
    if (pc.classId === 'kukla') return { ok: false, message: 'Kuklas are living dolls and have no blood to offer!' }
    if (pc.life <= 2) return { ok: false, message: `${pc.name} needs more than 2 Life to survive a Blood Offering.` }
    useParty.getState().setLife(pc.id, pc.life - 2)
    set({
      active: false,
      phase: 'fled',
      log: [...st.log, `${pc.name} gives a Blood Offering (-2 Life) — ${foe.name} is appeased!`],
    })
    return { ok: true, message: `${pc.name} paid the Blood Offering (-2 Life).` }
  },

  attemptPuzzleReaction: (pcId) => {
    const st = get()
    const foe = st.foes[0]
    const pc = useParty.getState().party.find((p) => p.id === pcId)
    if (!foe || !pc) return { ok: false, message: 'Character not found.' }
    const mod = pc.classId === 'wizard' ? pc.level : 0
    const r = rollExploding(defaultRng, 6)
    const total = r.total + mod
    if (r.rolls[0] !== 1 && total >= foe.level) {
      set({
        active: false,
        phase: 'fled',
        log: [...st.log, `${pc.name} solves ${foe.name}'s riddle (${total} vs L${foe.level})! They let the party pass.`],
      })
      return { ok: true, message: `${pc.name} solved the puzzle (${total} vs L${foe.level})!` }
    }
    set({
      phase: 'foe-turn',
      log: [...st.log, `${pc.name} fails the riddle (${total} vs L${foe.level}) — ${foe.name} attacks first!`],
    })
    return { ok: false, message: `Puzzle failed (${total} vs L${foe.level}) — Foes attack!` }
  },

  attemptMagicChallenge: (pcId) => {
    const st = get()
    const foe = st.foes[0]
    const pc = useParty.getState().party.find((p) => p.id === pcId)
    if (!foe || !pc) return { ok: false, message: 'Character not found.' }
    const r = rollExploding(defaultRng, 6)
    const total = r.total + pc.level
    if (r.rolls[0] !== 1 && total >= foe.level) {
      useParty.getState().noteDefeatedEncounter(foe.isFinalBoss ? 'final-boss' : 'major')
      set({
        phase: 'victory',
        lootReady: true,
        foes: st.foes.map((f) => ({ ...f, life: 0, remaining: 0 })),
        log: [...st.log, `${pc.name} wins the Magic Challenge (${total} vs L${foe.level})! ${foe.name} departs and leaves its Treasure!`],
      })
      return { ok: true, message: `${pc.name} won the Magic Challenge!` }
    }
    set({
      phase: 'foe-turn',
      log: [...st.log, `${pc.name} loses the Magic Challenge (${total} vs L${foe.level}) — ${foe.name} attacks!`],
    })
    return { ok: false, message: `Magic Challenge lost — ${foe.name} attacks!` }
  },

  acceptPeacefulPass: () => {
    const st = get()
    const foe = st.foes[0]
    set({
      active: false,
      phase: 'fled',
      log: [...st.log, `The party passes peacefully by ${foe?.name ?? 'the Foes'}.`],
    })
  },

  canPcMelee: (pc) => {
    if (pc.status !== 'alive') return { ok: false, reason: `${pc.name} is ${pc.status}.` }
    const st = get()
    if (!st.inCorridor) return { ok: true }
    // Book p. 95 & p. 96: In corridors, only Positions 1 & 2 can fight in melee
    // (or Positions 3 & 4 if ambushed from the rear by Wandering Monsters!).
    const aliveParty = useParty.getState().party.filter((p) => p.status === 'alive')
    if (aliveParty.length <= 2) return { ok: true }
    if (st.wandering) {
      if (pc.marchingOrder === 1 || pc.marchingOrder === 2) {
        return {
          ok: false,
          reason: 'Rear Ambush in Corridor: only Rearguard (#3 & #4) can fight in melee; #1 & #2 may only use Ranged or Spells (Book p. 96).',
        }
      }
      return { ok: true }
    }
    if (pc.marchingOrder === 3 || pc.marchingOrder === 4) {
      return {
        ok: false,
        reason: 'Corridor Rule: only Front Row (#1 & #2) can fight in melee; Rear Row (#3 & #4) may only use Ranged weapons or Spells (Book p. 95).',
      }
    }
    return { ok: true }
  },

  attack: (pc, foeUid, rng = defaultRng, spell = false, opts = {}) => {
    const st = get()
    const foe = st.foes.find((f) => f.uid === foeUid)
    if (!foe) return null
    const party = useParty.getState().party
    const aliveCount = party.filter((p) => p.status === 'alive').length || party.length
    const hasLight = partyHasLight(party)
    const d = derive(pc)
    const die = [6, 8, 10, 12, 20][d.tier - 1] ?? 6

    const foeCtx: FoeContext = {
      name: foe.name,
      tags: foe.tags,
      kind: foe.kind === 'vermin' || foe.kind === 'minion' ? 'minor' : 'major',
      count: foe.remaining ?? 1,
    }

    // Use full Attack modifier breakdown if PC has mainHand/traits, while keeping backward compatibility
    const mods = spell
      ? pc.level + (hasLight ? 0 : -2)
      : pc.mainHand !== undefined
        ? fullAttackModVs(pc, foeCtx, aliveCount, {
            inDarkness: !hasLight,
            subdual: Boolean(opts.subdual),
          }).total
        : attackModVs(pc.classId, pc.level, foeCtx, aliveCount)

    // Barbarian Rage: roll 3 times and pick the best result; double damage on hit (Book p. 24)
    let out = rollAttack({ dieSides: die, modifiers: mods, rng })
    if (opts.rage && useParty.getState().spendResource(pc.id, 'rage', 1)) {
      const r2 = rollAttack({ dieSides: die, modifiers: mods, rng })
      const r3 = rollAttack({ dieSides: die, modifiers: mods, rng })
      if (r2.attackTotal > out.attackTotal) out = r2
      if (r3.attackTotal > out.attackTotal) out = r3
    }

    const minor = foe.kind === 'vermin' || foe.kind === 'minion'
    let hits = resolveAttack(out.attackTotal, foe.level, minor ? 'minor' : 'major')
    if (opts.rage && hits > 0) hits *= 2
    if (opts.smite && hits > 0 && useParty.getState().spendResource(pc.id, 'smite', 1)) {
      hits = 3 // Book p. 55 Divine Smite: 3 damage to Major Foe or auto-kill 3 Minor Foes
    }
    if (pc.activeEffects.includes('hide-in-shadows') && hits > 0) {
      hits *= 3 // Book p. 22 Assassin Hide in Shadows: triple damage!
      useParty.getState().updateHero(pc.id, {
        activeEffects: pc.activeEffects.filter((e) => e !== 'hide-in-shadows'),
      })
    }

    let slain = 0
    let damage = 0
    let killed = false
    const foes = st.foes.map((f) => {
      if (f.uid !== foeUid) return f
      if (minor) {
        slain = Math.min(hits, f.remaining ?? 0)
        const updated = applyWoundedAndCountUpdate(f, slain, 0)
        killed = (updated.remaining ?? 0) <= 0
        return updated
      } else {
        damage = Math.min(hits, f.life ?? 0)
        const updated = applyWoundedAndCountUpdate(f, 0, damage)
        killed = (updated.life ?? 0) <= 0
        return updated
      }
    })

    // Swashbuckler Panache: gain +1 Panache per foe killed, up to L (Book p. 61)
    if (pc.classId === 'swashbuckler' && (slain > 0 || ( !minor && killed ))) {
      const gained = minor ? slain : 1
      const curPanache = pc.resources.panache ?? 0
      useParty.getState().updateHero(pc.id, {
        resources: { ...pc.resources, panache: Math.min(pc.level, curPanache + gained) },
      })
    }

    const note = minor
      ? slain > 0
        ? `slays ${slain} ${foe.name}${opts.rage ? ' (RAGE!)' : opts.smite ? ' (SMITE!)' : ''}`
        : 'misses'
      : damage > 0
        ? `deals ${damage} damage${opts.rage ? ' (RAGE!)' : opts.smite ? ' (SMITE!)' : ''}`
        : 'misses'

    const result: AttackResult = {
      pcName: pc.name,
      foeName: foe.name,
      total: out.attackTotal,
      rolls: out.rolls,
      exploded: out.exploded,
      slain,
      damage,
      killed,
      note,
    }

    const remainingFoes = foes.filter((f) =>
      f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) > 0 : (f.life ?? 0) > 0,
    )
    const acted = new Set(st.pcsActed)
    acted.add(pc.id)
    const allDead = remainingFoes.length === 0
    if (allDead) {
      useParty
        .getState()
        .noteDefeatedEncounter(foe.isFinalBoss ? 'final-boss' : minor ? 'minor' : 'major')
    }

    set({
      foes,
      phase: allDead ? 'victory' : 'pc-turn',
      pcsActed: acted,
      lastAttack: result,
      lootReady: allDead,
      log: [
        ...st.log,
        `${pc.name}${spell ? ' casts' : ''}: ${note} (${out.attackTotal} vs L${foe.level})`,
      ],
    })
    return result
  },

  castSpell: (pc, foeUid, rng = defaultRng, spellId) => {
    const st = get()
    const foe = st.foes.find((f) => f.uid === foeUid) ?? st.foes[0] ?? null
    const chosenSpell = spellId ?? pc.preparedSpells[0] ?? 'lightning'

    // Validate free hand & Elf armor/shield restrictions if using prepared spells
    if (pc.preparedSpells.length > 0) {
      const check = canCastSpellsNow(pc)
      if (!check.ok) return null
      const idx = pc.preparedSpells.indexOf(chosenSpell)
      if (idx < 0) return null
      const nextPrepared = [...pc.preparedSpells]
      const keepSlot =
        (pc.traits.includes('Spell Efficiency') || pc.traits.includes('Spellwoven')) &&
        !pc.usedTraitsAdventure.includes('spell-keep')
      if (!keepSlot) {
        nextPrepared.splice(idx, 1)
      }
      useParty.getState().updateHero(pc.id, {
        preparedSpells: nextPrepared,
        spentSpells: keepSlot ? pc.spentSpells : [...pc.spentSpells, chosenSpell],
        usedTraitsAdventure: keepSlot ? [...pc.usedTraitsAdventure, 'spell-keep'] : pc.usedTraitsAdventure,
        resources: {
          ...pc.resources,
          spellSlots: Math.max(0, (pc.resources.spellSlots ?? 1) - (keepSlot ? 0 : 1)),
        },
      })
    } else if (!useParty.getState().spendResource(pc.id, 'spellSlots', 1)) {
      return null
    }

    const spellTarget = foe
      ? {
          name: foe.name,
          kind: foe.kind === 'event' ? ('weird' as const) : foe.kind,
          level: foe.level,
          ...(foe.life !== undefined ? { life: foe.life } : {}),
          ...(foe.remaining !== undefined ? { remaining: foe.remaining } : {}),
          tags: foe.tags,
        }
      : null

    const outcome = resolveSpellCast(pc, chosenSpell, spellTarget, { rng })

    if (outcome.buffApplied) {
      useParty.getState().updateHero(pc.id, {
        activeEffects: [...pc.activeEffects, outcome.buffApplied],
      })
    }
    if (outcome.rationsCreated) {
      useParty.getState().updateHero(pc.id, {
        foodRations: Math.min(10, pc.foodRations + outcome.rationsCreated),
      })
    }

    let slain = 0
    let damage = 0
    let killed = false
    const foes = st.foes.map((f) => {
      if (!foe || f.uid !== foe.uid) return f
      const minor = f.kind === 'vermin' || f.kind === 'minion'
      let nextFoe = f
      if (outcome.foeLevelReduction > 0) {
        nextFoe = { ...nextFoe, level: Math.max(1, nextFoe.level - outcome.foeLevelReduction) }
      }
      if (minor && outcome.minorSlain > 0) {
        slain = Math.min(outcome.minorSlain, nextFoe.remaining ?? 0)
        nextFoe = applyWoundedAndCountUpdate(nextFoe, slain, 0)
        killed = (nextFoe.remaining ?? 0) <= 0
      } else if (!minor && (outcome.majorDamage > 0 || outcome.neutralizedMajor)) {
        damage = outcome.neutralizedMajor
          ? (nextFoe.life ?? 0)
          : Math.min(outcome.majorDamage, nextFoe.life ?? 0)
        nextFoe = applyWoundedAndCountUpdate(nextFoe, 0, damage)
        killed = (nextFoe.life ?? 0) <= 0
      }
      return nextFoe
    })

    const remainingFoes = foes.filter((f) =>
      f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) > 0 : (f.life ?? 0) > 0,
    )
    const acted = new Set(st.pcsActed)
    acted.add(pc.id)
    const allDead = remainingFoes.length === 0 && st.foes.length > 0
    if (allDead && foe) {
      const minor = foe.kind === 'vermin' || foe.kind === 'minion'
      useParty
        .getState()
        .noteDefeatedEncounter(foe.isFinalBoss ? 'final-boss' : minor ? 'minor' : 'major')
    }

    const result: AttackResult = {
      pcName: pc.name,
      foeName: foe?.name ?? 'Party',
      total: outcome.rollTotal ?? pc.level,
      rolls: [outcome.rollTotal ?? pc.level],
      exploded: false,
      slain,
      damage,
      killed,
      note: outcome.log,
    }

    set({
      foes,
      phase: allDead ? 'victory' : 'pc-turn',
      pcsActed: acted,
      lastAttack: result,
      lootReady: allDead,
      log: [...st.log, outcome.log],
    })
    return result
  },

  useCombatAbility: (pc, ability, foeUid) => {
    const st = get()
    const foe = st.foes.find((f) => f.uid === foeUid) ?? st.foes[0]
    const partySt = useParty.getState()
    const t = tier(pc.level)

    if (ability === 'distract') {
      if (!foe) return { ok: false, message: 'No target.' }
      if (!partySt.spendResource(pc.id, 'tricks', 1)) {
        return { ok: false, message: 'No Acrobat Trick points left.' }
      }
      const acted = new Set(st.pcsActed)
      acted.add(pc.id)
      set({
        pcsActed: acted,
        foes: st.foes.map((f) =>
          f.uid === foe.uid ? { ...f, level: Math.max(1, f.level - t) } : f,
        ),
        log: [...st.log, `${pc.name} performs Acrobat Trick: Distract — ${foe.name} is -${t} L!`],
      })
      return { ok: true, message: `${foe.name}'s Level reduced by ${t}!` }
    }

    if (ability === 'distracting-lights') {
      if (!foe) return { ok: false, message: 'No target.' }
      const r = rollExploding(defaultRng, 6)
      const total = r.total + pc.level
      const acted = new Set(st.pcsActed)
      acted.add(pc.id)
      if (total >= foe.level) {
        set({
          pcsActed: acted,
          foes: st.foes.map((f) =>
            f.uid === foe.uid ? { ...f, level: Math.max(1, f.level - t) } : f,
          ),
          log: [
            ...st.log,
            `${pc.name} conjures Distracting Lights (${total} vs L${foe.level}) — ${foe.name} is -${t} L!`,
          ],
        })
        return { ok: true, message: `Distracting Lights lowered ${foe.name}'s Level by ${t}!` }
      }
      set({
        pcsActed: acted,
        log: [...st.log, `${pc.name}'s Distracting Lights (${total} vs L${foe.level}) failed.`],
      })
      return { ok: false, message: 'Distracting Lights failed.' }
    }

    if (ability === 'spores') {
      if (!foe) return { ok: false, message: 'No target.' }
      if (!partySt.spendResource(pc.id, 'spores', 1)) {
        return { ok: false, message: 'No Spore charges left.' }
      }
      const acted = new Set(st.pcsActed)
      acted.add(pc.id)
      set({
        pcsActed: acted,
        foes: st.foes.map((f) =>
          f.uid === foe.uid ? { ...f, level: Math.max(1, f.level - 1) } : f,
        ),
        log: [...st.log, `${pc.name} sprays a cloud of Spores — ${foe.name} is -1 L!`],
      })
      return { ok: true, message: `Spores reduced ${foe.name}'s Level by 1!` }
    }

    if (ability === 'gadget-weapon') {
      if (!partySt.spendResource(pc.id, 'gadget', 1)) {
        return { ok: false, message: 'No Gadget points left.' }
      }
      partySt.updateHero(pc.id, { activeEffects: [...pc.activeEffects, 'gadget-weapon'] })
      set({ log: [...st.log, `${pc.name} activates a Gadget-Enhanced Weapon (+${pc.level} melee Attack this encounter)!`] })
      return { ok: true, message: 'Gadget-Enhanced Weapon activated (+L Attack)!' }
    }

    if (ability === 'grenade') {
      if (!foe) return { ok: false, message: 'No target.' }
      if (!partySt.spendResource(pc.id, 'gadget', 3)) {
        return { ok: false, message: 'Need 3 Gadget points to throw a 2-damage Grenade.' }
      }
      const minor = foe.kind === 'vermin' || foe.kind === 'minion'
      const foes = st.foes.map((f) =>
        f.uid === foe.uid ? applyWoundedAndCountUpdate(f, minor ? 2 : 0, minor ? 0 : 2) : f,
      )
      const allDead = foes.every((f) =>
        f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) <= 0 : (f.life ?? 0) <= 0,
      )
      const acted = new Set(st.pcsActed)
      acted.add(pc.id)
      set({
        foes,
        pcsActed: acted,
        phase: allDead ? 'victory' : 'pc-turn',
        lootReady: allDead,
        log: [...st.log, `${pc.name} hurls a Clockwork Grenade — inflicts 2 automatic damage/kills on ${foe.name}!`],
      })
      return { ok: true, message: `Clockwork Grenade hit ${foe.name} for 2!` }
    }

    if (ability === 'smokescreen') {
      if (!partySt.spendResource(pc.id, 'gadget', 1)) {
        return { ok: false, message: 'No Gadget points left.' }
      }
      set({
        active: false,
        phase: 'fled',
        log: [...st.log, `${pc.name} drops a Smokescreen Bomb — the party escapes without taking any attacks!`],
      })
      return { ok: true, message: 'Escaped safely via Smokescreen Bomb!' }
    }

    if (ability === 'holy-water') {
      if (!foe) return { ok: false, message: 'No target.' }
      const idx = pc.inventory.indexOf('holy-water')
      if (idx < 0) return { ok: false, message: `${pc.name} has no Holy Water vial.` }
      const inv = [...pc.inventory]
      inv.splice(idx, 1)
      partySt.updateHero(pc.id, { inventory: inv })

      const undeadOrDemon = isUndead({ name: foe.name, tags: foe.tags, kind: 'major', count: 1 })
      const dmg = undeadOrDemon ? (/skeletal rat|cave skeleton|wraith|phantom/i.test(foe.name) ? 2 : 1) : 0
      const minor = foe.kind === 'vermin' || foe.kind === 'minion'
      const foes = st.foes.map((f) =>
        f.uid === foe.uid ? applyWoundedAndCountUpdate(f, minor ? dmg : 0, minor ? 0 : dmg) : f,
      )
      const allDead = foes.every((f) =>
        f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) <= 0 : (f.life ?? 0) <= 0,
      )
      const acted = new Set(st.pcsActed)
      acted.add(pc.id)
      set({
        foes,
        pcsActed: acted,
        phase: allDead ? 'victory' : 'pc-turn',
        lootReady: allDead,
        log: [
          ...st.log,
          undeadOrDemon
            ? `${pc.name} throws Holy Water — sears ${foe.name} for ${dmg} automatic damage!`
            : `${pc.name} throws Holy Water, but ${foe.name} is not Undead or Demon!`,
        ],
      })
      return { ok: true, message: `Holy Water thrown at ${foe.name}!` }
    }

    if (ability === 'panache-atk' || ability === 'panache-def') {
      if (!partySt.spendResource(pc.id, 'panache', 1)) {
        return { ok: false, message: 'No Panache points available.' }
      }
      partySt.updateHero(pc.id, { activeEffects: [...pc.activeEffects, ability] })
      return { ok: true, message: `${pc.name} spends 1 Panache (+1)!` }
    }

    return { ok: false, message: 'Unknown ability.' }
  },

  spendHalflingLuck: (halflingId, mode, foeUid) => {
    const st = get()
    const partySt = useParty.getState()
    const hlf = partySt.party.find((p) => p.id === halflingId)
    if (!hlf) return { ok: false, message: 'Halfling not found.' }
    const foe = st.foes.find((f) => f.uid === foeUid) ?? st.foes[0]
    if (foe && /minotaur/i.test(foe.name)) {
      return { ok: false, message: 'Halflings cannot use Luck in Minotaur encounters (Book p. 169)!' }
    }
    if (!partySt.spendResource(halflingId, 'luck', 1)) {
      return { ok: false, message: 'No Luck points remaining.' }
    }
    if (mode === 'flee') {
      set({
        active: false,
        phase: 'fled',
        log: [...st.log, `${hlf.name} spends 1 Luck point — the party escapes from melee without suffering any attacks!`],
      })
      return { ok: true, message: `${hlf.name}'s Luck lets you escape safely!` }
    }
    if (foe) {
      get().attack(hlf, foe.uid)
      return { ok: true, message: `${hlf.name} spends 1 Luck to reroll Attack!` }
    }
    return { ok: false, message: 'No target to reroll against.' }
  },

  withdrawOrFlee: (mode, hclValue) => {
    // Each surviving foe strikes once; Withdrawing grants +1 Defense & allows shields (Book pp. 97–98)
    get().foeTurn(hclValue, defaultRng)
    set({
      active: false,
      phase: 'fled',
      log: [
        ...get().log,
        mode === 'withdraw'
          ? 'The party Withdraws (+1 Defense) and slams the door shut behind them!'
          : 'The party Flees from the encounter!',
      ],
    })
    return {
      ok: true,
      message: mode === 'withdraw' ? 'Withdrew through the door!' : 'Fled the combat!',
    }
  },

  foeTurn: (hclValue, rng = defaultRng) => {
    const st = get()
    const party = useParty.getState().party.filter((p) => p.status === 'alive')
    const tierValue = tier(hclValue)
    const lines: string[] = []
    const alive = st.foes.filter((f) =>
      f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) > 0 : (f.life ?? 0) > 0,
    )
    if (alive.length === 0 || party.length === 0) {
      set({ lastFoeTurn: lines, phase: 'pc-turn' })
      return lines
    }

    const hasLight = partyHasLight(party)

    // Book p. 97: In a corridor, maximum TWO Foes can attack the PCs in positions 1 & 2
    // (or positions 3 & 4 if ambushed from the rear by Wandering Monsters!).
    const validTargets = st.inCorridor
      ? st.wandering && party.length > 2
        ? party.filter((p) => p.marchingOrder >= 3)
        : party.filter((p) => p.marchingOrder <= 2)
      : party
    const targetPool = validTargets.length > 0 ? validTargets : party

    let pi = 0
    for (const foe of alive) {
      const dmg = parseAttackDamage(foe.damage, tierValue)
      const minor = foe.kind === 'vermin' || foe.kind === 'minion'
      const rawAttacks = minor ? (foe.remaining ?? 1) : Math.max(1, foe.attacks)
      const numAttacks = st.inCorridor && minor ? Math.min(2, rawAttacks) : rawAttacks

      for (let a = 0; a < numAttacks; a++) {
        const target = targetPool[pi % targetPool.length]!
        pi++
        const d = derive(target)
        const die = [6, 8, 10, 12, 20][d.tier - 1] ?? 6
        const foeCtx: FoeContext = {
          name: foe.name,
          tags: foe.tags,
          kind: minor ? 'minor' : 'major',
          count: foe.remaining ?? 1,
        }
        const defMod =
          target.mainHand !== undefined
            ? fullDefenseModVs(target, foeCtx, {
                inDarkness: !hasLight,
                surprisedByWandering: st.wandering && st.round === 1,
                firstAttackOfCombat: st.round === 1 && a === 0,
                hasLightSource: hasLight,
              }).total
            : d.defense

        const def = rollDefense({ foeL: foe.level, dieSides: die, modifiers: defMod, rng })
        if (def.success) {
          lines.push(`${foe.name} → ${target.name}: defended (${def.defenseTotal} > L${foe.level})`)
        } else {
          // Check Dwarf Tough as Stone / Barbarian Tough Skinned / Acrobat Graceful Dodge / Paladin Armor Mastery
          let actualDmg = dmg
          if (target.traits.includes('Tough as Stone') && st.round === 1 && a === 0) {
            actualDmg = Math.max(0, actualDmg - 1)
          }
          const d2 = useParty.getState()
          const curLife = d2.party.find((p) => p.id === target.id)?.life ?? 0
          const life = Math.max(0, curLife - actualDmg)
          useParty.getState().setLife(target.id, life)
          lines.push(
            `${foe.name} → ${target.name}: ${actualDmg} damage${def.rolledOne ? ' (rolled 1)' : ''} (${life} Life left)`,
          )
        }
      }
    }

    // Clear Turn-1 Ambush bonus if active
    const nextFoes = st.ambushBonus
      ? st.foes.map((f) => ({ ...f, level: f.baseLevel }))
      : st.foes

    set((s) => ({
      foes: nextFoes,
      ambushBonus: false,
      phase: 'pc-turn',
      round: s.round + 1,
      pcsActed: new Set(),
      lastFoeTurn: lines,
      log: [...s.log, ...lines],
    }))
    return lines
  },

  tryMorale: (foeUid, rng = defaultRng) => {
    const foe = get().foes.find((f) => f.uid === foeUid)
    if (!foe) return 'never'
    if (neverTestsMorale(foe.morale) || isAggressive(foe.reactionLabel) && /death/i.test(foe.reactionLabel)) {
      return 'never'
    }
    const roll = rollDie(rng, 6)
    const mod = parseMoraleMod(foe.morale)
    const res = moraleCheck(roll, mod)
    if (res === 'flee') {
      const minor = foe.kind === 'vermin' || foe.kind === 'minion'
      useParty
        .getState()
        .noteDefeatedEncounter(foe.isFinalBoss ? 'final-boss' : minor ? 'minor' : 'major')
      set((s) => ({
        phase: 'victory',
        lootReady: true,
        foes: s.foes.map((f) => (f.uid === foeUid ? { ...f, remaining: 0, life: 0, moraleTested: true } : f)),
        log: [
          ...s.log,
          `Morale (${foe.name}): d6=${roll}${mod !== 0 ? (mod > 0 ? `+${mod}` : mod) : ''} → FLEE! They drop their Treasure and run!`,
        ],
      }))
    } else {
      set((s) => ({
        foes: s.foes.map((f) => (f.uid === foeUid ? { ...f, moraleTested: true } : f)),
        log: [
          ...s.log,
          `Morale (${foe.name}): d6=${roll}${mod !== 0 ? (mod > 0 ? `+${mod}` : mod) : ''} → FIGHT ON!`,
        ],
      }))
    }
    return res
  },

  markLoot: () => set({ lootReady: false, active: false }),
  clear: () =>
    set({
      active: false,
      phase: 'pc-turn',
      foes: [],
      round: 0,
      log: [],
      pcsActed: new Set(),
      lastAttack: null,
      lastFoeTurn: null,
      lootReady: false,
      goldSensePreview: null,
    }),
}))
