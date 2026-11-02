import { describe, expect, it } from 'vitest'
import { attackModVs, type FoeContext } from './modifiers'

const foe = (over: Partial<FoeContext>): FoeContext => ({
  name: 'Foe', tags: [], kind: 'major', count: 1, ...over,
})

describe('attack modifiers vs a Foe', () => {
  it('cleric: +1/2 L normally, +L vs undead', () => {
    expect(attackModVs('cleric', 3, foe({}), 4)).toBe(1) // half L
    expect(attackModVs('cleric', 3, foe({ tags: ['undead'], name: 'Zombie' }), 4)).toBe(3) // +L
  })

  it('rogue: +L only against an outnumbered Minor Foe', () => {
    expect(attackModVs('rogue', 4, foe({ kind: 'major' }), 4)).toBe(0)
    expect(attackModVs('rogue', 4, foe({ kind: 'minor', count: 3 }), 4)).toBe(4) // 4 PCs > 3 foes
    expect(attackModVs('rogue', 4, foe({ kind: 'minor', count: 6 }), 4)).toBe(0) // not outnumbered
  })

  it('dwarf: +L, +1 more vs goblins', () => {
    expect(attackModVs('dwarf', 3, foe({ name: 'Orc' }), 4)).toBe(3)
    expect(attackModVs('dwarf', 3, foe({ name: 'Goblin Swarmlings' }), 4)).toBe(4)
  })

  it('elf: +L, +1 more vs orcs', () => {
    expect(attackModVs('elf', 3, foe({ name: 'Goblin' }), 4)).toBe(3)
    expect(attackModVs('elf', 3, foe({ name: 'Orc Brute' }), 4)).toBe(4)
  })

  it('warrior/barbarian/paladin: +L always', () => {
    for (const c of ['warrior', 'barbarian', 'paladin']) {
      expect(attackModVs(c, 5, foe({}), 4)).toBe(5)
    }
  })

  it('casters get no melee bonus', () => {
    for (const c of ['wizard', 'illusionist', 'gnome', 'halfling']) {
      expect(attackModVs(c, 4, foe({}), 4)).toBe(0)
    }
  })
})
