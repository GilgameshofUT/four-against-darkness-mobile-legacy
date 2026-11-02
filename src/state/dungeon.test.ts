import { describe, expect, it } from 'vitest'
import { useDungeon } from './dungeon'
import { delta, opposite } from '../core/tiles'

const key = (y: number, x: number) => `${y},${x}`

describe('dungeon door-choice graph', () => {
  it('start places a first room with open doors and no content', () => {
    const s = useDungeon.getState()
    s.reset()
    s.start()
    const { tiles, currentId } = useDungeon.getState()
    expect(tiles).toHaveLength(1)
    const t = tiles[0]!
    expect(t.id).toBe(currentId)
    expect(t.floors.length).toBeGreaterThan(0)
    expect(t.doors.length).toBeGreaterThan(0)
    expect(t.doors.every((d) => d.connectedTo === null)).toBe(true)
  })

  it('choosing an open door attaches a new tile to that exact door', () => {
    const s = useDungeon.getState()
    s.reset()
    s.start()
    const first = useDungeon.getState().tiles[0]!
    const door = first.doors[0]!

    useDungeon.getState().chooseDoor(first.id, door.y, door.x)

    const st = useDungeon.getState()
    expect(st.tiles).toHaveLength(2)
    const next = st.tiles[1]!
    expect(st.currentId).toBe(next.id)

    // the chosen door is now connected to the new tile
    const updatedFirst = st.tiles[0]!
    const updatedDoor = updatedFirst.doors.find((d) => d.y === door.y && d.x === door.x)!
    expect(updatedDoor.connectedTo).toBe(next.id)

    // the new tile has a door right beyond the chosen door, facing back at it,
    // and that door connects to the first tile
    const [ty, tx] = [door.y + delta(door.dir)[0], door.x + delta(door.dir)[1]]
    const link = next.doors.find((d) => d.y === ty && d.x === tx)
    expect(link, 'new tile must have a door at the target cell').toBeDefined()
    expect(link!.dir).toBe(opposite(door.dir))
    expect(link!.connectedTo).toBe(first.id)
  })

  it('new tiles never overlap existing floors', () => {
    const s = useDungeon.getState()
    s.reset()
    s.start()
    for (let step = 0; step < 20; step++) {
      const st = useDungeon.getState()
      const cur = st.tiles.find((t) => t.id === st.currentId)!
      const open = cur.doors.filter((d) => !d.connectedTo)
      if (open.length === 0) break
      const door = open[0]!
      st.chooseDoor(cur.id, door.y, door.x)
    }

    const { tiles } = useDungeon.getState()
    expect(tiles.length).toBeGreaterThan(1)
    const seen = new Set<string>()
    for (const t of tiles) {
      for (const [y, x] of t.floors) {
        expect(seen.has(key(y, x)), `overlap at ${key(y, x)}`).toBe(false)
        seen.add(key(y, x))
      }
    }
  })

  it('choosing a connected door moves back and reconnects the graph', () => {
    const s = useDungeon.getState()
    s.reset()
    s.start()
    const first = useDungeon.getState().tiles[0]!
    const door = first.doors[0]!
    useDungeon.getState().chooseDoor(first.id, door.y, door.x)
    const second = useDungeon.getState().tiles[1]!
    // walk back through the new tile's link door
    const link = second.doors.find((d) => d.connectedTo === first.id)!
    useDungeon.getState().chooseDoor(second.id, link.y, link.x)
    expect(useDungeon.getState().currentId).toBe(first.id)
  })
})
