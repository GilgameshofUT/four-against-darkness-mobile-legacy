import { describe, expect, it } from 'vitest'
import { scenarios } from './scenarios'
import { FoeTableList, RandTableList, ScenarioList } from './schema'

describe('scenarios', () => {
  it('validates against the Zod schema', () => {
    const result = ScenarioList.safeParse(scenarios)
    if (!result.success) console.error(JSON.stringify(result.error.issues, null, 2))
    expect(result.success).toBe(true)
  })

  it('has the two book scenarios', () => {
    const ids = scenarios.map((s) => s.id).sort()
    expect(ids).toEqual(['purple-crystals', 'witchs-cave'])
  })

  it("the Witch's Cave is table-driven with its own tables", () => {
    const wc = scenarios.find((s) => s.id === 'witchs-cave')!
    expect(wc.kind).toBe('table-driven')
    expect(wc.tables.length).toBeGreaterThanOrEqual(5)
    expect(wc.foeTables.length).toBeGreaterThanOrEqual(4)
    // scenario tables are valid on their own
    expect(RandTableList.safeParse(wc.tables).success).toBe(true)
    expect(FoeTableList.safeParse(wc.foeTables).success).toBe(true)
  })

  it('the Purple Crystals is a scripted adventure with the mines tables', () => {
    const pc = scenarios.find((s) => s.id === 'purple-crystals')!
    expect(pc.kind).toBe('scripted')
    expect(pc.tables.map((t) => t.id)).toContain('am-wandering')
  })

  it('every scenario has notes and an intro', () => {
    for (const s of scenarios) {
      expect(s.intro.length, s.id).toBeGreaterThan(0)
      expect(s.notes.length, `${s.id} notes`).toBeGreaterThan(0)
    }
  })
})
