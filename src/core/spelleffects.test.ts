import { describe, expect, it } from 'vitest'
import { resolveSpellCast } from './spelleffects'
import { createPC, canCastSpellsNow, partyHasLight } from '../state/pc'
import { useParty } from '../state/party'
import { useCombat } from '../state/combat'
import { fullAttackModVs, fullDefenseModVs } from './modifiers'

describe('spell effects engine (Book pp. 68–75)', () => {
  it('Fireball slays (roll - foe.L) Minor Foes, with a minimum of 1 even on failure', () => {
    const wiz = createPC('Alrik', 'wizard', { level: 4 })
    // Fixed rng rolling face 4 -> total 4 + 4 = 8 vs L3 goblins -> 8 - 3 = 5 slain
    const high = resolveSpellCast(
      wiz,
      'fireball',
      { name: 'Goblins', kind: 'minion', level: 3, remaining: 6, tags: [] },
      { rng: () => 0.55 },
    )
    expect(high.hit).toBe(true)
    expect(high.minorSlain).toBe(5)

    // Low roll: face 1 -> total 1 + 1 = 2 vs L4 orcs -> min 1 slain (Book p. 68 Example 2)
    const wiz1 = createPC('Marius', 'wizard', { level: 1 })
    const low = resolveSpellCast(
      wiz1,
      'fireball',
      { name: 'Orcs', kind: 'minion', level: 4, remaining: 5, tags: [] },
      { rng: () => 0.05 },
    )
    expect(low.minorSlain).toBe(1)
  })

  it('Lightning deals 2 damage to a Major Foe and slays 1 Minor Foe on hit', () => {
    const wiz = createPC('Alrik', 'wizard', { level: 3 })
    const vsMajor = resolveSpellCast(
      wiz,
      'lightning',
      { name: 'Ogre', kind: 'boss', level: 5, life: 6, tags: [] },
      { rng: () => 0.6 }, // face 4 + 3 = 7 >= 5
    )
    expect(vsMajor.hit).toBe(true)
    expect(vsMajor.majorDamage).toBe(2)

    const vsMinor = resolveSpellCast(
      wiz,
      'lightning',
      { name: 'Goblins', kind: 'minion', level: 3, remaining: 5, tags: [] },
      { rng: () => 0.6 },
    )
    expect(vsMinor.hit).toBe(true)
    expect(vsMinor.minorSlain).toBe(1)
  })

  it('Sleep knocks out d6+L Minor Foes or 1 Major Foe, and respects Undead/Dragon immunity', () => {
    const wiz = createPC('Alrik', 'wizard', { level: 3 })
    const vsUndead = resolveSpellCast(
      wiz,
      'sleep',
      { name: 'Skeletons', kind: 'minion', level: 3, remaining: 5, tags: ['undead'] },
      { rng: () => 0.8 },
    )
    expect(vsUndead.hit).toBe(false)
    expect(vsUndead.minorSlain).toBe(0)

    const vsBoss = resolveSpellCast(
      wiz,
      'sleep',
      { name: 'Orc Brute', kind: 'boss', level: 5, life: 6, tags: [] },
      { rng: () => 0.6 }, // 4 + 3 = 7 >= 5
    )
    expect(vsBoss.hit).toBe(true)
    expect(vsBoss.neutralizedMajor).toBe(true)
  })
})

describe('Play Sheet, Hands, Lantern, Darkness & Corridor rules', () => {
  it('enforces Darkness -2 penalty when no PC carries a light source', () => {
    const war = createPC('Bjorn', 'warrior', { level: 2, loadoutId: 'war-sword-shield' })
    expect(partyHasLight([war])).toBe(false)

    const foe = { name: 'Goblin', tags: [], kind: 'minor' as const, count: 4 }
    const litAtk = fullAttackModVs(war, foe, 4, { inDarkness: false }).total
    const darkAtk = fullAttackModVs(war, foe, 4, { inDarkness: true }).total
    expect(darkAtk).toBe(litAtk - 2)

    const litDef = fullDefenseModVs(war, foe, { inDarkness: false }).total
    const darkDef = fullDefenseModVs(war, foe, { inDarkness: true }).total
    expect(darkDef).toBe(litDef - 2)
  })

  it('enforces Elf armor/shield spellcasting rules and 2-hand weapon rules', () => {
    const elf = createPC('Sylthas', 'elf', { level: 2 })
    expect(canCastSpellsNow(elf).ok).toBe(true)

    // Give Elf a shield in offHand -> cannot cast until strapped to back
    elf.offHand = 'shield'
    expect(canCastSpellsNow(elf).ok).toBe(false)

    // Holding a 2-handed bow occupies both hands -> no free hand for spells
    elf.offHand = null
    elf.mainHand = 'bow'
    expect(canCastSpellsNow(elf).ok).toBe(false)
  })

  it('enforces Corridor Marching Order melee rules (Positions 1&2 vs 3&4 on rear ambush)', () => {
    const partySt = useParty.getState()
    partySt.reset()
    partySt.addHero('Bjorn', 'warrior')
    partySt.addHero('Durin', 'dwarf')
    partySt.addHero('Rask', 'rogue')
    partySt.addHero('Alrik', 'wizard')

    const [p1, p2, p3, p4] = useParty.getState().party
    const combatSt = useCombat.getState()

    // Normal corridor encounter: only #1 and #2 can melee
    combatSt.begin('minion', 'dungeon', 1, { inCorridor: true, wandering: false })
    expect(useCombat.getState().canPcMelee(p1!).ok).toBe(true)
    expect(useCombat.getState().canPcMelee(p2!).ok).toBe(true)
    expect(useCombat.getState().canPcMelee(p3!).ok).toBe(false)
    expect(useCombat.getState().canPcMelee(p4!).ok).toBe(false)

    // Wandering Monster corridor ambush: attacks from the rear (#3 and #4 melee!)
    combatSt.begin('minion', 'dungeon', 1, { inCorridor: true, wandering: true })
    expect(useCombat.getState().canPcMelee(p1!).ok).toBe(false)
    expect(useCombat.getState().canPcMelee(p2!).ok).toBe(false)
    expect(useCombat.getState().canPcMelee(p3!).ok).toBe(true)
    expect(useCombat.getState().canPcMelee(p4!).ok).toBe(true)
  })
})
