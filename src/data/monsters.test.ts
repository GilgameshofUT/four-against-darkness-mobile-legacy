import { describe, expect, it } from 'vitest'
import { foeTables } from './monsters'
import { FoeTableList } from './schema'

const ENVIRONMENTS = new Set(['dungeon', 'caverns', 'fungal', 'fiendish'])
const KINDS = new Set(['vermin', 'minion', 'weird', 'boss', 'event'])

describe('foe tables', () => {
  it('validates against the Zod schema', () => {
    const result = FoeTableList.safeParse(foeTables)
    if (!result.success) console.error(JSON.stringify(result.error.issues, null, 2))
    expect(result.success).toBe(true)
  })

  it('has 16 tables: 4 kinds × 4 environments', () => {
    expect(foeTables).toHaveLength(16)
    const ids = foeTables.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    // id suffixes: vermin, minions (plural), weird, boss
    for (const env of ENVIRONMENTS) {
      for (const suffix of ['vermin', 'minions', 'weird', 'boss']) {
        expect(ids, `${env}-${suffix}`).toContain(`${env}-${suffix}`)
      }
    }
  })

  it('every table has 6 d6 entries', () => {
    for (const t of foeTables) {
      expect(t.dice, t.id).toBe('d6')
      expect(t.entries, t.id).toHaveLength(6)
      expect(t.environment, t.id).toBeTypeOf('string')
      expect(ENVIRONMENTS.has(t.environment), t.id).toBe(true)
    }
  })

  it('entries roll 1–6 and each has at least one foe', () => {
    for (const t of foeTables) {
      for (const e of t.entries) {
        expect(['1', '2', '3', '4', '5', '6'], `${t.id} roll`).toContain(e.roll)
        expect(e.foes.length).toBeGreaterThanOrEqual(1)
        for (const f of e.foes) {
          expect(f.name.length, `${t.id}/${e.roll}`).toBeGreaterThan(0)
          expect(KINDS.has(f.kind), `${t.id}/${e.roll} kind`).toBe(true)
          expect(f.treasure, `${t.id}/${f.name} treasure`).toBeTypeOf('string')
          expect(f.reactions, `${t.id}/${f.name} reactions`).toBeTypeOf('string')
        }
      }
    }
  })

  it('every table entry roll set is exactly 1..6', () => {
    for (const t of foeTables) {
      const rolls = t.entries.map((e) => e.roll).sort()
      expect(rolls, t.id).toEqual(['1', '2', '3', '4', '5', '6'])
    }
  })
})
