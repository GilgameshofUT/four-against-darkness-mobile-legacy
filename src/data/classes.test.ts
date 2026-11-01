import { describe, expect, it } from 'vitest'
import { classes } from './classes'
import { HeroClassList } from './schema'

const CORE = ['barbarian', 'cleric', 'dwarf', 'elf', 'halfling', 'rogue', 'warrior', 'wizard']

describe('hero class data', () => {
  it('validates against the Zod schema', () => {
    const result = HeroClassList.safeParse(classes)
    if (!result.success) {
      // Surface exactly which class/field is malformed.
      console.error(JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })

  it('contains all 20 classes', () => {
    expect(classes).toHaveLength(20)
  })

  it('marks exactly the 8 core classes', () => {
    const core = classes
      .filter((c) => c.core)
      .map((c) => c.id)
      .sort()
    expect(core).toEqual([...CORE].sort())
  })

  it('has unique, kebab-case ids', () => {
    const ids = classes.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
  })

  it('gives every class exactly 6 traits', () => {
    for (const c of classes) {
      expect(c.traits, `${c.id} traits`).toHaveLength(6)
      for (const t of c.traits) expect(t.text.length).toBeGreaterThan(0)
    }
  })

  it('has sensible life bases (L1 life = base + 1)', () => {
    for (const c of classes) {
      expect(c.life.base, `${c.id} life base`).toBeGreaterThanOrEqual(2)
      expect(c.life.base).toBeLessThanOrEqual(8)
    }
  })

  it('uses valid starting-wealth dice codes', () => {
    for (const c of classes) {
      expect(c.startingWealth.dice, `${c.id} wealth`).toMatch(/^([1-5])?d6$/)
    }
  })

  it('references a save profile for every class', () => {
    for (const c of classes) {
      expect(c.saves.profile.length, `${c.id} save profile`).toBeGreaterThan(0)
    }
  })
})
