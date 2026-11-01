import { describe, expect, it } from 'vitest'
import { equipment } from './equipment'
import { EquipmentList } from './schema'

describe('equipment', () => {
  it('validates against the Zod schema', () => {
    const result = EquipmentList.safeParse(equipment)
    if (!result.success) console.error(JSON.stringify(result.error.issues, null, 2))
    expect(result.success).toBe(true)
  })

  it('has unique ids', () => {
    const ids = equipment.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has non-negative prices and descriptive text', () => {
    for (const e of equipment) {
      expect(e.price, e.id).toBeGreaterThanOrEqual(0)
      expect(e.text.length, e.id).toBeGreaterThan(0)
    }
  })

  it('weapons carry an attack modifier and armor a defense modifier', () => {
    for (const e of equipment) {
      if (e.category === 'weapon') expect(e.attackMod, e.id).toBeTypeOf('number')
      if (e.id === 'shield' || e.id === 'light-armor' || e.id === 'heavy-armor') {
        expect(e.defenseMod, e.id).toBeTypeOf('number')
      }
    }
  })

  it('covers every category', () => {
    const cats = new Set(equipment.map((e) => e.category))
    for (const c of ['weapon', 'armor', 'light', 'consumable', 'item', 'service']) {
      expect(cats.has(c as never), c).toBe(true)
    }
  })
})
