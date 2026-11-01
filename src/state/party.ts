import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createPC, getClass, maxLife, type PC } from './pc'

/* ============================================================
   Party store — the four heroes, persisted to the device.
   ============================================================ */

export const PARTYSIZE = 4

interface PartyState {
  party: PC[]
  /** Add a hero of the given class to the next empty slot. */
  addHero: (name: string, classId: string) => void
  removeHero: (id: string) => void
  setLife: (id: string, life: number) => void
  addGold: (id: string, delta: number) => void
  addClue: (id: string) => void
  /** Spend/recover a named resource pool (returns true if applied). */
  spendResource: (id: string, key: string, amount: number) => boolean
  toggleTrait: (id: string, trait: string, max: number) => void
  levelUp: (id: string) => void
  reset: () => void
}

export const useParty = create<PartyState>()(
  persist(
    (set, get) => ({
      party: [],

      addHero: (name, classId) =>
        set((s) => {
          if (s.party.length >= PARTYSIZE) return s
          return { party: [...s.party, createPC(name, classId)] }
        }),

      removeHero: (id) => set((s) => ({ party: s.party.filter((p) => p.id !== id) })),

      setLife: (id, life) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== id) return p
            const cap = maxLife(getClass(p.classId), p.level)
            return { ...p, life: Math.max(0, Math.min(cap, life)) }
          }),
        })),

      addGold: (id, delta) =>
        set((s) => ({ party: s.party.map((p) => (p.id === id ? { ...p, gold: Math.max(0, p.gold + delta) } : p)) })),

      addClue: (id) => set((s) => ({ party: s.party.map((p) => (p.id === id ? { ...p, clues: p.clues + 1 } : p)) })),

      spendResource: (id, key, amount) => {
        const pc = get().party.find((p) => p.id === id)
        if (!pc) return false
        const have = pc.resources[key] ?? 0
        if (have < amount) return false
        set((s) => ({
          party: s.party.map((p) =>
            p.id === id ? { ...p, resources: { ...p.resources, [key]: have - amount } } : p,
          ),
        }))
        return true
      },

      toggleTrait: (id, trait, max) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== id) return p
            const has = p.traits.includes(trait)
            if (has) return { ...p, traits: p.traits.filter((t) => t !== trait) }
            if (p.traits.length >= max) return p
            return { ...p, traits: [...p.traits, trait] }
          }),
        })),

      levelUp: (id) =>
        set((s) => ({
          party: s.party.map((p) => {
            if (p.id !== id) return p
            const level = p.level + 1
            // Bump resource pools that scale with level (max Life is derived from level).
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

      reset: () => set({ party: [] }),
    }),
    { name: '4ad-party' },
  ),
)

/** Party's Highest Character Level (0 if empty). */
export function partyHcl(party: PC[]): number {
  if (party.length === 0) return 0
  return Math.max(...party.map((p) => p.level))
}
