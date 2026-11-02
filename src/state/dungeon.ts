import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseTile, rotateTile, opposite, delta, type Dir, type TileSpec } from '../core/tiles'
import { ALL_TILE_SPECS, D66_TILES, STARTING_TILES } from '../core/tileshapes'
import { resolveTileContent, resolveSearch, type SearchOutcome, type TileOutcome } from '../core/dungeon'
import { rollD66, rollDie } from '../core/dice'

export type Environment = 'dungeon' | 'caverns' | 'fungal'

export interface DoorRef {
  y: number
  x: number
  dir: Dir
  /** Tile this door opens into, or null = leads into the unexplored dark. */
  connectedTo: string | null
}

export interface PlacedTile {
  id: string
  specKey: number
  corridor: boolean
  rotation: number
  environment: Environment
  content: TileOutcome
  searched: boolean
  floors: Array<[number, number]>
  doors: DoorRef[]
}

const SPEC_BY_KEY = new Map<number, TileSpec>(ALL_TILE_SPECS.map((s) => [s.key, s]))
const cellKey = (y: number, x: number) => `${y},${x}`

interface DungeonState {
  tiles: PlacedTile[]
  currentId: string | null
  environment: Environment
  majorFoesMet: number
  started: boolean
  /** Encounter pending from the current tile, consumed by combat. */
  pendingEncounter: { foeKind: 'vermin' | 'minion' | 'weird' | 'boss'; tileId: string } | null
  /** Message shown to guide the player (blocked door, wandering monsters…). */
  lastMessage: string | null

  start: () => void
  /** Walk through a connected door, or generate a new tile through an open one. */
  chooseDoor: (tileId: string, y: number, x: number) => void
  openDoors: (tileId: string) => DoorRef[]
  connectedDoors: (tileId: string) => DoorRef[]
  searchCurrent: () => SearchOutcome | null
  setEnvironment: (env: Environment) => void
  clearEncounter: () => void
  clearMessage: () => void
  noteMajorFoe: () => void
  reset: () => void
}

let n = 0
const newId = () => `tile-${n++}`

/** All occupied floor cells across every placed tile. */
function occupiedSet(tiles: PlacedTile[]): Set<string> {
  const s = new Set<string>()
  for (const t of tiles) for (const [y, x] of t.floors) s.add(cellKey(y, x))
  return s
}

/**
 * Try to place `spec` so one of its doors lands on `target` facing back at it.
 * Rotates the tile as needed; returns null if every orientation overlaps.
 */
function tryPlace(
  spec: TileSpec,
  target: { y: number; x: number; dir: Dir },
  occupied: Set<string>,
): { rotation: number; floors: Array<[number, number]>; doors: Array<{ y: number; x: number; dir: Dir }>; door: { y: number; x: number; dir: Dir } } | null {
  for (let r = 0; r < 4; r++) {
    const rot = rotateTile(parseTile(spec), r)
    for (const nd of rot.doors) {
      if (opposite(nd.dir) !== target.dir) continue
      const oy = target.y - nd.y
      const ox = target.x - nd.x
      let ok = true
      for (const [fy, fx] of rot.floors) {
        if (occupied.has(cellKey(oy + fy, ox + fx))) {
          ok = false
          break
        }
      }
      if (ok) {
        return {
          rotation: r,
          floors: rot.floors.map(([y, x]) => [oy + y, ox + x] as [number, number]),
          doors: rot.doors.map((d) => ({ y: oy + d.y, x: ox + d.x, dir: d.dir })),
          door: { y: oy + nd.y, x: ox + nd.x, dir: nd.dir },
        }
      }
    }
  }
  return null
}

export const useDungeon = create<DungeonState>()(
  persist(
    (set, get) => ({
      tiles: [],
      currentId: null,
      environment: 'dungeon',
      majorFoesMet: 0,
      started: false,
      pendingEncounter: null,
      lastMessage: null,

      start: () => {
        const spec = STARTING_TILES[rollDie(Math.random, STARTING_TILES.length) - 1]!
        const parsed = parseTile(spec)
        const tile: PlacedTile = {
          id: newId(),
          specKey: spec.key,
          corridor: spec.corridor,
          rotation: 0,
          environment: get().environment,
          content: { kind: 'empty' }, // first room has no content (p.104)
          searched: false,
          floors: parsed.floors.map(([y, x]) => [y, x] as [number, number]),
          doors: parsed.doors.map((d) => ({ y: d.y, x: d.x, dir: d.dir, connectedTo: null })),
        }
        set({ tiles: [tile], currentId: tile.id, started: true, lastMessage: null })
      },

      openDoors: (tileId) => get().tiles.find((t) => t.id === tileId)?.doors.filter((d) => !d.connectedTo) ?? [],
      connectedDoors: (tileId) => get().tiles.find((t) => t.id === tileId)?.doors.filter((d) => d.connectedTo) ?? [],

      chooseDoor: (tileId, y, x) => {
        const { tiles, environment } = get()
        const tile = tiles.find((t) => t.id === tileId)
        if (!tile) return
        const door = tile.doors.find((d) => d.y === y && d.x === x)
        if (!door) return

        // --- Walk back through a known door ---
        if (door.connectedTo) {
          const dest = door.connectedTo
          // Retracing your steps: d6 →1, Wandering Monsters attack (p.104).
          const wander = rollDie(Math.random, 6) === 1
          set({
            currentId: dest,
            lastMessage: wander ? 'As you retrace your steps, Wandering Monsters attack!' : null,
            pendingEncounter: wander ? { foeKind: rollWanderingKind(), tileId: dest } : null,
          })
          return
        }

        // --- Expand into the dark through an open door ---
        const spec = specFromD66()
        const target = { y: door.y + delta(door.dir)[0], x: door.x + delta(door.dir)[1], dir: door.dir }
        const placed = tryPlace(spec, target, occupiedSet(tiles))
        if (!placed) {
          set({ lastMessage: 'No room to expand that way — choose another door.' })
          return
        }

        const content = resolveTileContent(rollDie(Math.random, 6) + rollDie(Math.random, 6), spec.corridor)
        const id = newId()
        const newTile: PlacedTile = {
          id,
          specKey: spec.key,
          corridor: spec.corridor,
          rotation: placed.rotation,
          environment,
          content,
          searched: false,
          floors: placed.floors,
          doors: placed.doors.map((d) => ({
            ...d,
            connectedTo: d.y === placed.door.y && d.x === placed.door.x ? tile.id : null,
          })),
        }

        const nextTiles = tiles
          .map((t) =>
            t.id === tile.id
              ? { ...t, doors: t.doors.map((d) => (d.y === y && d.x === x ? { ...d, connectedTo: id } : d)) }
              : t,
          )
          .concat(newTile)

        const pending =
          content.kind === 'foe' ? { foeKind: content.foeKind, tileId: id } : null

        set({
          tiles: nextTiles,
          currentId: id,
          pendingEncounter: pending,
          lastMessage: null,
        })
      },

      searchCurrent: () => {
        const { tiles, currentId } = get()
        const t = tiles.find((x) => x.id === currentId)
        if (!t || t.searched) return null
        const out = resolveSearch(rollDie(Math.random, 6) + (t.corridor ? -1 : 0))
        set({ tiles: tiles.map((x) => (x.id === t.id ? { ...x, searched: true } : x)) })
        if (out === 'wandering') {
          set({ pendingEncounter: { foeKind: rollWanderingKind(), tileId: t.id } })
        }
        return out
      },

      setEnvironment: (environment) => set({ environment }),
      clearEncounter: () => set({ pendingEncounter: null }),
      clearMessage: () => set({ lastMessage: null }),
      noteMajorFoe: () => set((s) => ({ majorFoesMet: s.majorFoesMet + 1 })),

      reset: () =>
        set({
          tiles: [],
          currentId: null,
          started: false,
          majorFoesMet: 0,
          pendingEncounter: null,
          lastMessage: null,
        }),
    }),
    {
      name: '4ad-dungeon',
      version: 1,
      // Old builds persisted a different tile shape; drop stale maps on load.
      migrate: (persisted) => {
        const p = persisted as Partial<DungeonState> | undefined
        const malformed =
          !p ||
          !Array.isArray(p.tiles) ||
          (p.tiles.length > 0 && !Array.isArray((p.tiles[0] as { floors?: unknown }).floors))
        if (malformed) {
          return {
            tiles: [],
            currentId: null,
            environment: 'dungeon',
            majorFoesMet: 0,
            started: false,
            pendingEncounter: null,
            lastMessage: null,
          }
        }
        return p as DungeonState
      },
    },
  ),
)

/** d66 → tile spec (keys11–66). */
function specFromD66(): TileSpec {
  const key = 11 + (rollD66(Math.random) - 11)
  return SPEC_BY_KEY.get(key) ?? D66_TILES[0]!
}

/** Wandering Monsters table (d6):1-2 vermin,3-4 minion,5 weird,6 boss. */
function rollWanderingKind(): 'vermin' | 'minion' | 'weird' | 'boss' {
  const d = rollDie(Math.random, 6)
  if (d <= 2) return 'vermin'
  if (d <= 4) return 'minion'
  if (d === 5) return 'weird'
  return 'boss'
}
