import { describe, expect, it } from 'vitest'
import { tables } from './tables'
import { RandTableList } from './schema'

describe('random tables', () => {
  it('validates against the Zod schema', () => {
    const result = RandTableList.safeParse(tables)
    if (!result.success) console.error(JSON.stringify(result.error.issues, null, 2))
    expect(result.success).toBe(true)
  })

  it('has unique ids', () => {
    const ids = tables.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has entries for every table', () => {
    for (const t of tables) {
      expect(t.entries.length, `${t.id}`).toBeGreaterThanOrEqual(1)
      expect(t.dice, `${t.id} dice`).toMatch(/^([2-9])?d6(\+\d+)?$/)
    }
  })

  it('covers the core exploration tables', () => {
    const ids = new Set(tables.map((t) => t.id))
    for (const id of ['tile-content', 'treasure', 'search', 'wandering-monsters', 'door', 'quest', 'epic-rewards']) {
      expect(ids.has(id), id).toBe(true)
    }
  })

  it('covers a traps table for each environment', () => {
    const ids = new Set(tables.map((t) => t.id))
    for (const id of ['dungeon-traps', 'caverns-traps', 'fungal-traps']) {
      expect(ids.has(id), id).toBe(true)
    }
  })
})
