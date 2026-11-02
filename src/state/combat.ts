import { create } from 'zustand'
import { foeTables } from '../data/monsters'
import type { Foe, FoeKind } from '../data/schema'
import { rollDie, rollNotation, type Rng, defaultRng } from '../core/dice'
import { tier } from '../core/hcl'
import {
  moraleCheck, neverTestsMorale, parseFoeLevel, parseFoeLife, resolveAttack, rollAttack, rollDefense,
} from '../core/combat'
import { rollReaction } from '../core/reactions'
import { derive, type PC } from './pc'
import { useParty } from './party'
import type { Environment } from './dungeon'

export interface FoeInstance {
  uid: string
  name: string
  kind: FoeKind
  level: number
  /** Minor groups: how many remain (and started). */
  remaining?: number
  initial?: number
  /** Major foes: current/max life. */
  life?: number
  maxLife?: number
  attacks: number
  damage: string
  treasure: string
  morale: string
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

interface CombatState {
  active: boolean
  environment: Environment
  tileId: string | null
  foes: FoeInstance[]
  round: number
  log: string[]
  /** Set once all PCs have acted this round (foe turn ready). */
  pcsActed: Set<string>
  lastAttack: AttackResult | null
  lastFoeTurn: string[] | null
  lootReady: boolean
  begin: (foeKind: FoeKind, env: Environment, hclValue: number) => void
  attack: (pc: PC, foeUid: string, rng?: Rng, spell?: boolean) => AttackResult | null
  castSpell: (pc: PC, foeUid: string, rng?: Rng) => AttackResult | null
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

export const useCombat = create<CombatState>((set, get) => ({
      active: false,
      environment: 'dungeon',
      tileId: null,
      foes: [],
      round: 0,
      log: [],
      pcsActed: new Set<string>(),
      lastAttack: null,
      lastFoeTurn: null,
      lootReady: false,

      begin: (foeKind, env, hclValue) => {
        const rng = defaultRng
        const tableId = `${env}-${foeKind}`
        const f = pickFoe(tableId, rng)
        if (!f) return
        const tierValue = tier(hclValue)
        const level = parseFoeLevel(f.level, hclValue, f.maxLevel)
        const minor = f.kind === 'vermin' || f.kind === 'minion'
        const reaction = rollReaction(f.reactions, rollDie(rng, 6))
        const inst: FoeInstance = {
          uid: uid(),
          name: f.name,
          kind: f.kind,
          level,
          attacks: f.attacks ?? 1,
          damage: f.damage ?? '1',
          treasure: f.treasure,
          morale: f.morale,
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
          const life = parseFoeLife(f.life, hclValue, tierValue) ?? 5
          inst.life = life
          inst.maxLife = life
        }
        set({
          active: true,
          environment: env,
          foes: [inst],
          round: 1,
          log: [`Encounter: ${inst.name} (L${level}) — ${reaction}`],
          pcsActed: new Set(),
          lastAttack: null,
          lastFoeTurn: null,
          lootReady: false,
        })
      },

      attack: (pc, foeUid, rng = defaultRng, spell = false) => {
        const st = get()
        const foe = st.foes.find((f) => f.uid === foeUid)
        if (!foe) return null
        const d = derive(pc)
        const die = [6, 8, 10, 12, 20][d.tier - 1] ?? 6
        // Casters add +L to spellcasting; otherwise the class attack bonus.
        const mods = spell ? pc.level : d.attack
        const out = rollAttack({ dieSides: die, modifiers: mods, rng })
        const hits = resolveAttack(out.attackTotal, foe.level, foe.kind === 'vermin' || foe.kind === 'minion' ? 'minor' : 'major')
        const minor = foe.kind === 'vermin' || foe.kind === 'minion'

        let slain = 0
        let damage = 0
        let killed = false
        const foes = st.foes.map((f) => {
          if (f.uid !== foeUid) return f
          if (minor) {
            slain = Math.min(hits, f.remaining ?? 0)
            const remaining = (f.remaining ?? 0) - slain
            killed = remaining <= 0
            return { ...f, remaining }
          } else {
            damage = Math.min(hits, f.life ?? 0)
            const life = (f.life ?? 0) - damage
            killed = life <= 0
            return { ...f, life }
          }
        })

        const note = minor
          ? slain > 0 ? `slays ${slain} ${foe.name}` : 'no effect'
          : damage > 0 ? `deals ${damage} damage` : 'misses'

        const result: AttackResult = {
          pcName: pc.name, foeName: foe.name, total: out.attackTotal, rolls: out.rolls,
          exploded: out.exploded, slain, damage, killed, note,
        }

        const remainingFoes = foes.filter((f) => (f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) > 0 : (f.life ?? 0) > 0))
        const acted = new Set(st.pcsActed)
        acted.add(pc.id)
        set({
          foes,
          pcsActed: acted,
          lastAttack: result,
          lootReady: remainingFoes.length === 0,
          log: [...st.log, `${pc.name}${spell ? ' casts' : ''}: ${note} (${out.attackTotal} vs L${foe.level})`],
        })
        return result
      },

      castSpell: (pc, foeUid, rng = defaultRng) => {
        if (!useParty.getState().spendResource(pc.id, 'spellSlots', 1)) return null
        return get().attack(pc, foeUid, rng, true)
      },

      foeTurn: (hclValue, rng = defaultRng) => {
        const st = get()
        const party = useParty.getState().party
        const tierValue = tier(hclValue)
        const lines: string[] = []
        const alive = st.foes.filter((f) => (f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) > 0 : (f.life ?? 0) > 0))
        if (alive.length === 0 || party.length === 0) { set({ lastFoeTurn: lines }); return lines }

        let pi = 0
        for (const foe of alive) {
          const dmg = parseAttackDamage(foe.damage, tierValue)
          for (let a = 0; a < Math.max(1, foe.attacks); a++) {
            const target = party[pi % party.length]!
            pi++
            const d = derive(target)
            const die = [6, 8, 10, 12, 20][d.tier - 1] ?? 6
            const def = rollDefense({ foeL: foe.level, dieSides: die, modifiers: d.defense, rng })
            if (def.success) {
              lines.push(`${foe.name} → ${target.name}: defended (${def.defenseTotal} > L${foe.level})`)
            } else {
              const d2 = useParty.getState()
              const life = Math.max(0, (d2.party.find((p) => p.id === target.id)?.life ?? 0) - dmg)
              useParty.getState().setLife(target.id, life)
              lines.push(`${foe.name} → ${target.name}: ${dmg} damage${def.rolledOne ? ' (rolled 1)' : ''}`)
            }
          }
        }
        set((s) => ({ round: s.round + 1, pcsActed: new Set(), lastFoeTurn: lines, log: [...s.log, ...lines] }))
        return lines
      },

      tryMorale: (foeUid, rng = defaultRng) => {
        const foe = get().foes.find((f) => f.uid === foeUid)
        if (!foe) return 'never'
        if (neverTestsMorale(foe.morale)) return 'never'
        const roll = rollDie(rng, 6)
        const res = moraleCheck(roll, parseMoraleMod(foe.morale))
        set((s) => ({ log: [...s.log, `Morale (${foe.name}): d6=${roll}${parseMoraleMod(foe.morale) !== 0 ? `+${parseMoraleMod(foe.morale)}` : ''} → ${res}`] }))
        return res
      },

      markLoot: () => set({ lootReady: false }),
      clear: () => set({ active: false, foes: [], round: 0, log: [], pcsActed: new Set(), lastAttack: null, lastFoeTurn: null, lootReady: false }),
    }),
)
