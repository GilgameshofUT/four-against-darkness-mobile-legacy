import { describe, expect, it } from 'vitest'
import {
  explodeThreshold, mulberry32, rollD3, rollD66, rollDie, rollExploding, rollNotation, type Rng,
} from './dice'
import { bonusHalfL, bonusL, bonusTier, foeLevel, hcl, tier } from './hcl'
import { moraleCheck, neverTestsMorale, resolveAttack, rollAttack, rollDefense } from './combat'
import { isAggressive, parseReactions, rollReaction } from './reactions'
import {
  majorFoeXp, minorFoeXp, oldSchoolLevelCost, slowerAdvancementCost, tierTrainingCost, xpRollSucceeds,
} from './leveling'
import {
  ALL_SHAPES, isFinalBoss, resolveDoor, resolveSearch, resolveTileContent, resolveWandering,
  rollFirstRoom, rollTileShape,
} from './dungeon'

/** rng returning a fixed sequence of fractions (cycling). */
function seqRng(fracs: number[]): Rng {
  let i = 0
  return () => fracs[i++ % fracs.length]!
}

describe('dice', () => {
  it('rolls within range', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 200; i++) {
      const v = rollDie(rng, 6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
  })

  it('explode thresholds match the book', () => {
    expect(explodeThreshold(6)).toBe(6)
    expect(explodeThreshold(8)).toBe(7)
    expect(explodeThreshold(10)).toBe(8)
    expect(explodeThreshold(12)).toBe(9)
    expect(explodeThreshold(20)).toBe(10)
  })

  it('explodes cumulatively on the threshold', () => {
    // d6: faces6 then2 → total8, one explosion
    const r = rollExploding(seqRng([0.95, 0.2]), 6)
    expect(r.rolls).toEqual([6, 2])
    expect(r.total).toBe(8)
    expect(r.exploded).toBe(true)
  })

  it('does not explode on a non-threshold roll', () => {
    const r = rollExploding(seqRng([0.5]), 6) // face4
    expect(r.rolls).toEqual([4])
    expect(r.exploded).toBe(false)
  })

  it('chains multiple explosions', () => {
    // faces6,6,3 → total15
    const r = rollExploding(seqRng([0.95, 0.95, 0.45]), 6)
    expect(r.rolls).toEqual([6, 6, 3])
    expect(r.total).toBe(15)
  })

  it('parses and rolls dice notation', () => {
    const rng = mulberry32(7)
    expect(rollNotation(rng, '2d6')).toBeGreaterThanOrEqual(2)
    expect(rollNotation(rng, '2d6')).toBeLessThanOrEqual(12)
    expect(rollNotation(rng, 'd6+3')).toBeGreaterThanOrEqual(4)
  })

  it('rolls d66 in 11..66 and d3 in 1..3', () => {
    const rng = mulberry32(11)
    for (let i = 0; i < 100; i++) {
      const v = rollD66(rng)
      expect(v).toBeGreaterThanOrEqual(11)
      expect(v).toBeLessThanOrEqual(66)
      const d3 = rollD3(rng)
      expect(d3).toBeGreaterThanOrEqual(1)
      expect(d3).toBeLessThanOrEqual(3)
    }
  })
})

describe('hcl / tier', () => {
  it('hcl is the max party level', () => {
    expect(hcl([1, 3, 2, 1])).toBe(3)
    expect(hcl([5])).toBe(5)
    expect(hcl([])).toBe(1)
  })

  it('tier boundaries match the book', () => {
    expect(tier(1)).toBe(1)
    expect(tier(4)).toBe(1)
    expect(tier(5)).toBe(2)
    expect(tier(9)).toBe(2)
    expect(tier(10)).toBe(3)
    expect(tier(14)).toBe(3)
    expect(tier(15)).toBe(4)
    expect(tier(19)).toBe(4)
    expect(tier(20)).toBe(5)
  })

  it('foeLevel applies HCL+mod with a max cap', () => {
    expect(foeLevel(3, 2)).toBe(5)
    expect(foeLevel(3, 2, 4)).toBe(4) // capped
    expect(foeLevel(3, -5)).toBe(1) // never below1
  })

  it('bonus helpers', () => {
    expect(bonusL(3)).toBe(3)
    expect(bonusHalfL(3)).toBe(1)
    expect(bonusHalfL(4)).toBe(2)
    expect(bonusTier(5)).toBe(2)
  })
})

describe('combat', () => {
  it('resolveAttack: minor slain / major damage = floor(total / L)', () => {
    expect(resolveAttack(9, 3, 'minor')).toBe(3)
    expect(resolveAttack(8, 3, 'minor')).toBe(2)
    expect(resolveAttack(2, 3, 'minor')).toBe(0) // below L → no kill
    expect(resolveAttack(9, 4, 'major')).toBe(2)
    expect(resolveAttack(5, 4, 'major')).toBe(1)
    expect(resolveAttack(3, 4, 'major')).toBe(0) // miss
  })

  it('rollAttack adds modifiers to an exploding roll', () => {
    // face6 (explode) + face2 =8, +3 modifier =11
    const out = rollAttack({ dieSides: 6, modifiers: 3, rng: seqRng([0.95, 0.2]) })
    expect(out.attackTotal).toBe(11)
    expect(out.exploded).toBe(true)
  })

  it('defense: a first die of1 always fails even with huge modifiers', () => {
    const d = rollDefense({ foeL: 1, dieSides: 6, modifiers: 100, rng: seqRng([0.1]) })
    expect(d.rolledOne).toBe(true)
    expect(d.success).toBe(false)
  })

  it('defense: must roll strictly higher than the Foe L', () => {
    // die3 +0 vs L3 →3 not >3 → fail
    expect(rollDefense({ foeL: 3, dieSides: 6, modifiers: 0, rng: seqRng([0.4]) }).success).toBe(false)
    // die4 +0 vs L3 →4>3 → success
    expect(rollDefense({ foeL: 3, dieSides: 6, modifiers: 0, rng: seqRng([0.55]) }).success).toBe(true)
  })

  it('morale: ≤3 flees, modifiers shift it', () => {
    expect(moraleCheck(3, 0)).toBe('flee')
    expect(moraleCheck(4, 0)).toBe('fight')
    expect(moraleCheck(4, -1)).toBe('flee') // cowardly
    expect(moraleCheck(2, 1)).toBe('flee')
    expect(moraleCheck(3, 1)).toBe('fight') // courageous
  })

  it('neverTestsMorale detects never / fight-to-death', () => {
    expect(neverTestsMorale('never')).toBe(true)
    expect(neverTestsMorale('always fight to the death')).toBe(true)
    expect(neverTestsMorale('standard')).toBe(false)
  })
})

describe('reactions', () => {
  it('parses ranged reaction tables', () => {
    const r = parseReactions('1-3 Flee,4-6 Fight')
    expect(r).toEqual([
      { min: 1, max: 3, label: 'Flee' },
      { min: 4, max: 6, label: 'Fight' },
    ])
  })

  it('rolls the matching range', () => {
    expect(rollReaction('1-3 Flee,4-6 Fight', 2)).toBe('Flee')
    expect(rollReaction('1-3 Flee,4-6 Fight', 5)).toBe('Fight')
    expect(rollReaction('1 Bribe (50gp),2-5 Fight,6 Fight to the death', 1)).toBe('Bribe (50gp)')
  })

  it('keeps commas inside labels intact', () => {
    const s = '1-2 Special: spend50gp to buy1 Clue; if not, they fight,3 Peaceful,4-6 Fight'
    expect(rollReaction(s, 1)).toContain('if not, they fight')
    expect(rollReaction(s, 3)).toBe('Peaceful')
    expect(rollReaction(s, 6)).toBe('Fight')
  })

  it('fixed reactions return themselves', () => {
    expect(rollReaction('Always Fight to the death', 4)).toBe('Always Fight to the death')
    expect(isAggressive('Fight')).toBe(true)
    expect(isAggressive('Flee')).toBe(false)
  })
})

describe('leveling', () => {
  it('xp roll:6 always succeeds, else must exceed current level', () => {
    expect(xpRollSucceeds(6, 5)).toBe(true)
    expect(xpRollSucceeds(4, 3)).toBe(true)
    expect(xpRollSucceeds(3, 3)).toBe(false) // equal is not higher
    expect(xpRollSucceeds(2, 3)).toBe(false)
  })

  it('old-school XP math', () => {
    expect(minorFoeXp(3, 10, false)).toBe(30)
    expect(minorFoeXp(3, 10, true)).toBe(15) // halved for vermin
    expect(majorFoeXp(6, 8)).toBe(60 + 40)
    expect(oldSchoolLevelCost(5)).toBe(400) // (Tier2+2)*100
  })

  it('slower-advancement costs', () => {
    expect(slowerAdvancementCost(4)).toBe(4)
    expect(tierTrainingCost(2)).toBe(500)
    expect(tierTrainingCost(5)).toBe(5000)
  })
})

describe('dungeon', () => {
  it('has42 shapes (6 starting +36 d66)', () => {
    expect(ALL_SHAPES).toHaveLength(42)
  })

  it('every shape is internally 4-connected (no detached parts)', () => {
    for (const s of ALL_SHAPES) {
      const all = new Set(s.cells.map(([x, y]) => `${x},${y}`))
      const first = [...all][0]!
      const visited = new Set<string>([first])
      const queue = [first]
      while (queue.length > 0) {
        const [x, y] = queue.pop()!.split(',').map(Number) as [number, number]
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n = `${x + dx},${y + dy}`
          if (all.has(n) && !visited.has(n)) {
            visited.add(n)
            queue.push(n)
          }
        }
      }
      expect(visited.size, `shape ${s.key}`).toBe(all.size)
    }
  })

  it('starting rooms are keys1-6 and non-corridor', () => {
    for (let i = 0; i < 100; i++) {
      const s = rollFirstRoom(mulberry32(i))
      expect(s.key).toBeGreaterThanOrEqual(1)
      expect(s.key).toBeLessThanOrEqual(6)
      expect(s.isCorridor).toBe(false)
      expect(s.cells.length).toBeGreaterThan(0)
      expect(s.openings.length).toBeGreaterThan(0)
    }
  })

  it('d66 tiles are keys11-66 with cells and openings', () => {
    for (let i = 0; i < 100; i++) {
      const s = rollTileShape(mulberry32(i + 1000))
      expect(s.key).toBeGreaterThanOrEqual(11)
      expect(s.key).toBeLessThanOrEqual(66)
      expect(s.cells.length).toBeGreaterThan(0)
      expect(s.openings.length).toBeGreaterThan(0)
    }
  })

  it('tile content branches on corridor vs room', () => {
    expect(resolveTileContent(11, false)).toEqual({ kind: 'foe', foeKind: 'boss' })
    expect(resolveTileContent(12, false)).toEqual({ kind: 'dragon-lair' })
    expect(resolveTileContent(12, true)).toEqual({ kind: 'empty' })
    expect(resolveTileContent(10, false)).toEqual({ kind: 'foe', foeKind: 'weird' })
    expect(resolveTileContent(10, true)).toEqual({ kind: 'empty' })
    expect(resolveTileContent(8, true)).toEqual({ kind: 'empty' })
    expect(resolveTileContent(6, false)).toEqual({ kind: 'foe', foeKind: 'vermin' })
    expect(resolveTileContent(2, false)).toEqual({ kind: 'treasure' })
  })

  it('search, wandering and door tables resolve', () => {
    expect(resolveSearch(0)).toBe('wandering')
    expect(resolveSearch(4)).toBe('empty')
    expect(resolveSearch(5)).toBe('found')
    expect(resolveWandering(1)).toBe('vermin')
    expect(resolveWandering(5)).toBe('weird')
    expect(resolveWandering(6)).toBe('boss')
    expect(resolveDoor(2)).toBe('magically-sealed')
    expect(resolveDoor(7)).toBe('unlocked')
    expect(resolveDoor(11)).toBe('trapped')
    expect(resolveDoor(12)).toBe('lever')
  })

  it('final boss:6+ with +1 per prior Major Foe', () => {
    expect(isFinalBoss(seqRng([0.1]), 5)).toBe(true) //1+5=6
    expect(isFinalBoss(seqRng([0.1]), 0)).toBe(false) //1+0=1
    expect(isFinalBoss(seqRng([0.95]), 0)).toBe(true) //6+0=6
  })
})
