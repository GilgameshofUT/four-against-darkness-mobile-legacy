import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  rollFirstRoom, rollTileShape, rollTileContent, rollSearch,
  type Dir, type SearchOutcome, type TileOutcome, type TileShape,
} from '../core/dungeon'

export type Environment = 'dungeon' | 'caverns' | 'fungal'

export interface Tile {
  id: string
  shape: TileShape
  /** Grid origin (in cells) of this tile's shape cells. */
  x: number
  y: number
  environment: Environment
  content: TileOutcome
  searched: boolean
  /** Openings on this tile (doors). */
  openings: Dir[]
  /** Connector-corridor cells in grid coords, joining this tile to the previous one. */
  extraCells?: Array<[number, number]>
  /** Door markers in grid coords (exit/entry of the connector). */
  doors?: Array<[number, number]>
}

/** Max grid columns before stacking the next tile below instead of right. */
const MAX_COLS = 26

interface DungeonState {
  tiles: Tile[]
  currentId: string | null
  environment: Environment
  majorFoesMet: number
  finalBossFound: boolean
  started: boolean
  /** Pending encounter from the current tile (foe kind), consumed by combat. */
  pendingEncounter: { foeKind: 'vermin' | 'minion' | 'weird' | 'boss'; tileId: string } | null
  start: () => void
  rollNext: () => TileOutcome | null
  searchCurrent: () => SearchOutcome | null
  moveCurrent: (id: string) => void
  setEnvironment: (env: Environment) => void
  clearEncounter: () => void
  noteMajorFoe: () => void
  reset: () => void
}

let n = 0
const newId = () => `tile-${Date.now()}-${n++}`

/** Min/max extents of a shape's cells (shapes may use negative coords). */
function shapeExtents(shape: TileShape): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [cx, cy] of shape.cells) {
    if (cx < minX) minX = cx
    if (cx > maxX) maxX = cx
    if (cy < minY) minY = cy
    if (cy > maxY) maxY = cy
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  return { minX, maxX, minY, maxY }
}

type Cell = [number, number]
const cellKey = (x: number, y: number) => `${x},${y}`

/** Median cell of a list along a projection (picks a middle exit/entry cell). */
function medianBy(cells: Array<[number, number]>, by: (c: [number, number]) => number): Cell {
  const sorted = [...cells].sort((a, b) => by(a) - by(b))
  const m = sorted[Math.floor(sorted.length / 2)]
  return m ? [m[0], m[1]] : [0, 0]
}

/** L-shaped corridor from E to N, excluding both endpoints. */
function corridorCells(E: Cell, N: Cell): Cell[] {
  const [ex, ey] = E
  const [nx, ny] = N
  const cells: Cell[] = []
  const stepX = nx > ex ? 1 : -1
  for (let x = ex + stepX; x !== nx; x += stepX) cells.push([x, ey])
  const stepY = ny > ey ? 1 : -1
  for (let y = ey + stepY; y !== ny; y += stepY) cells.push([nx, y])
  return cells
}

export const useDungeon = create<DungeonState>()(
  persist(
    (set, get) => ({
      tiles: [],
      currentId: null,
      environment: 'dungeon',
      majorFoesMet: 0,
      finalBossFound: false,
      started: false,
      pendingEncounter: null,

      start: () => {
        const shape = rollFirstRoom()
        const tile: Tile = {
          id: newId(),
          shape,
          x: 0,
          y: 0,
          environment: get().environment,
          content: { kind: 'empty' }, // first room has no content (p.104)
          searched: false,
          openings: shape.openings,
        }
        set({ tiles: [tile], currentId: tile.id, started: true })
      },

      rollNext: () => {
        const { tiles, currentId, environment } = get()
        const current = tiles.find((t) => t.id === currentId)
        if (!current) return null

        const shape = rollTileShape()
        const ce = shapeExtents(current.shape)
        const ne = shapeExtents(shape)

        // Grid cells already drawn (all tiles incl. their connectors).
        const occupied = new Set<string>()
        for (const t of tiles) {
          for (const [cx, cy] of t.shape.cells) occupied.add(cellKey(t.x + cx, t.y + cy))
          for (const [gx, gy] of t.extraCells ?? []) occupied.add(cellKey(gx, gy))
        }
        const overlaps = (sx: number, sy: number) => {
          for (const [cx, cy] of shape.cells) {
            if (occupied.has(cellKey(sx + cx, sy + cy))) return true
          }
          return false
        }

        // Same-row placement: right of the current tile with a1-cell gap.
        let x = current.x + ce.maxX + 2 - ne.minX
        let y = current.y
        let below = false
        if (x + ne.maxX > MAX_COLS || overlaps(x, y)) {
          // Stack below the current tile instead: rows only grow downward,
          // so everything previously placed is above and cannot overlap.
          below = true
          x = Math.max(current.x, -ne.minX)
          y = current.y + ce.maxY + 2 - ne.minY
        }

        // Exit on the current tile: rightmost column (same row) or bottom row (below).
        const exitLocal = below
          ? medianBy(current.shape.cells.filter(([, cy]) => cy === ce.maxY), ([cx]) => cx)
          : medianBy(current.shape.cells.filter(([cx]) => cx === ce.maxX), ([, cy]) => cy)
        const E: Cell = [current.x + exitLocal[0], current.y + exitLocal[1]]

        // Entry on the new tile: leftmost column (same row) or top row (below).
        const entryLocal = below
          ? medianBy(shape.cells.filter(([, cy]) => cy === ne.minY), ([cx]) => cx)
          : medianBy(shape.cells.filter(([cx]) => cx === ne.minX), ([, cy]) => cy)
        const N: Cell = [x + entryLocal[0], y + entryLocal[1]]

        // Carve the connector; skip cells already drawn by older tiles
        // (the path stays walkable through them).
        const extraCells: Cell[] = []
        for (const [gx, gy] of corridorCells(E, N)) {
          if (!occupied.has(cellKey(gx, gy))) extraCells.push([gx, gy])
        }

        const content = rollTileContent(undefined, shape.isCorridor)
        const tile: Tile = {
          id: newId(),
          shape,
          x,
          y,
          environment,
          content,
          searched: false,
          openings: shape.openings,
          extraCells,
          doors: [N],
        }

        const pending =
          content.kind === 'foe'
            ? { foeKind: content.foeKind, tileId: tile.id }
            : null

        set({
          tiles: tiles
            .map((t) => (t.id === current.id ? { ...t, doors: [...(t.doors ?? []), E] } : t))
            .concat(tile),
          currentId: tile.id,
          pendingEncounter: pending,
        })
        return content
      },

      searchCurrent: () => {
        const { tiles, currentId } = get()
        const t = tiles.find((x) => x.id === currentId)
        if (!t || t.searched) return null
        const corridor = t.shape.isCorridor
        const out = rollSearch(undefined, corridor)
        set({ tiles: tiles.map((x) => (x.id === t.id ? { ...x, searched: true } : x)) })
        return out
      },

      moveCurrent: (id) => set({ currentId: id }),
      setEnvironment: (environment) => set({ environment }),

      clearEncounter: () => set({ pendingEncounter: null }),
      noteMajorFoe: () =>
        set((s) => ({ majorFoesMet: s.majorFoesMet + 1 })),

      reset: () =>
        set({ tiles: [], currentId: null, started: false, majorFoesMet: 0, finalBossFound: false, pendingEncounter: null }),
    }),
    { name: '4ad-dungeon' },
  ),
)
