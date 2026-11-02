import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { equipment } from '../data/equipment'
import { rollDie } from '../core/dice'
import { xpRollSucceeds } from '../core/leveling'
import {
  createPC,
  getClass,
  maxLife,
  type ArmorId,
  type CreatePCOptions,
  type PC,
} from './pc'

/* ============================================================
   Party store — the four heroes, their Play Sheets, hands,
   light sources, Marching Order, and inventory.
   ============================================================ */

export const PARTYSIZE = 4

interface PartyState {
  party: PC[]
  /** Whether the party has used its once-per-adventure Rest (Book p. 114). */
  restedThisAdventure: boolean
  /** Count of Minor Foe encounters defeated (10 = 1 XP roll, Book p. 117). */
  minorEncountersDefeated: number
  /** Pending XP rolls earned from Major Foes, 10x Minor Foes, or Secrets. */
  pendingXpRolls: number
  /** Secrets revealed in this campaign. */
  revealedSecrets: string[]

  /** Add a hero of the given class to the next empty Marching Order slot. */
  addHero: (name: string, classId: string, opts?: CreatePCOptions) => void
  removeHero: (id: string) => void
  updateHero: (id: string, patch: Partial<PC>) => void
  swapMarchingOrder: (idA: string, idB: string) => void
  setLife: (id: string, life: number) => void
  addGold: (id: string, delta: number) => void
  addPartyGold: (totalGp: number) => void
  addClue: (id: string) => void
  /** Spend/recover a named resource pool (returns true if applied). */
  spendResource: (id: string, key: string, amount: number) => boolean
  toggleTrait: (id: string, trait: string, max: number) => void
  togglePrepared: (id: string, spellId: string, max: number) => void
  setPreparedSpells: (id: string, spells: string[]) => void

  /** Equipment & Hands management (Book pp. 81–88, 110–111). */
  buyEquipment: (pcId: string, equipId: string) => { ok: boolean; message: string }
  equipHand: (pcId: string, hand: 'mainHand' | 'offHand', equipId: string | null) => void
  equipArmor: (pcId: string, armor: ArmorId) => void
  toggleShieldBack: (pcId: string) => void
  toggleLanternHook: (pcId: string) => void
  transferItem: (fromId: string, toId: string, equipId: string) => { ok: boolean; message: string }

  /** Healing, Prayers & Rest (Book pp. 28, 40, 55, 84, 114). */
  useBandage: (pcId: string) => { ok: boolean; message: string }
  drinkHealingPotion: (pcId: string) => { ok: boolean; message: string }
  castHealingPrayer: (clericId: string, targetId: string) => { ok: boolean; message: string }
  castBlessingPrayer: (casterId: string, targetId: string) => { ok: boolean; message: string }
  usePaladinHeal: (paladinId: string, targetId: string, points?: number) => { ok: boolean; message: string }
  restParty: () => { ok: boolean; message: string }

  /** Experience, Secrets & Adventure lifecycle (Book pp. 117–124). */
  noteDefeatedEncounter: (kind: 'minor' | 'major' | 'final-boss') => void
  rollXpForHero: (pcId: string) => { rolled: number; needed: number; leveledUp: boolean; newLevel: number }
  revealSecret: (pcId: string, secretName: string) => { ok: boolean; message: string }
  resetAdventureFlags: () => void
  levelUp: (id: string) => void
  reset: () => void
}

function normalizePartyOrder(party: PC[]): PC[] {
  return party.map((p, idx) => ({
    ...p,
    marchingOrder: ((idx + 1) as 1 | 2 | 3 | 4),
  }))
}

export const useParty = create<PartyState>()(
  persist(
    (set, get) => ({
      party: [],
      restedThisAdventure: false,
      minorEncountersDefeated: 0,
      pendingXpRolls: 0,
      revealedSecrets: [],

      addHero: (name, classId, opts) =>
        set((s) => {
          if (s.party.length >= PARTYSIZE) return s
          const order = (s.party.length + 1) as 1 | 2 | 3 | 4
          const pc = createPC(name, classId, { ...opts, marchingOrder: order })
          return { party: normalizePartyOrder([...s.party, pc]) }
        }),

      removeHero: (id) =>
        set((s) => ({
          party: normalizePartyOrder(s.party.filter((p) => p.id !== id)),
        })),

      updateHero: (id, patch) =>
        set((s) => ({
          party: s.party.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      swapMarchingOrder: (idA, idB) =>
        set((s) => {
          const list = [...s.party]
          const iA = list.findIndex((p) => p.id === idA)
          const iB = list.findIndex((p) => p.id === idB)
          if (iA < 0 || iB < 0 || iA === iB) return s
          const tmp = list[iA]!
          list[iA] = list[iB]!
          list[iB] = tmp
          return { party: normalizePartyOrder(list) }
        }),

      setLife: (id, life) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== id) return p
            const cap = maxLife(getClass(p.classId), p.level, p.traits)
            const nextLife = Math.max(0, Math.min(cap, life))
            const status =
              nextLife <= 0
                ? 'dead'
                : p.status === 'dead'
                  ? 'alive'
                  : p.status
            // Book p. 110: If a PC holding a lantern dies, the lantern drops to the floor!
            return { ...p, life: nextLife, status }
          }),
        })),

      addGold: (id, delta) =>
        set((s) => ({
          party: s.party.map((p) =>
            p.id === id ? { ...p, gold: Math.max(0, p.gold + delta) } : p,
          ),
        })),

      addPartyGold: (totalGp) =>
        set((s) => {
          if (s.party.length === 0 || totalGp <= 0) return s
          // Book p. 30 Greedy rule: each dwarf must be assigned at least 1gp when gold is found.
          const share = Math.floor(totalGp / s.party.length)
          let rem = totalGp - share * s.party.length
          return {
            party: s.party.map((p) => {
              const extra = rem > 0 ? 1 : 0
              if (rem > 0) rem--
              return { ...p, gold: p.gold + share + extra }
            }),
          }
        }),

      addClue: (id) =>
        set((s) => ({
          party: s.party.map((p) => (p.id === id ? { ...p, clues: p.clues + 1 } : p)),
        })),

      spendResource: (id, key, amount) => {
        const pc = get().party.find((p) => p.id === id)
        if (!pc) return false
        const have = pc.resources[key] ?? 0
        if (have < amount) return false
        set((s) => ({
          party: s.party.map((p) =>
            p.id === id
              ? { ...p, resources: { ...p.resources, [key]: have - amount } }
              : p,
          ),
        }))
        return true
      },

      toggleTrait: (id, trait, max) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== id) return p
            const has = p.traits.includes(trait)
            const nextTraits = has
              ? p.traits.filter((t) => t !== trait)
              : p.traits.length < max
                ? [...p.traits, trait]
                : [trait]
            const cap = maxLife(getClass(p.classId), p.level, nextTraits)
            return { ...p, traits: nextTraits, life: Math.min(cap, p.life) }
          }),
        })),

      togglePrepared: (id, spellId, max) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== id) return p
            if (p.preparedSpells.length >= max) {
              // Remove first occurrence of spellId if present, else replace oldest
              const idx = p.preparedSpells.indexOf(spellId)
              if (idx >= 0) {
                const copy = [...p.preparedSpells]
                copy.splice(idx, 1)
                return { ...p, preparedSpells: copy }
              }
              return p
            }
            return { ...p, preparedSpells: [...p.preparedSpells, spellId] }
          }),
        })),

      setPreparedSpells: (id, spells) =>
        set((s) => ({
          party: s.party.map((p) => (p.id === id ? { ...p, preparedSpells: spells } : p)),
        })),

      buyEquipment: (pcId, equipId) => {
        const item = equipment.find((e) => e.id === equipId)
        if (!item) return { ok: false, message: 'Unknown equipment.' }
        const st = get()
        const buyer = st.party.find((p) => p.id === pcId)
        if (!buyer) return { ok: false, message: 'Character not found.' }

        // Barbarians cannot use magic items, scrolls, or potions (Book p. 24)
        if (
          buyer.classId === 'barbarian' &&
          (equipId === 'healing-potion' ||
            equipId === 'scroll-of-blessing' ||
            equipId === 'amulet' ||
            equipId === 'talisman')
        ) {
          return { ok: false, message: 'Barbarians refuse to use magic items, scrolls, or potions (Book p. 24).' }
        }

        // Pool party gold if buyer is short (Book p. 81: "You may move gp from any PC to another to pay")
        const totalPartyGold = st.party.reduce((sum, p) => sum + p.gold, 0)
        if (totalPartyGold < item.price) {
          return { ok: false, message: `Need ${item.price}gp (party has ${totalPartyGold}gp).` }
        }

        let remainingCost = item.price
        const nextParty = st.party.map((p) => {
          if (p.id !== pcId) return p
          const paid = Math.min(p.gold, remainingCost)
          remainingCost -= paid
          return { ...p, gold: p.gold - paid }
        }).map((p) => {
          if (remainingCost <= 0 || p.id === pcId) return p
          const paid = Math.min(p.gold, remainingCost)
          remainingCost -= paid
          return { ...p, gold: p.gold - paid }
        }).map((p) => {
          if (p.id !== pcId) return p
          if (equipId === 'food-ration') {
            return { ...p, foodRations: Math.min(10, p.foodRations + 1) }
          }
          if (equipId === 'lantern') {
            if (p.classId === 'kukla' && !p.kuklaHairLantern) {
              return { ...p, kuklaHairLantern: true }
            }
            if (p.offHand === null && (!p.mainHand || (equipment.find((e) => e.id === p.mainHand)?.hands ?? 1) === 1)) {
              return { ...p, offHand: 'lantern' }
            }
            if (p.mainHand === null) {
              return { ...p, mainHand: 'lantern' }
            }
          }
          if (equipId === 'torch') {
            if (p.offHand === null && (!p.mainHand || (equipment.find((e) => e.id === p.mainHand)?.hands ?? 1) === 1)) {
              return { ...p, offHand: 'torch', torchRoomsLeft: 6, inventory: [...p.inventory, 'torch'] }
            }
          }
          if (equipId === 'lantern-hook' && p.offHand === 'shield' && p.inventory.includes('lantern')) {
            return {
              ...p,
              lanternOnHook: true,
              inventory: p.inventory.filter((x, i) => !(x === 'lantern' && i === p.inventory.indexOf('lantern'))),
            }
          }
          if (equipId === 'light-armor' || equipId === 'heavy-armor') {
            return { ...p, armor: equipId as ArmorId }
          }
          return { ...p, inventory: [...p.inventory, equipId] }
        })

        set({ party: nextParty })
        return { ok: true, message: `${buyer.name} bought ${item.name} (${item.price}gp).` }
      },

      equipHand: (pcId, hand, equipId) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== pcId) return p
            let mainHand = p.mainHand
            let offHand = p.offHand
            const inv = [...p.inventory]

            // Remove old item in target hand back to inventory
            const prev = hand === 'mainHand' ? mainHand : offHand
            if (prev) inv.push(prev)

            if (equipId === null) {
              if (hand === 'mainHand') mainHand = null
              else offHand = null
              return { ...p, mainHand, offHand, inventory: inv }
            }

            // Take new item out of inventory if present
            const idx = inv.indexOf(equipId)
            if (idx >= 0) inv.splice(idx, 1)

            const item = equipment.find((e) => e.id === equipId)
            const is2H = (item?.hands ?? 1) === 2

            if (hand === 'mainHand') {
              mainHand = equipId
              if (is2H && offHand) {
                inv.push(offHand)
                offHand = null
              }
            } else {
              // Off-hand cannot be used while mainHand has a 2-handed item
              const mainItem = mainHand ? equipment.find((e) => e.id === mainHand) : null
              if ((mainItem?.hands ?? 1) === 2 && mainHand) {
                inv.push(mainHand)
                mainHand = null
              }
              offHand = equipId
              if (equipId === 'torch' && p.torchRoomsLeft <= 0) {
                return { ...p, mainHand, offHand, torchRoomsLeft: 6, inventory: inv }
              }
            }
            return { ...p, mainHand, offHand, inventory: inv }
          }),
        })),

      equipArmor: (pcId, armor) =>
        set((s) => ({
          party: s.party.map((p) => (p.id === pcId ? { ...p, armor } : p)),
        })),

      toggleShieldBack: (pcId) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== pcId) return p
            if (p.offHand === 'shield') {
              return { ...p, offHand: null, shieldOnBack: true }
            }
            if (p.shieldOnBack) {
              const mainItem = p.mainHand ? equipment.find((e) => e.id === p.mainHand) : null
              if ((mainItem?.hands ?? 1) === 2) return p
              const inv = p.offHand ? [...p.inventory, p.offHand] : p.inventory
              return { ...p, offHand: 'shield', shieldOnBack: false, inventory: inv }
            }
            return p
          }),
        })),

      toggleLanternHook: (pcId) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== pcId) return p
            if (p.lanternOnHook) {
              return { ...p, lanternOnHook: false, inventory: [...p.inventory, 'lantern'] }
            }
            if (p.offHand === 'shield' && (p.inventory.includes('lantern') || p.mainHand === 'lantern')) {
              const inv = [...p.inventory]
              let mainHand = p.mainHand
              if (mainHand === 'lantern') mainHand = null
              else {
                const i = inv.indexOf('lantern')
                if (i >= 0) inv.splice(i, 1)
              }
              return { ...p, mainHand, lanternOnHook: true, inventory: inv }
            }
            return p
          }),
        })),

      transferItem: (fromId, toId, equipId) => {
        const st = get()
        const from = st.party.find((p) => p.id === fromId)
        const to = st.party.find((p) => p.id === toId)
        if (!from || !to) return { ok: false, message: 'Character not found.' }
        // Book p. 113 Madness rule: A PC with 1+ Madness becomes paranoid and cannot exchange gear!
        if (from.madness > 0 || to.madness > 0) {
          return { ok: false, message: 'Paranoid PCs with Madness cannot exchange equipment (Book p. 113)!' }
        }
        const idx = from.inventory.indexOf(equipId)
        if (idx < 0) return { ok: false, message: 'Item not in backpack.' }
        set({
          party: st.party.map((p) => {
            if (p.id === fromId) {
              const copy = [...p.inventory]
              copy.splice(idx, 1)
              return { ...p, inventory: copy }
            }
            if (p.id === toId) {
              return { ...p, inventory: [...p.inventory, equipId] }
            }
            return p
          }),
        })
        return { ok: true, message: `Transferred ${equipId} from ${from.name} to ${to.name}.` }
      },

      useBandage: (pcId) => {
        const st = get()
        const pc = st.party.find((p) => p.id === pcId)
        if (!pc) return { ok: false, message: 'PC not found.' }
        if (pc.classId === 'kukla') return { ok: false, message: 'Kuklas cannot be healed with bandages (Book p. 45).' }
        if (pc.bandageUsed) return { ok: false, message: `${pc.name} already used 1 Bandage this adventure (Book p. 84).` }
        const cap = maxLife(getClass(pc.classId), pc.level, pc.traits)
        if (pc.life >= cap) return { ok: false, message: `${pc.name} is already at full Life.` }

        // Find a bandage on this PC or any ally
        const holder = st.party.find((p) => p.inventory.includes('bandage'))
        if (!holder) return { ok: false, message: 'No Bandage in party inventory.' }

        set({
          party: st.party.map((p) => {
            let inv = p.inventory
            if (p.id === holder.id) {
              inv = [...p.inventory]
              inv.splice(inv.indexOf('bandage'), 1)
            }
            if (p.id === pcId) {
              return { ...p, life: Math.min(cap, p.life + 1), bandageUsed: true, inventory: inv }
            }
            return { ...p, inventory: inv }
          }),
        })
        return { ok: true, message: `Applied a Bandage to ${pc.name} (+1 Life).` }
      },

      drinkHealingPotion: (pcId) => {
        const st = get()
        const pc = st.party.find((p) => p.id === pcId)
        if (!pc) return { ok: false, message: 'PC not found.' }
        if (pc.classId === 'barbarian') return { ok: false, message: 'Barbarians cannot drink potions (Book p. 24).' }
        if (pc.classId === 'kukla') return { ok: false, message: 'Kuklas cannot drink potions (Book p. 45).' }
        if (pc.potionUsed) return { ok: false, message: `${pc.name} already drank 1 Healing Potion this adventure (Book p. 84).` }
        const holder = st.party.find((p) => p.inventory.includes('healing-potion'))
        if (!holder) return { ok: false, message: 'No Healing Potion in inventory.' }

        const cap = maxLife(getClass(pc.classId), pc.level, pc.traits)
        set({
          party: st.party.map((p) => {
            let inv = p.inventory
            if (p.id === holder.id) {
              inv = [...p.inventory]
              inv.splice(inv.indexOf('healing-potion'), 1)
            }
            if (p.id === pcId) {
              return { ...p, life: cap, potionUsed: true, inventory: inv }
            }
            return { ...p, inventory: inv }
          }),
        })
        return { ok: true, message: `${pc.name} drinks a Healing Potion and restores full Life (${cap}/${cap})!` }
      },

      castHealingPrayer: (clericId, targetId) => {
        const st = get()
        const cleric = st.party.find((p) => p.id === clericId)
        const target = st.party.find((p) => p.id === targetId)
        if (!cleric || !target) return { ok: false, message: 'Character not found.' }
        if (target.classId === 'kukla') return { ok: false, message: 'Kuklas cannot be healed by prayers (Book p. 45).' }
        // Bulwark Limited Healing rule (Book p. 26)
        if (
          target.classId === 'bulwark' &&
          target.life > 1 &&
          st.party.some((p) => p.id !== target.id && p.status === 'alive' && p.life < maxLife(getClass(p.classId), p.level, p.traits))
        ) {
          return { ok: false, message: 'Bulwark Limited Healing: must heal other wounded allies first unless Bulwark is at 1 Life (Book p. 26).' }
        }
        const rem = cleric.resources.healing ?? 0
        if (rem <= 0) return { ok: false, message: `${cleric.name} has no Healing prayers left.` }

        const amount = rollDie(Math.random, 6) + cleric.level
        const cap = maxLife(getClass(target.classId), target.level, target.traits)
        set({
          party: st.party.map((p) => {
            let next = p
            if (p.id === clericId) {
              next = { ...next, resources: { ...next.resources, healing: rem - 1 } }
            }
            if (p.id === targetId) {
              next = {
                ...next,
                life: Math.min(cap, next.life + amount),
                status: next.status === 'paralyzed' ? 'alive' : next.status,
                activeEffects: next.activeEffects.filter((e) => e !== 'bear-trap'),
              }
            }
            return next
          }),
        })
        return { ok: true, message: `${cleric.name} prays for Healing on ${target.name} (+${amount} Life, ${rem - 1} prayers left).` }
      },

      castBlessingPrayer: (casterId, targetId) => {
        const st = get()
        const caster = st.party.find((p) => p.id === casterId)
        const target = st.party.find((p) => p.id === targetId)
        if (!caster || !target) return { ok: false, message: 'Character not found.' }

        if (caster.classId === 'cleric') {
          const rem = caster.resources.blessing ?? 0
          if (rem <= 0) return { ok: false, message: `${caster.name} has no Blessing prayers left.` }
          set({
            party: st.party.map((p) => {
              let next = p
              if (p.id === casterId) {
                next = { ...next, resources: { ...next.resources, blessing: rem - 1 } }
              }
              if (p.id === targetId) {
                next = {
                  ...next,
                  status: next.status === 'petrified' || next.status === 'paralyzed' ? 'alive' : next.status,
                  madness: Math.max(0, next.madness - 1),
                  activeEffects: next.activeEffects.filter((e) => e !== 'cursed-altar'),
                }
              }
              return next
            }),
          })
          return { ok: true, message: `${caster.name} bestows a Blessing on ${target.name} — removes curse/petrification/1 Madness!` }
        }

        // Wizard prepared Blessing spell
        const idx = caster.preparedSpells.indexOf('blessing')
        if (idx < 0) return { ok: false, message: `${caster.name} does not have Blessing prepared.` }
        set({
          party: st.party.map((p) => {
            let next = p
            if (p.id === casterId) {
              const copy = [...next.preparedSpells]
              copy.splice(idx, 1)
              next = { ...next, preparedSpells: copy, spentSpells: [...next.spentSpells, 'blessing'] }
            }
            if (p.id === targetId) {
              next = {
                ...next,
                status: next.status === 'petrified' || next.status === 'paralyzed' ? 'alive' : next.status,
                madness: Math.max(0, next.madness - 1),
                activeEffects: next.activeEffects.filter((e) => e !== 'cursed-altar'),
              }
            }
            return next
          }),
        })
        return { ok: true, message: `${caster.name} casts Blessing on ${target.name}!` }
      },

      usePaladinHeal: (paladinId, targetId, points = 1) => {
        const st = get()
        const pal = st.party.find((p) => p.id === paladinId)
        const target = st.party.find((p) => p.id === targetId)
        if (!pal || !target) return { ok: false, message: 'Character not found.' }
        const rem = pal.resources.prayer ?? 0
        if (rem < points) return { ok: false, message: `Not enough Prayer points (${rem} left).` }
        const cap = maxLife(getClass(target.classId), target.level, target.traits)
        set({
          party: st.party.map((p) => {
            let next = p
            if (p.id === paladinId) {
              next = { ...next, resources: { ...next.resources, prayer: rem - points } }
            }
            if (p.id === targetId) {
              next = { ...next, life: Math.min(cap, next.life + points) }
            }
            return next
          }),
        })
        return { ok: true, message: `${pal.name} spends ${points} Prayer point(s) to heal ${target.name} (+${points} Life).` }
      },

      restParty: () => {
        const st = get()
        if (st.restedThisAdventure) {
          return { ok: false, message: 'The party can only Rest once per adventure (Book p. 114).' }
        }
        const hasHalfling = st.party.some((p) => p.classId === 'halfling' && p.status === 'alive')
        const totalRations = st.party.reduce((sum, p) => sum + p.foodRations, 0)
        const cookMeal = hasHalfling && totalRations >= st.party.length

        let mealRationsToDeduct = cookMeal ? st.party.length : 0
        set({
          restedThisAdventure: true,
          party: st.party.map((p) => {
            if (p.status !== 'alive') return p
            const cap = maxLife(getClass(p.classId), p.level, p.traits)
            let rations = p.foodRations
            if (mealRationsToDeduct > 0 && rations > 0) {
              const take = Math.min(rations, mealRationsToDeduct)
              rations -= take
              mealRationsToDeduct -= take
            }
            const mealBonus = cookMeal ? 1 : 0
            // If wounded, recover 1 Life (+1 if Halfling Nourishing Meal); otherwise recover 1 spent spell/ability
            let nextPrepared = p.preparedSpells
            let nextSpent = p.spentSpells
            const nextRes = { ...p.resources }
            let nextLife = p.life

            if (p.life < cap && p.classId !== 'kukla') {
              nextLife = Math.min(cap, p.life + 1 + mealBonus)
            } else {
              if (nextSpent.length > 0) {
                const [restored, ...rest] = nextSpent
                nextPrepared = [...nextPrepared, restored!]
                nextSpent = rest
              } else if (nextRes.tricks !== undefined) {
                nextRes.tricks += 1
              } else if (nextRes.luck !== undefined) {
                nextRes.luck += 1
              } else if (nextRes.rage !== undefined) {
                nextRes.rage += 1
              } else if (nextRes.healing !== undefined && nextRes.healing < 3) {
                nextRes.healing += 1
              }
              if (mealBonus > 0 && p.classId !== 'kukla') {
                nextLife = Math.min(cap, nextLife + mealBonus)
              }
            }
            const nextMadness = cookMeal && p.classId === 'halfling' ? Math.max(0, p.madness - 1) : p.madness
            return {
              ...p,
              life: nextLife,
              foodRations: rations,
              preparedSpells: nextPrepared,
              spentSpells: nextSpent,
              resources: nextRes,
              madness: nextMadness,
            }
          }),
        })
        return {
          ok: true,
          message: cookMeal
            ? 'The party Rests and the Halfling cooks a Nourishing Meal (+2 Life / +1 ability recovered)!'
            : 'The party Rests (+1 Life or 1 spent spell/ability recovered).',
        }
      },

      noteDefeatedEncounter: (kind) =>
        set((s) => {
          if (kind === 'minor') {
            const count = s.minorEncountersDefeated + 1
            const earned = count >= 10 ? 1 : 0
            return {
              minorEncountersDefeated: count >= 10 ? count - 10 : count,
              pendingXpRolls: s.pendingXpRolls + earned,
            }
          }
          if (kind === 'final-boss') {
            return { pendingXpRolls: s.pendingXpRolls + 2 } // 1 for Major Foe + 1 for Final Boss (Book p. 117)
          }
          return { pendingXpRolls: s.pendingXpRolls + 1 }
        }),

      rollXpForHero: (pcId) => {
        const st = get()
        const pc = st.party.find((p) => p.id === pcId)
        if (!pc || st.pendingXpRolls <= 0) {
          return { rolled: 0, needed: 6, leveledUp: false, newLevel: pc?.level ?? 1 }
        }
        const rolled = rollDie(Math.random, 6)
        const success = xpRollSucceeds(rolled, pc.level)
        set((s) => ({ pendingXpRolls: Math.max(0, s.pendingXpRolls - 1) }))
        if (success) {
          get().levelUp(pcId)
        }
        return {
          rolled,
          needed: Math.min(6, pc.level + 1),
          leveledUp: success,
          newLevel: success ? pc.level + 1 : pc.level,
        }
      },

      revealSecret: (pcId, secretName) => {
        const st = get()
        const pc = st.party.find((p) => p.id === pcId)
        if (!pc || pc.clues < 3) {
          return { ok: false, message: 'Need 3 Clues on a character to reveal a Secret (Book p. 123).' }
        }
        set((s) => ({
          pendingXpRolls: s.pendingXpRolls + 1,
          revealedSecrets: [...s.revealedSecrets, secretName],
          party: s.party.map((p) => (p.id === pcId ? { ...p, clues: p.clues - 3 } : p)),
        }))
        return {
          ok: true,
          message: `${pc.name} spends 3 Clues to reveal Secret "${secretName}" and earns 1 XP roll!`,
        }
      },

      resetAdventureFlags: () =>
        set((s) => ({
          restedThisAdventure: false,
          party: s.party.map((p) => {
            const cls = getClass(p.classId)
            const cap = maxLife(cls, p.level, p.traits)
            return {
              ...p,
              life: p.status === 'alive' ? cap : p.life,
              bandageUsed: false,
              potionUsed: false,
              usedTraitsCombat: [],
              usedTraitsAdventure: [],
              preparedSpells: [...p.preparedSpells, ...p.spentSpells],
              spentSpells: [],
              activeEffects: [],
              madness: Math.max(0, p.madness - 1),
            }
          }),
        })),

      levelUp: (id) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== id) return p
            const level = p.level + 1
            const resources = { ...p.resources }
            if (resources.tricks !== undefined) resources.tricks += 1
            if (resources.luck !== undefined) resources.luck += 1
            if (resources.gadget !== undefined) resources.gadget += 1
            if (resources.prayer !== undefined) resources.prayer += 1
            if (resources.spellSlots !== undefined) resources.spellSlots += 1
            if (resources.rage !== undefined && level % 2 === 0) resources.rage += 1
            return { ...p, level, life: p.life + 1, resources, xp: Math.max(0, p.xp - 1) }
          }),
        })),

      reset: () =>
        set({
          party: [],
          restedThisAdventure: false,
          minorEncountersDefeated: 0,
          pendingXpRolls: 0,
          revealedSecrets: [],
        }),
    }),
    {
      name: '4ad-party',
      version: 2,
      migrate: (persisted) => {
        const p = persisted as Partial<PartyState> | undefined
        if (!p || !Array.isArray(p.party)) {
          return {
            party: [],
            restedThisAdventure: false,
            minorEncountersDefeated: 0,
            pendingXpRolls: 0,
            revealedSecrets: [],
          }
        }
        // Upgrade any old PC records missing the Play Sheet fields
        const upgraded = p.party.map((raw, idx) => {
          if (typeof raw.marchingOrder === 'number' && 'mainHand' in raw && 'status' in raw) {
            return raw
          }
          return createPC(raw.name || `Hero ${idx + 1}`, raw.classId || 'warrior', {
            level: raw.level || 1,
            marchingOrder: ((idx + 1) as 1 | 2 | 3 | 4),
          })
        })
        return {
          party: normalizePartyOrder(upgraded),
          restedThisAdventure: Boolean(p.restedThisAdventure),
          minorEncountersDefeated: p.minorEncountersDefeated ?? 0,
          pendingXpRolls: p.pendingXpRolls ?? 0,
          revealedSecrets: p.revealedSecrets ?? [],
        }
      },
    },
  ),
)

/** Party's Highest Character Level (0 if empty). */
export function partyHcl(party: PC[]): number {
  if (party.length === 0) return 0
  return Math.max(...party.map((p) => p.level))
}
