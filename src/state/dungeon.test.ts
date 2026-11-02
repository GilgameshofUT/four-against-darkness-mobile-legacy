import { describe, expect, it } from 'vitest'
import { useDungeon } from './dungeon'

const key = (x: number, y: number) => `${x},${y}`

describe('dungeon placement', () => {
  it('produces a fully connected map with no overlapping tiles', () => {
    const s = useDungeon.getState()
    s.reset()
    s.start()
    for (let i = 0; i < 25; i++) useDungeon.getState().rollNext()

    const { tiles } = useDungeon.getState()
    expect(tiles).toHaveLength(26)

    // No two tiles' shape cells may overlap.
    const shapeCells = new Set<string>()
    for (const t of tiles) {
      for (const [cx, cy] of t.shape.cells) {
        const k = key(t.x + cx, t.y + cy)
        expect(shapeCells.has(k), `overlap at ${k}`).toBe(false)
        shapeCells.add(k)
      }
    }

    // Every tile (shapes + connectors) must be one 4-connected component.
    const all = new Set(shapeCells)
    for (const t of tiles) for (const [gx, gy] of t.extraCells ?? []) all.add(key(gx, gy))

    const first = [...all][0]!
    const visited = new Set<string>([first])
    const queue: string[] = [first]
    while (queue.length > 0) {
      const cur = queue.pop()!
      const [x, y] = cur.split(',').map(Number) as [number, number]
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = key(x + dx, y + dy)
        if (all.has(n) && !visited.has(n)) {
          visited.add(n)
          queue.push(n)
        }
      }
    }
    expect(visited.size).toBe(all.size)
  })

  it('every tile after the first has a door on itself and the previous tile', () => {
    const { tiles } = useDungeon.getState()
    expect(tiles.length).toBeGreaterThan(1)
    for (let i = 1; i < tiles.length; i++) {
      expect((tiles[i]!.doors ?? []).length).toBeGreaterThanOrEqual(1)
    }
    for (let i = 0; i < tiles.length - 1; i++) {
      expect((tiles[i]!.doors ?? []).length).toBeGreaterThanOrEqual(1)
    }
  })
})
