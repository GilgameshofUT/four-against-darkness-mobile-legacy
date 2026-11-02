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
  remaining?: number
  initial?: number
  life?: number
  maxLife?: number
  woundedPenaltyApplied?: boolean
  isFinalBoss?: boolean
  attacks: number
  skipNextAttacks?: number
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

export interface PendingDefense {
  id: string
  foeUid: string
  foeName: string
  foeLevel: number
  damage: number
  targetPcId: string
  firstOfCombat: boolean
  resolved: boolean
  rolled?: number
  rolls?: number[]
  total?: number
  mod?: number
  exploded?: boolean
  rolledOne?: boolean
  success?: boolean
  damageTaken?: number
  damageReduced?: boolean
  counterUsed?: boolean
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
  /** Set once a PC has used their primary action this round. */
  pcsActed: Set<string>
  /** Set once a dual-wielder / monk has used their bonus off-hand / flurry attack this round. */
  pcsBonusActed: Set<string>
  /** Interactive queue of incoming enemy attacks during Foes' turn. */
  pendingDefenses: PendingDefense[]
  lastAttack: AttackResult | null
  lastFoeTurn: string[] | null
  lootReady: boolean

  begin: (foeKind: FoeKind, env: Environment, hclValue: number, opts?: BeginCombatOptions) => void
  chooseAttackImmediately: () => void
  chooseWaitForReaction: (hclValue: number) => void
  chooseAttemptStealth: (mode: 'sneak-past' | 'ambush') => { ok: boolean; message: string }
  useDwarfGoldSense: (dwarfId: string) => { ok: boolean; message: string }

  payBribe: (amountGp?: number, foodCount?: number) => { ok: boolean; message: string }
  payBloodOffering: (pcId: string) => { ok: boolean; message: string }
  attemptPuzzleReaction: (pcId: string) => { ok: boolean; message: string }
  attemptMagicChallenge: (pcId: string) => { ok: boolean; message: string }
  acceptPeacefulPass: () => void

  canPcMelee: (pc: PC) => { ok: boolean; reason?: string }
  attack: (
    pc: PC,
    foeUid: string,
    rng?: Rng,
    spell?: boolean,
    opts?: { rage?: boolean; smite?: boolean; subdual?: boolean; isBonusAttack?: boolean; bonusMod?: number },
  ) => AttackResult | null
  castSpell: (pc: PC, foeUid: string, rng?: Rng, spellId?: string, targetPcId?: string) => AttackResult | null
  useCombatAbility: (
    pc: PC,
    ability:
      | 'distract'
      | 'distracting-feint'
      | 'distracting-lights'
      | 'illusionary-knife'
      | 'spores'
      | 'gadget-weapon'
      | 'grenade'
      | 'clockwork-armor'
      | 'smokescreen'
      | 'holy-water'
      | 'panache-atk'
      | 'panache-def'
      | 'taunt'
      | 'hide-in-shadows'
      | 'bladesong'
      | 'elidra-melody'
      | 'chant-of-valor'
      | 'rootbind'
      | 'hair-bind'
      | 'hidden-blade'
      | 'parry-stance'
      | 'quick-feint'
      | 'team-tactics'
      | 'berserk-fighting',
    foeUid?: string,
    targetPcId?: string,
  ) => { ok: boolean; message: string }
  spendHalflingLuck: (halflingId: string, mode: 'reroll-attack' | 'flee', foeUid?: string) => { ok: boolean; message: string }
  withdrawOrFlee: (mode: 'withdraw' | 'flee', hclValue: number) => { ok: boolean; message: string }

  /** Interactive Defense Queue methods (Book pp. 96–97). */
  beginFoeTurnQueue: (hclValue: number) => void
  reassignDefenseTarget: (defId: string, newTargetPcId: string) => void
  rollSingleDefense: (defId: string, rng?: Rng) => void
  rerollFailedDefense: (defId: string, source: 'luck' | 'stubborn-resolve' | 'lucky-hat') => { ok: boolean; message: string }
  reduceDefenseDamage: (defId: string, traitName: string) => { ok: boolean; message: string }
  triggerCounterAttack: (defId: string, pc: PC) => { ok: boolean; message: string }
  finishFoeTurnQueue: () => void

  /** Synchronous full-turn helper (kept for automated tests & "Auto-Roll All"). */
  foeTurn: (hclValue: number, rng?: Rng) => string[]
  tryMorale: (foeUid: string, rng?: Rng) => 'flee' | 'fight' | 'never'
  markLoot: () => void
  clear: () => void
}

let u = 0
const uid = () => `foe-${u++}`
let dSeq = 0
const defUid = () => `def-${dSeq++}`

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

function pickFoe(tableId: string, rng: Rng): Foe | null {
  const table = foeTables.find((t) => t.id === tableId)
  if (!table) return null
  const entry = table.entries[rollDie(rng, 6) - 1]
  if (!entry || entry.foes.length === 0) return null
  if (entry.foes.length === 1) return entry.foes[0]!
  return entry.foes[rollDie(rng, entry.foes.length) - 1] ?? entry.foes[0]!
}

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
  pcsBonusActed: new Set<string>(),
  pendingDefenses: [],
  lastAttack: null,
  lastFoeTurn: null,
  lootReady: false,

  begin: (foeKind, env, hclValue, opts = {}) => {
    const rng = defaultRng
    const tableId = foeKind === 'minion' ? `${env}-minions` : `${env}-${foeKind}`
    let f = pickFoe(tableId, rng)
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

    // Clear per-combat used traits on party
    const partySt = useParty.getState()
    for (const p of partySt.party) {
      if (p.usedTraitsCombat.length > 0 || p.activeEffects.length > 0) {
        partySt.updateHero(p.id, {
          usedTraitsCombat: [],
          activeEffects: p.activeEffects.filter(
            (e) => e === 'blessed-temple' || e === 'cursed-altar' || e === 'bear-trap' || e === 'envenomed-weapon',
          ),
        })
      }
    }

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
      pcsBonusActed: new Set(),
      pendingDefenses: [],
      lastAttack: null,
      lastFoeTurn: null,
      lootReady: false,
    })

    if (surprised && !isFinalBoss) {
      get().beginFoeTurnQueue(hclValue)
    }
  },

  chooseAttackImmediately: () => {
    set((s) => ({
      phase: 'pc-turn',
      log: [...s.log, 'The party charges in and attacks first!'],
    }))
  },

  chooseWaitForReaction: (hclValue) => {
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
      get().beginFoeTurnQueue(hclValue)
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

    set({
      phase: 'foe-turn',
      log: [...st.log, `Reaction: ${foe.reactionLabel} — ${foe.name} attacks first!`],
    })
    get().beginFoeTurnQueue(hclValue)
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
      get().beginFoeTurnQueue(Math.max(1, ...party.map((p) => p.level)))
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
    get().beginFoeTurnQueue(pc.level)
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
    get().beginFoeTurnQueue(pc.level)
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

    // Ranger Sworn Enemy die shift (Book p. 58: uses higher Tier die vs Sworn Enemy!)
    let tierShift = 0
    if (
      pc.classId === 'ranger' &&
      pc.swornEnemy &&
      new RegExp(pc.swornEnemy.replace(/s$/i, ''), 'i').test(foe.name)
    ) {
      tierShift = 1
    }
    const die = [6, 8, 10, 12, 20][Math.min(4, d.tier - 1 + tierShift)] ?? 6

    const foeCtx: FoeContext = {
      name: foe.name,
      tags: foe.tags,
      kind: foe.kind === 'vermin' || foe.kind === 'minion' ? 'minor' : 'major',
      count: foe.remaining ?? 1,
    }

    const baseMods = spell
      ? pc.level + (hasLight ? 0 : -2)
      : pc.mainHand !== undefined
        ? fullAttackModVs(pc, foeCtx, aliveCount, {
            inDarkness: !hasLight,
            subdual: Boolean(opts.subdual),
          }).total
        : attackModVs(pc.classId, pc.level, foeCtx, aliveCount)
    const mods = baseMods + (opts.bonusMod ?? 0)

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
      hits = 3
    }
    if (pc.activeEffects.includes('berserk-fighting') && hits > 0) {
      hits += 1
    }
    if (pc.activeEffects.includes('hide-in-shadows') && hits > 0) {
      hits *= 3
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

    if (pc.classId === 'swashbuckler' && (slain > 0 || (!minor && killed))) {
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
    const bonusActed = new Set(st.pcsBonusActed)
    if (opts.isBonusAttack) bonusActed.add(pc.id)
    else acted.add(pc.id)

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
      pcsBonusActed: bonusActed,
      lastAttack: result,
      lootReady: allDead,
      log: [
        ...st.log,
        `${pc.name}${opts.isBonusAttack ? ' (Off-Hand/Flurry)' : ''}${spell ? ' casts' : ''}: ${note} (rolled [${out.rolls.join('+')}] → ${out.attackTotal} vs L${foe.level})`,
      ],
    })
    return result
  },

  castSpell: (pc, foeUid, rng = defaultRng, spellId, targetPcId) => {
    const st = get()
    const foe = st.foes.find((f) => f.uid === foeUid) ?? st.foes[0] ?? null
    const chosenSpell = spellId ?? pc.preparedSpells[0] ?? 'lightning'

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
      const recipientId = targetPcId ?? pc.id
      const recipient = useParty.getState().party.find((p) => p.id === recipientId) ?? pc
      useParty.getState().updateHero(recipient.id, {
        activeEffects: [...recipient.activeEffects, outcome.buffApplied],
        ...(outcome.buffApplied === 'blessing-cleanse'
          ? {
              status: recipient.status === 'petrified' || recipient.status === 'paralyzed' ? 'alive' : recipient.status,
              madness: Math.max(0, recipient.madness - 1),
            }
          : {}),
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

  useCombatAbility: (pc, ability, foeUid, targetPcId) => {
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

    if (ability === 'distracting-feint' || ability === 'elidra-melody' || ability === 'rootbind') {
      if (!foe) return { ok: false, message: 'No target.' }
      const acted = new Set(st.pcsActed)
      acted.add(pc.id)
      partySt.updateHero(pc.id, {
        usedTraitsCombat: [...pc.usedTraitsCombat, ability],
        usedTraitsAdventure: [...pc.usedTraitsAdventure, ability],
      })
      set({
        pcsActed: acted,
        foes: st.foes.map((f) =>
          f.uid === foe.uid ? { ...f, skipNextAttacks: (f.skipNextAttacks ?? 0) + 1 } : f,
        ),
        log: [
          ...st.log,
          `${pc.name} uses ${
            ability === 'rootbind' ? 'Rootbind' : ability === 'elidra-melody' ? "Elidra's Melody" : 'Distracting Feint'
          } — ${foe.name} loses an attack on its next turn!`,
        ],
      })
      return { ok: true, message: `${foe.name} will skip its next attack!` }
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

    if (ability === 'illusionary-knife') {
      if (!foe) return { ok: false, message: 'No target.' }
      if (!partySt.spendResource(pc.id, 'spellSlots', 1)) {
        return { ok: false, message: 'Need 1 Spell Slot for Illusionary Knife Throw.' }
      }
      get().attack(pc, foe.uid, defaultRng, false, { bonusMod: pc.level + t + 1 })
      return { ok: true, message: `${pc.name} hurls an Illusionary Knife (+L +Tier)!` }
    }

    if (ability === 'spores' || ability === 'taunt' || ability === 'quick-feint' || ability === 'hair-bind') {
      if (!foe) return { ok: false, message: 'No target.' }
      if (ability === 'spores' && !partySt.spendResource(pc.id, 'spores', 1)) {
        return { ok: false, message: 'No Spore charges left.' }
      }
      const drop = ability === 'spores' ? 1 : ability === 'taunt' ? t : 2
      const acted = new Set(st.pcsActed)
      acted.add(pc.id)
      partySt.updateHero(pc.id, {
        usedTraitsCombat: [...pc.usedTraitsCombat, ability],
        usedTraitsAdventure: [...pc.usedTraitsAdventure, ability],
      })
      set({
        pcsActed: acted,
        foes: st.foes.map((f) =>
          f.uid === foe.uid ? { ...f, level: Math.max(1, f.level - drop) } : f,
        ),
        log: [...st.log, `${pc.name} uses ${ability} — ${foe.name}'s Level drops by ${drop} (to L${Math.max(1, foe.level - drop)})!`],
      })
      return { ok: true, message: `${foe.name} is -${drop} L!` }
    }

    if (ability === 'hide-in-shadows') {
      if (!foe) return { ok: false, message: 'No target.' }
      const r = rollExploding(defaultRng, 6)
      const total = r.total + pc.level
      const acted = new Set(st.pcsActed)
      acted.add(pc.id)
      if (r.rolls[0] !== 1 && total >= foe.level) {
        partySt.updateHero(pc.id, { activeEffects: [...pc.activeEffects, 'hide-in-shadows'] })
        set({
          pcsActed: acted,
          log: [...st.log, `${pc.name} Hides in Shadows (${total} vs L${foe.level}) — next successful hit deals TRIPLE (3×) damage!`],
        })
        return { ok: true, message: `${pc.name} is hidden in shadows (3× damage on next hit)!` }
      }
      set({
        pcsActed: acted,
        log: [...st.log, `${pc.name} fails Hide in Shadows (${total} vs L${foe.level})!`],
      })
      return { ok: false, message: `Hide in Shadows failed (${total} vs L${foe.level}).` }
    }

    if (ability === 'hidden-blade') {
      if (!foe) return { ok: false, message: 'No target.' }
      partySt.updateHero(pc.id, { usedTraitsCombat: [...pc.usedTraitsCombat, 'Hidden Blade'] })
      get().attack(pc, foe.uid, defaultRng, false, { isBonusAttack: true, bonusMod: t })
      return { ok: true, message: `${pc.name} springs Hidden Blade (free surprise attack at +${t})!` }
    }

    if (ability === 'parry-stance') {
      partySt.updateHero(pc.id, { activeEffects: [...pc.activeEffects, 'protection'] })
      const bonusActed = new Set(st.pcsBonusActed)
      bonusActed.add(pc.id)
      set({
        pcsBonusActed: bonusActed,
        log: [...st.log, `${pc.name} adopts Parry Stance (+1 Defense this encounter)!`],
      })
      return { ok: true, message: `${pc.name} parries (+1 Defense)!` }
    }

    if (ability === 'bladesong' || ability === 'berserk-fighting') {
      partySt.updateHero(pc.id, {
        activeEffects: [...pc.activeEffects, ability],
        usedTraitsAdventure: [...pc.usedTraitsAdventure, ability],
      })
      set({
        log: [
          ...st.log,
          ability === 'bladesong'
            ? `${pc.name} invokes Bladesong (+1 Attack for the entire encounter)!`
            : `${pc.name} enters Berserk Fighting (+1 damage on every hit this combat)!`,
        ],
      })
      return { ok: true, message: `${ability === 'bladesong' ? 'Bladesong' : 'Berserk Fighting'} active!` }
    }

    if (ability === 'chant-of-valor') {
      partySt.updateHero(pc.id, { usedTraitsAdventure: [...pc.usedTraitsAdventure, 'Chant of Valor'] })
      for (const ally of partySt.party) {
        if (ally.status === 'alive') {
          partySt.updateHero(ally.id, { activeEffects: [...ally.activeEffects, 'chant-of-valor'] })
        }
      }
      set({
        log: [...st.log, `${pc.name} raises the Chant of Valor (Free Action: +1 Attack to all allies)!`],
      })
      return { ok: true, message: 'Chant of Valor grants +1 Attack to the whole party!' }
    }

    if (ability === 'team-tactics') {
      const target = partySt.party.find((p) => p.id === targetPcId) ?? partySt.party[0]
      if (!target) return { ok: false, message: 'No target.' }
      partySt.updateHero(pc.id, { usedTraitsCombat: [...pc.usedTraitsCombat, 'Intuitive Team Tactics'] })
      partySt.updateHero(target.id, { activeEffects: [...target.activeEffects, 'chant-of-valor', 'protection'] })
      set({
        log: [...st.log, `${pc.name} uses Intuitive Team Tactics — ${target.name} gains +1 Attack & Defense!`],
      })
      return { ok: true, message: `${target.name} gains +1 from Team Tactics!` }
    }

    if (ability === 'gadget-weapon') {
      if (!partySt.spendResource(pc.id, 'gadget', 1)) {
        return { ok: false, message: 'No Gadget points left.' }
      }
      partySt.updateHero(pc.id, { activeEffects: [...pc.activeEffects, 'gadget-weapon'] })
      set({ log: [...st.log, `${pc.name} activates a Gadget-Enhanced Weapon (+${pc.level} melee Attack this encounter)!`] })
      return { ok: true, message: 'Gadget-Enhanced Weapon activated (+L Attack)!' }
    }

    if (ability === 'clockwork-armor') {
      if (!partySt.spendResource(pc.id, 'gadget', 1)) {
        return { ok: false, message: 'No Gadget points left.' }
      }
      partySt.updateHero(pc.id, {
        armor: 'clockwork-armor',
        activeEffects: [...pc.activeEffects, 'clockwork-active'],
      })
      set({ log: [...st.log, `${pc.name} overclocks Clockwork Armor (+3 Defense this encounter)!`] })
      return { ok: true, message: 'Clockwork Armor activated (+3 Defense)!' }
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

  /* ============================================================
     Interactive Player-Rolled Defense Queue (Book pp. 96–97)
     ============================================================ */
  beginFoeTurnQueue: (hclValue) => {
    const st = get()
    const party = useParty.getState().party.filter((p) => p.status === 'alive')
    const tierValue = tier(hclValue)
    const alive = st.foes.filter((f) =>
      f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) > 0 : (f.life ?? 0) > 0,
    )
    if (alive.length === 0 || party.length === 0) {
      set({ phase: 'pc-turn', pendingDefenses: [] })
      return
    }

    // Book p. 97: In a corridor, maximum TWO Foes attack Positions 1 & 2 (or 3 & 4 on rear ambush).
    const validTargets = st.inCorridor
      ? st.wandering && party.length > 2
        ? party.filter((p) => p.marchingOrder >= 3)
        : party.filter((p) => p.marchingOrder <= 2)
      : party
    const targetPool = validTargets.length > 0 ? validTargets : party

    // Check Paladin Challenge trait (Book p. 56: forces Foe to target Paladin)
    const challenger = targetPool.find((p) => p.classId === 'paladin' && p.traits.includes('Challenge'))

    const queue: PendingDefense[] = []
    let pi = 0
    for (const foe of alive) {
      const dmg = parseAttackDamage(foe.damage, tierValue)
      const minor = foe.kind === 'vermin' || foe.kind === 'minion'
      const rawAttacks = minor ? (foe.remaining ?? 1) : Math.max(1, foe.attacks)
      const skipped = foe.skipNextAttacks ?? 0
      const effectiveAttacks = Math.max(
        0,
        (st.inCorridor && minor ? Math.min(2, rawAttacks) : rawAttacks) - skipped,
      )

      for (let a = 0; a < effectiveAttacks; a++) {
        const target = challenger ?? targetPool[pi % targetPool.length]!
        pi++
        queue.push({
          id: defUid(),
          foeUid: foe.uid,
          foeName: foe.name,
          foeLevel: foe.level,
          damage: dmg,
          targetPcId: target.id,
          firstOfCombat: st.round === 1 && a === 0,
          resolved: false,
        })
      }
    }

    // Clear skipNextAttacks on foes
    const updatedFoes = st.foes.map((f) => ({ ...f, skipNextAttacks: 0 }))

    if (queue.length === 0) {
      set({
        foes: updatedFoes,
        phase: 'pc-turn',
        round: st.round + 1,
        pcsActed: new Set(),
        pcsBonusActed: new Set(),
        pendingDefenses: [],
        log: [...st.log, 'The entangled/distracted Foes are unable to attack this turn!'],
      })
      return
    }

    set({
      foes: updatedFoes,
      phase: 'foe-turn',
      pendingDefenses: queue,
    })
  },

  reassignDefenseTarget: (defId, newTargetPcId) => {
    set((s) => ({
      pendingDefenses: s.pendingDefenses.map((d) =>
        d.id === defId && !d.resolved ? { ...d, targetPcId: newTargetPcId } : d,
      ),
    }))
  },

  rollSingleDefense: (defId, rng = defaultRng) => {
    const st = get()
    const item = st.pendingDefenses.find((d) => d.id === defId)
    if (!item || item.resolved) return
    const party = useParty.getState().party
    const target = party.find((p) => p.id === item.targetPcId)
    if (!target) return

    const hasLight = partyHasLight(party)
    const d = derive(target)
    const foe = st.foes.find((f) => f.uid === item.foeUid)
    const minor = foe ? foe.kind === 'vermin' || foe.kind === 'minion' : true

    // Ranger Sworn Enemy die shift on Defense
    let tierShift = 0
    if (
      target.classId === 'ranger' &&
      target.swornEnemy &&
      new RegExp(target.swornEnemy.replace(/s$/i, ''), 'i').test(item.foeName)
    ) {
      tierShift = 1
    }
    const die = [6, 8, 10, 12, 20][Math.min(4, d.tier - 1 + tierShift)] ?? 6

    const foeCtx: FoeContext = {
      name: item.foeName,
      tags: foe?.tags ?? [],
      kind: minor ? 'minor' : 'major',
      count: foe?.remaining ?? 1,
    }
    const defMod =
      target.mainHand !== undefined
        ? fullDefenseModVs(target, foeCtx, {
            inDarkness: !hasLight,
            surprisedByWandering: st.wandering && st.round === 1,
            firstAttackOfCombat: item.firstOfCombat,
            hasLightSource: hasLight,
          }).total
        : d.defense

    const def = rollDefense({ foeL: item.foeLevel, dieSides: die, modifiers: defMod, rng })

    let actualDmg = def.success ? 0 : item.damage
    let autoReduced = false
    if (!def.success && target.traits.includes('Tough as Stone') && item.firstOfCombat) {
      actualDmg = Math.max(0, actualDmg - 1)
      autoReduced = true
    }

    if (!def.success && actualDmg > 0) {
      const curLife = useParty.getState().party.find((p) => p.id === target.id)?.life ?? 0
      useParty.getState().setLife(target.id, Math.max(0, curLife - actualDmg))
    }

    const line = def.success
      ? `${item.foeName} → ${target.name}: DEFENDED! (rolled [${def.rolls.join('+')}]${defMod >= 0 ? `+${defMod}` : defMod} = ${def.defenseTotal} > L${item.foeLevel})`
      : `${item.foeName} → ${target.name}: HIT for ${actualDmg} damage! (rolled [${def.rolls.join('+')}]${defMod >= 0 ? `+${defMod}` : defMod} = ${def.defenseTotal} vs L${item.foeLevel}${def.rolledOne ? ', Nat 1!' : ''}${autoReduced ? ', -1 Tough as Stone' : ''})`

    set((s) => ({
      pendingDefenses: s.pendingDefenses.map((x) =>
        x.id === defId
          ? {
              ...x,
              resolved: true,
              rolled: def.rolls[0] ?? 1,
              rolls: def.rolls,
              total: def.defenseTotal,
              mod: defMod,
              exploded: def.exploded,
              rolledOne: def.rolledOne,
              success: def.success,
              damageTaken: actualDmg,
              damageReduced: autoReduced,
            }
          : x,
      ),
      log: [...s.log, line],
    }))
  },

  rerollFailedDefense: (defId, source) => {
    const st = get()
    const item = st.pendingDefenses.find((d) => d.id === defId)
    if (!item || !item.resolved || item.success) {
      return { ok: false, message: 'Can only reroll a failed Defense roll.' }
    }
    const partySt = useParty.getState()
    const target = partySt.party.find((p) => p.id === item.targetPcId)
    if (!target) return { ok: false, message: 'Hero not found.' }

    if (source === 'luck') {
      const hlf = partySt.party.find((p) => p.classId === 'halfling' && (p.resources.luck ?? 0) > 0)
      if (!hlf || !partySt.spendResource(hlf.id, 'luck', 1)) {
        return { ok: false, message: 'No Halfling Luck available.' }
      }
    } else if (source === 'stubborn-resolve') {
      if (target.usedTraitsAdventure.includes('Stubborn Resolve')) {
        return { ok: false, message: 'Stubborn Resolve already used this adventure.' }
      }
      partySt.updateHero(target.id, {
        usedTraitsAdventure: [...target.usedTraitsAdventure, 'Stubborn Resolve'],
      })
    } else if (source === 'lucky-hat') {
      if (target.usedTraitsAdventure.includes('Lucky Hat')) {
        return { ok: false, message: 'Lucky Hat already used this adventure.' }
      }
      partySt.updateHero(target.id, {
        usedTraitsAdventure: [...target.usedTraitsAdventure, 'Lucky Hat'],
      })
    }

    // Refund the damage taken on the first roll, then roll again
    if ((item.damageTaken ?? 0) > 0) {
      const cur = useParty.getState().party.find((p) => p.id === target.id)?.life ?? 0
      partySt.setLife(target.id, cur + (item.damageTaken ?? 0))
    }

    set((s) => ({
      pendingDefenses: s.pendingDefenses.map((x) =>
        x.id === defId ? { ...x, resolved: false, damageTaken: 0 } : x,
      ),
    }))
    get().rollSingleDefense(defId)
    return { ok: true, message: `${target.name} rerolls Defense (${source})!` }
  },

  reduceDefenseDamage: (defId, traitName) => {
    const st = get()
    const item = st.pendingDefenses.find((d) => d.id === defId)
    if (!item || !item.resolved || item.success || (item.damageTaken ?? 0) <= 0 || item.damageReduced) {
      return { ok: false, message: 'No unreduced damage on this attack.' }
    }
    const partySt = useParty.getState()
    const target = partySt.party.find((p) => p.id === item.targetPcId)
    if (!target) return { ok: false, message: 'Hero not found.' }

    const reduction = traitName === 'Unyielding Form' ? Math.min(2, item.damageTaken ?? 1) : 1
    const cur = partySt.party.find((p) => p.id === target.id)?.life ?? 0
    partySt.setLife(target.id, cur + reduction)
    partySt.updateHero(target.id, {
      usedTraitsCombat: [...target.usedTraitsCombat, traitName],
      usedTraitsAdventure: [...target.usedTraitsAdventure, traitName],
    })

    set((s) => ({
      pendingDefenses: s.pendingDefenses.map((x) =>
        x.id === defId
          ? { ...x, damageTaken: Math.max(0, (x.damageTaken ?? 1) - reduction), damageReduced: true }
          : x,
      ),
      log: [...s.log, `${target.name} activates ${traitName} — reduces damage by ${reduction}!`],
    }))
    return { ok: true, message: `${traitName} prevented ${reduction} damage!` }
  },

  triggerCounterAttack: (defId, pc) => {
    const st = get()
    const item = st.pendingDefenses.find((d) => d.id === defId)
    if (!item || !item.resolved || !item.success || item.counterUsed) {
      return { ok: false, message: 'Counter-attack not available.' }
    }
    set((s) => ({
      pendingDefenses: s.pendingDefenses.map((x) =>
        x.id === defId ? { ...x, counterUsed: true } : x,
      ),
    }))
    useParty.getState().updateHero(pc.id, {
      usedTraitsCombat: [...pc.usedTraitsCombat, 'counter-attack'],
    })
    get().attack(pc, item.foeUid, defaultRng, false, { isBonusAttack: true })
    return { ok: true, message: `${pc.name} strikes back with a free counter-attack!` }
  },

  finishFoeTurnQueue: () => {
    const st = get()
    const nextFoes = st.ambushBonus
      ? st.foes.map((f) => ({ ...f, level: f.baseLevel }))
      : st.foes
    const lines = st.pendingDefenses.map((d) =>
      d.success
        ? `${d.foeName} → Defended (${d.total} > L${d.foeLevel})`
        : `${d.foeName} → Hit (${d.damageTaken ?? d.damage} dmg)`,
    )
    set({
      foes: nextFoes,
      ambushBonus: false,
      phase: 'pc-turn',
      round: st.round + 1,
      pcsActed: new Set(),
      pcsBonusActed: new Set(),
      pendingDefenses: [],
      lastFoeTurn: lines,
    })
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

    const nextFoes = st.ambushBonus
      ? st.foes.map((f) => ({ ...f, level: f.baseLevel }))
      : st.foes

    set((s) => ({
      foes: nextFoes,
      ambushBonus: false,
      phase: 'pc-turn',
      round: s.round + 1,
      pcsActed: new Set(),
      pcsBonusActed: new Set(),
      pendingDefenses: [],
      lastFoeTurn: lines,
      log: [...s.log, ...lines],
    }))
    return lines
  },

  tryMorale: (foeUid, rng = defaultRng) => {
    const foe = get().foes.find((f) => f.uid === foeUid)
    if (!foe) return 'never'
    if (neverTestsMorale(foe.morale) || (isAggressive(foe.reactionLabel) && /death/i.test(foe.reactionLabel))) {
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
      pcsBonusActed: new Set(),
      pendingDefenses: [],
      lastAttack: null,
      lastFoeTurn: null,
      lootReady: false,
      goldSensePreview: null,
    }),
}))
