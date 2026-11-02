import { describe, expect, it } from 'vitest'
import { ALL_TILE_SPECS } from './tileshapes'
import { parseTile } from './tiles'

describe('transcribed tile shapes', () => {
  it('has all 42 tiles (6 starting +36 d66)', () => {
    expect(ALL_TILE_SPECS).toHaveLength(42)
    const keys = ALL_TILE_SPECS.map((s) => s.key)
    expect(new Set(keys).size).toBe(42)
    for (let i = 1; i <= 6; i++) expect(keys).toContain(i)
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) expect(keys).toContain(a * 10 + b)
  })

  it('every tile is internally 4-connected (no detached cells)', () => {
    for (const spec of ALL_TILE_SPECS) {
      const t = parseTile(spec)
      expect(t.floors.length, `tile ${spec.key}`).toBeGreaterThan(0)
      const all = new Set(t.floors.map(([y, x]) => `${y},${x}`))
      const first = [...all][0]!
      const visited = new Set<string>([first])
      const queue = [first]
      while (queue.length > 0) {
        const [y, x] = queue.pop()!.split(',').map(Number) as [number, number]
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n = `${y + dy},${x + dx}`
          if (all.has(n) && !visited.has(n)) {
            visited.add(n)
            queue.push(n)
          }
        }
      }
      expect(visited.size, `tile ${spec.key} disconnected (${visited.size}/${all.size})`).toBe(all.size)
    }
  })

  it('every tile has at least one door (so it can attach to the map)', () => {
    for (const spec of ALL_TILE_SPECS) {
      const t = parseTile(spec)
      expect(t.doors.length, `tile ${spec.key} has no door`).toBeGreaterThan(0)
    }
  })

  it('every door faces outward from a floor cell', () => {
    for (const spec of ALL_TILE_SPECS) {
      const t = parseTile(spec)
      for (const d of t.doors) {
        // a door cell itself is a floor cell
        expect(t.floors.some(([y, x]) => y === d.y && x === d.x), `tile ${spec.key} door not on floor`).toBe(true)
      }
    }
  })
})
