import { describe, expect, it } from 'vitest'
import { spells } from './spells'
import { SpellList } from './schema'

describe('spells', () => {
  it('validates against the Zod schema', () => {
    const result = SpellList.safeParse(spells)
    if (!result.success) console.error(JSON.stringify(result.error.issues, null, 2))
    expect(result.success).toBe(true)
  })

  it('has 30 spells: 6 wizard, 12 druid, 12 illusionist', () => {
    expect(spells).toHaveLength(30)
    const by = (s: string) => spells.filter((x) => x.school === s).length
    expect(by('wizard')).toBe(6)
    expect(by('druid')).toBe(12)
    expect(by('illusionist')).toBe(12)
  })

  it('has unique ids', () => {
    const ids = spells.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('wizard spells roll d6 (1-6); druid/illusionist roll d12 (1-12)', () => {
    for (const s of spells) {
      if (s.school === 'wizard') {
        expect(s.roll, s.id).toBeGreaterThanOrEqual(1)
        expect(s.roll).toBeLessThanOrEqual(6)
      } else {
        expect(s.roll, s.id).toBeGreaterThanOrEqual(1)
        expect(s.roll).toBeLessThanOrEqual(12)
      }
    }
  })

  it('covers the 6 basic wizard spells on the random spell table', () => {
    const wiz = spells.filter((s) => s.school === 'wizard').map((s) => s.roll).sort()
    expect(wiz).toEqual([1, 2, 3, 4, 5, 6])
  })
})
