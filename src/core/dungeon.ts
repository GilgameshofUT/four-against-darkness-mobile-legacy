import { rollD66, rollDie, rollNotation, type Rng, defaultRng } from './dice'

/* ============================================================
   Dungeon generation & exploration (book pp.104–109,152).
   Tile shapes approximate the book's d66 plates as cell sets.
   ============================================================ */

export type Dir = 'N' | 'S' | 'E' | 'W'

export interface TileShape {
  /**1-6 = starting room (roll d6);11-66 = d66 tile shape. */
  key: number
  isCorridor: boolean
  /** Cells relative to (0,0). Corridors are1-wide. */
  cells: Array<[number, number]>
  /** Sides where this tile can connect to a neighbour (doors/openings). */
  openings: Dir[]
}

/* ---- shape helpers ---- */
const rect = (x: number, y: number, w: number, h: number): Array<[number, number]> => {
  const out: Array<[number, number]> = []
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j])
  return out
}
const hCorridor = (len: number): Array<[number, number]> => rect(0, 0, len, 1)

/** Build a shape from cell groups (deduped: groups may overlap, e.g. crosses). */
const shape = (key: number, isCorridor: boolean, openings: Dir[], ...groups: Array<Array<[number, number]>>): TileShape => {
  const seen = new Set<string>()
  const cells: Array<[number, number]> = []
  for (const [cx, cy] of groups.flat()) {
    const k = `${cx},${cy}`
    if (!seen.has(k)) {
      seen.add(k)
      cells.push([cx, cy])
    }
  }
  return { key, isCorridor, cells, openings }
}

/* ---- Starting rooms (roll d6) ---- */
const STARTING: TileShape[] = [
  shape(1, false, ['N', 'S'], rect(0, 0, 5, 3)),
  shape(2, false, ['N', 'S', 'E'], rect(0, 0, 4, 4), rect(4, 1, 1, 2)),
  shape(3, false, ['N', 'W', 'E'], rect(0, 0, 4, 3), rect(1, 3, 2, 2)),
  shape(4, false, ['N', 'S', 'E', 'W'], rect(0, 0, 4, 4), rect(4, 0, 2, 2)),
  shape(5, false, ['N', 'S'],
    [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1],
     [1, 2], [2, 2], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [3, 4], [1, 5], [2, 5]]),
  shape(6, false, ['N', 'W', 'E'], rect(0, 0, 6, 3), rect(2, 3, 2, 2)),
]

/* ---- d66 tiles (11-66) ----
   Corridors (C in the book) are1-wide strips; rooms are2+ wide. */
const D66: TileShape[] = [
  shape(11, true, ['W', 'E'], hCorridor(4)),
  shape(12, true, ['W', 'E'], hCorridor(3)),
  shape(13, true, ['W', 'S', 'E'], hCorridor(3), rect(2, 1, 1, 3)),
  shape(14, true, ['W', 'E', 'N', 'S'], rect(0, 0, 4, 1), rect(1, -2, 1, 2), rect(2, 1, 1, 2)),
  shape(15, false, ['W', 'S'], rect(0, 0, 4, 3), rect(3, 3, 2, 2)),
  shape(16, false, ['W', 'E', 'S'], rect(0, 0, 3, 4), rect(3, 2, 3, 1)),

  shape(21, false, ['N', 'S'], rect(0, 0, 4, 4)),
  shape(22, false, ['W', 'E', 'S'], rect(0, 0, 5, 4), rect(5, 2, 2, 1)),
  shape(23, false, ['W', 'E'], rect(0, 0, 3, 4), rect(3, 1, 4, 2)),
  shape(24, false, ['N', 'S', 'E', 'W'], rect(1, 0, 3, 3), rect(0, 1, 1, 1), rect(4, 1, 1, 1), rect(2, -1, 1, 1), rect(2, 3, 1, 1)),
  shape(25, false, ['W', 'E'], rect(0, 0, 3, 4), rect(3, 1, 4, 2)),
  shape(26, false, ['W', 'E'], rect(0, 0, 4, 2), rect(0, 2, 2, 1)),

  shape(31, false, ['W', 'S', 'E'], rect(0, 0, 4, 3), rect(2, 3, 3, 2)),
  shape(32, true, ['W', 'E', 'N'], rect(0, 0, 4, 1), rect(3, -2, 1, 2)),
  shape(33, true, ['W', 'E'], hCorridor(5)),
  shape(34, false, ['W', 'E', 'N'], rect(0, 1, 2, 3), rect(2, 0, 3, 5), rect(5, 2, 2, 1)),
  shape(35, false, ['W', 'S'], rect(0, 0, 4, 4), rect(4, 3, 2, 2)),
  shape(36, false, ['W', 'E', 'S'], rect(0, 0, 5, 3), rect(1, 3, 3, 2)),

  shape(41, false, ['W', 'E', 'S'], rect(0, 0, 5, 3), rect(5, 1, 2, 2)),
  shape(42, false, ['W', 'N'], rect(0, 0, 3, 3), rect(3, -1, 3, 2)),
  shape(43, false, ['W', 'E'], rect(0, 0, 4, 4), rect(4, 1, 3, 2)),
  shape(44, false, ['N', 'S', 'E'], rect(0, 0, 4, 3), rect(4, 0, 2, 2), rect(1, 3, 2, 2)),
  shape(45, true, ['N', 'S', 'E', 'W'], rect(0, 0, 1, 5), rect(-2, 2, 5, 1)),
  shape(46, false, ['W', 'E', 'S'], rect(0, 0, 4, 4), rect(4, 2, 3, 1)),

  shape(51, true, ['W', 'S'], rect(0, 0, 3, 1), rect(1, 1, 1, 3)),
  shape(52, false, ['N', 'S', 'E', 'W'], rect(0, 0, 4, 4), rect(4, 1, 3, 2), rect(1, -2, 2, 2)),
  shape(53, true, ['W', 'E', 'S'], rect(0, 0, 4, 1), rect(2, 1, 1, 2)),
  shape(54, false, ['W', 'E'], rect(0, 0, 4, 4), rect(4, 1, 3, 2)),
  shape(55, true, ['W', 'E', 'N'], rect(0, 0, 4, 1), rect(0, -2, 1, 2)),
  shape(56, false, ['N', 'E', 'S'], rect(0, 0, 4, 4), rect(4, 0, 2, 3)),

  shape(61, false, ['W', 'E', 'N', 'S'], rect(0, 0, 6, 3)),
  shape(62, true, ['N', 'S', 'E', 'W'], rect(0, 0, 1, 5), rect(-2, 2, 5, 1)),
  shape(63, true, ['W', 'E'], hCorridor(5)),
  shape(64, false, ['W', 'E'], rect(0, 0, 3, 4), rect(3, 2, 4, 1)),
  shape(65, true, ['W', 'E', 'N'], rect(0, 0, 3, 1), rect(2, -2, 1, 2)),
  shape(66, false, ['W', 'S'], rect(0, 0, 3, 4), rect(-2, 1, 2, 1)),
]

export const ALL_SHAPES: TileShape[] = [...STARTING, ...D66]

/** Roll1d6 for the first room (p.104). */
export function rollFirstRoom(rng: Rng = defaultRng): TileShape {
  const s = STARTING[rollDie(rng, 6) - 1]
  if (!s) throw new Error('No starting room')
  return s
}

/** Roll d66 for a new tile shape (p.149). */
export function rollTileShape(rng: Rng = defaultRng): TileShape {
  const key = rollD66(rng)
  const found = D66.find((s) => s.key === key)
  if (!found) throw new Error(`No tile shape for d66 ${key}`)
  return found
}

/* ---- Tile Content (2d6, p.152) ---- */
export type TileOutcome =
  | { kind: 'treasure' }
  | { kind: 'treasure-trap' }
  | { kind: 'empty' } // searchable
  | { kind: 'special-event' }
  | { kind: 'special-feature' }
  | { kind: 'secret-passage' }
  | { kind: 'foe'; foeKind: 'vermin' | 'minion' | 'weird' | 'boss' }
  | { kind: 'dragon-lair' }

/** Roll2d6 on the Tile Content Table and branch on corridor/room. */
export function resolveTileContent(d2d6: number, isCorridor: boolean): TileOutcome {
  switch (d2d6) {
    case 2: return { kind: 'treasure' }
    case 3: return { kind: 'treasure-trap' }
    case 4: return isCorridor ? { kind: 'empty' } : { kind: 'special-event' }
    case 5: return { kind: 'special-feature' } // Empty + Special Feature OR Secret Passage (p.152)
    case 6: return { kind: 'foe', foeKind: 'vermin' }
    case 7: return { kind: 'foe', foeKind: 'minion' }
    case 8: return isCorridor ? { kind: 'empty' } : { kind: 'foe', foeKind: 'minion' }
    case 9: return { kind: 'empty' } // or spend2 Clues → secret passage
    case 10: return isCorridor ? { kind: 'empty' } : { kind: 'foe', foeKind: 'weird' }
    case 11: return { kind: 'foe', foeKind: 'boss' }
    case 12: return isCorridor ? { kind: 'empty' } : { kind: 'dragon-lair' }
    default: return { kind: 'empty' }
  }
}

export function rollTileContent(rng: Rng = defaultRng, isCorridor: boolean): TileOutcome {
  return resolveTileContent(rollNotation(rng, '2d6'), isCorridor)
}

/* ---- Search (d6, p.107) ---- */
export type SearchOutcome = 'wandering' | 'empty' | 'found'
export function resolveSearch(d6: number): SearchOutcome {
  if (d6 <= 1) return 'wandering'
  if (d6 <= 4) return 'empty'
  return 'found'
}
export function rollSearch(rng: Rng = defaultRng, inCorridor = false): SearchOutcome {
  const mod = inCorridor ? -1 : 0
  return resolveSearch(rollDie(rng, 6) + mod)
}

/* ---- Wandering Monsters (d6, p.107) ---- */
export function resolveWandering(d6: number): 'vermin' | 'minion' | 'weird' | 'boss' {
  if (d6 <= 2) return 'vermin'
  if (d6 <= 4) return 'minion'
  if (d6 === 5) return 'weird'
  return 'boss'
}
export function rollWandering(rng: Rng = defaultRng): 'vermin' | 'minion' | 'weird' | 'boss' {
  return resolveWandering(rollDie(rng, 6))
}

/* ---- Door (2d6, p.109) ---- */
export type DoorOutcome =
  | 'magically-sealed' | 'iron' | 'illusionary' | 'locked' | 'unlocked' | 'trapped' | 'lever'
export function resolveDoor(d2d6: number): DoorOutcome {
  switch (d2d6) {
    case 2: return 'magically-sealed'
    case 3: return 'iron'
    case 4: return 'illusionary'
    case 5:
    case 6: return 'locked'
    case 7:
    case 8:
    case 9:
    case 10: return 'unlocked'
    case 11: return 'trapped'
    case 12: return 'lever'
    default: return 'unlocked'
  }
}
export function rollDoor(rng: Rng = defaultRng): DoorOutcome {
  return resolveDoor(rollNotation(rng, '2d6'))
}

/* ---- Final Boss (d6 +1 per prior Major Foe, p.105) ---- */
export function isFinalBoss(rng: Rng, priorMajorFoes: number): boolean {
  return rollDie(rng, 6) + priorMajorFoes >= 6
}
