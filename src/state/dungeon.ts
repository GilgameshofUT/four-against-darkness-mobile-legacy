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
  /** Grid origin (in cells) of this tile's bounding box. */
  x: number
  y: number
  environment: Environment
  content: TileOutcome
  searched: boolean
  /** Openings on this tile (doors). */
  openings: Dir[]
}

/** Max cells across before wrapping the map to a new row. */
const MAX_COLS = 26
const ROW_GAP = 3

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

/** Bounding box width/height of a shape's cells. */
function bounds(shape: TileShape): { w: number; h: number } {
  let maxX = -Infinity, maxY = -Infinity, minX = Infinity, minY = Infinity
  for (const [cx, cy] of shape.cells) {
    if (cx > maxX) maxX = cx
    if (cy > maxY) maxY = cy
    if (cx < minX) minX = cx
    if (cy < minY) minY = cy
  }
  if (!Number.isFinite(maxX)) return { w: 1, h: 1 }
  return { w: maxX - minX + 1, h: maxY - minY + 1 }
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
        const b = bounds(shape)
        const cb = bounds(current.shape)

        // Snake placement: to the right of the current tile, wrapping to a new row.
        let x = current.x + cb.w + 1 //1-cell corridor gap
        let y = current.y
        if (x + b.w > MAX_COLS) {
          x = 0
          // find lowest row used so far
          y = Math.max(...tiles.map((t) => t.y + bounds(t.shape).h)) + ROW_GAP
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
        }

        const pending =
          content.kind === 'foe'
            ? { foeKind: content.foeKind, tileId: tile.id }
            : null

        set({ tiles: [...tiles, tile], currentId: tile.id, pendingEncounter: pending })
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
