import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseTile, rotateTile, opposite, delta, type Dir, type TileSpec } from '../core/tiles'
import { ALL_TILE_SPECS, D66_TILES, STARTING_TILES } from '../core/tileshapes'
import { resolveTileContent, resolveSearch, type SearchOutcome, type TileOutcome } from '../core/dungeon'
import { rollD66, rollDie } from '../core/dice'
import { useParty } from './party'

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
  contentRoll2d6?: number
  searched: boolean
  featureResolved?: boolean
  floors: Array<[number, number]>
  doors: DoorRef[]
}

const SPEC_BY_KEY = new Map<number, TileSpec>(ALL_TILE_SPECS.map((s) => [s.key, s]))
const cellKey = (y: number, x: number) => `${y},${x}`

export interface PendingEncounterInfo {
  foeKind: 'vermin' | 'minion' | 'weird' | 'boss'
  tileId: string
  inCorridor: boolean
  wandering?: boolean
  isFinalBoss?: boolean
  bossRollInfo?: string
}

interface DungeonState {
  tiles: PlacedTile[]
  /** Pre-calculated dungeon rooms waiting in Fog of War to be revealed door-by-door. */
  hiddenTiles: PlacedTile[]
  currentId: string | null
  environment: Environment
  majorFoesMet: number
  finalBossMet: boolean
  finalBossSlain: boolean
  escapedAlive: boolean
  fountainUsed: boolean
  started: boolean
  /** Encounter pending from the current tile, consumed by combat. */
  pendingEncounter: PendingEncounterInfo | null
  /** Message shown to guide the player (blocked door, wandering monsters…). */
  lastMessage: string | null

  start: () => void
  /** Walk through a connected door, or generate a new tile through an open one. */
  chooseDoor: (tileId: string, y: number, x: number) => void
  openDoors: (tileId: string) => DoorRef[]
  connectedDoors: (tileId: string) => DoorRef[]
  searchCurrent: (bonus?: number) => SearchOutcome | null
  markCurrentFeatureResolved: () => void
  setEnvironment: (env: Environment) => void
  clearEncounter: () => void
  clearMessage: () => void
  noteMajorFoe: () => void
  noteFinalBossSlain: () => void
  exitDungeon: () => { ok: boolean; message: string }
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
): {
  rotation: number
  floors: Array<[number, number]>
  doors: Array<{ y: number; x: number; dir: Dir }>
  door: { y: number; x: number; dir: Dir }
} | null {
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

/** Tick down lit torches by 1 room when moving to a new room (Book p. 83: 6 rooms per torch). */
function tickPartyTorches() {
  const partySt = useParty.getState()
  for (const p of partySt.party) {
    if ((p.mainHand === 'torch' || p.offHand === 'torch') && p.torchRoomsLeft > 0) {
      const next = p.torchRoomsLeft - 1
      partySt.updateHero(p.id, {
        torchRoomsLeft: next,
        ...(next <= 0
          ? {
              mainHand: p.mainHand === 'torch' ? null : p.mainHand,
              offHand: p.offHand === 'torch' ? null : p.offHand,
            }
          : {}),
      })
    }
  }
}

/**
 * Pre-calculate a connected dungeon complex of ~14 rooms & corridors around `entrance`,
 * stocked per the 4AD 2d6 Tile Content Table, waiting in Fog of War to be revealed step-by-step.
 */
function buildPrecalculatedDungeon(entrance: PlacedTile, env: Environment): PlacedTile[] {
  const hidden: PlacedTile[] = []
  const allPlaced: PlacedTile[] = [entrance]
  const occ = occupiedSet(allPlaced)

  // Frontier of open doors to expand from
  const frontier: Array<{ fromTileId: string; door: DoorRef }> = entrance.doors.map((d) => ({
    fromTileId: entrance.id,
    door: d,
  }))

  const multiDoorSpecs = D66_TILES.filter((s) => parseTile(s).doors.length >= 2)
  const targetCount = 14

  while (hidden.length < targetCount && frontier.length > 0) {
    const nextEdge = frontier.shift()!
    const { door } = nextEdge
    const target = {
      y: door.y + delta(door.dir)[0],
      x: door.x + delta(door.dir)[1],
      dir: door.dir,
    }
    if (occ.has(cellKey(target.y, target.x))) continue

    const pool = hidden.length < 10 ? multiDoorSpecs : D66_TILES
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    let chosenSpec: TileSpec | null = null
    let placed: ReturnType<typeof tryPlace> = null
    for (const cand of shuffled) {
      const p = tryPlace(cand, target, occ)
      if (p) {
        chosenSpec = cand
        placed = p
        break
      }
    }
    if (!chosenSpec || !placed) continue

    const d2d6 = rollDie(Math.random, 6) + rollDie(Math.random, 6)
    const content = resolveTileContent(d2d6, chosenSpec.corridor)
    const id = newId()
    const newTile: PlacedTile = {
      id,
      specKey: chosenSpec.key,
      corridor: chosenSpec.corridor,
      rotation: placed.rotation,
      environment: env,
      content,
      contentRoll2d6: d2d6,
      searched: false,
      floors: placed.floors,
      doors: placed.doors.map((d) => ({
        ...d,
        connectedTo: null, // connected dynamically when the player opens the door
      })),
    }

    for (const [fy, fx] of newTile.floors) occ.add(cellKey(fy, fx))
    hidden.push(newTile)
    allPlaced.push(newTile)

    for (const d of newTile.doors) {
      if (d.y === placed.door.y && d.x === placed.door.x) continue
      frontier.push({ fromTileId: id, door: d })
    }
  }

  return hidden
}

export const useDungeon = create<DungeonState>()(
  persist(
    (set, get) => ({
      tiles: [],
      hiddenTiles: [],
      currentId: null,
      environment: 'dungeon',
      majorFoesMet: 0,
      finalBossMet: false,
      finalBossSlain: false,
      escapedAlive: false,
      fountainUsed: false,
      started: false,
      pendingEncounter: null,
      lastMessage: null,

      start: () => {
        const env = get().environment
        const spec = STARTING_TILES[rollDie(Math.random, STARTING_TILES.length) - 1]!
        const parsed = parseTile(spec)
        const tile: PlacedTile = {
          id: newId(),
          specKey: spec.key,
          corridor: spec.corridor,
          rotation: 0,
          environment: env,
          content: { kind: 'empty' }, // first room has no content (p.104)
          searched: false,
          floors: parsed.floors.map(([y, x]) => [y, x] as [number, number]),
          doors: parsed.doors.map((d) => ({ y: d.y, x: d.x, dir: d.dir, connectedTo: null })),
        }
        const hiddenTiles = buildPrecalculatedDungeon(tile, env)
        set({
          tiles: [tile],
          hiddenTiles,
          currentId: tile.id,
          started: true,
          majorFoesMet: 0,
          finalBossMet: false,
          finalBossSlain: false,
          escapedAlive: false,
          fountainUsed: false,
          pendingEncounter: null,
          lastMessage: null,
        })
      },

      openDoors: (tileId) =>
        get().tiles.find((t) => t.id === tileId)?.doors.filter((d) => !d.connectedTo) ?? [],
      connectedDoors: (tileId) =>
        get().tiles.find((t) => t.id === tileId)?.doors.filter((d) => d.connectedTo) ?? [],

      chooseDoor: (tileId, y, x) => {
        const { tiles, hiddenTiles, environment, majorFoesMet, finalBossMet } = get()
        const tile = tiles.find((t) => t.id === tileId)
        if (!tile) return
        const door = tile.doors.find((d) => d.y === y && d.x === x)
        if (!door) return

        // --- Walk back through a known door ---
        if (door.connectedTo) {
          const dest = door.connectedTo
          const destTile = tiles.find((t) => t.id === dest)
          // Retracing your steps: d6 → 1, Wandering Monsters attack (p.104).
          const wander = rollDie(Math.random, 6) === 1
          tickPartyTorches()
          set({
            currentId: dest,
            lastMessage: wander ? 'As you retrace your steps, Wandering Monsters ambush from the rear!' : null,
            pendingEncounter: wander
              ? {
                  foeKind: rollWanderingKind(),
                  tileId: dest,
                  inCorridor: Boolean(destTile?.corridor),
                  wandering: true,
                }
              : null,
          })
          return
        }

        // --- Expand into the dark through an open door ---
        const target = {
          y: door.y + delta(door.dir)[0],
          x: door.x + delta(door.dir)[1],
          dir: door.dir,
        }
        const occ = occupiedSet(tiles)

        // If the cell immediately beyond the door is already part of an existing room,
        // connect the two tiles into a dungeon loop and step into that room!
        if (occ.has(cellKey(target.y, target.x))) {
          const existing = tiles.find((t) =>
            t.floors.some(([fy, fx]) => fy === target.y && fx === target.x),
          )
          if (existing && existing.id !== tile.id) {
            tickPartyTorches()
            const backDir = opposite(door.dir)
            const nextTiles = tiles.map((t) => {
              if (t.id === tile.id) {
                return {
                  ...t,
                  doors: t.doors.map((d) =>
                    d.y === y && d.x === x ? { ...d, connectedTo: existing.id } : d,
                  ),
                }
              }
              if (t.id === existing.id) {
                const hasBack = t.doors.some((d) => d.y === target.y && d.x === target.x)
                return {
                  ...t,
                  doors: hasBack
                    ? t.doors.map((d) =>
                        d.y === target.y && d.x === target.x ? { ...d, connectedTo: tile.id } : d,
                      )
                    : [...t.doors, { y: target.y, x: target.x, dir: backDir, connectedTo: tile.id }],
                }
              }
              return t
            })
            set({
              tiles: nextTiles,
              currentId: existing.id,
              lastMessage: 'This doorway opens into a chamber you have already mapped!',
            })
            return
          }
        }

        // 1. Check if a pre-calculated room in `hiddenTiles` sits behind this doorway!
        const prebuilt = hiddenTiles.find(
          (ht) =>
            ht.doors.some(
              (hd) =>
                hd.y === target.y &&
                hd.x === target.x &&
                opposite(hd.dir) === target.dir,
            ) && ht.floors.every(([fy, fx]) => !occ.has(cellKey(fy, fx))),
        )

        let newTile: PlacedTile
        let nextHidden = hiddenTiles

        if (prebuilt) {
          tickPartyTorches()
          newTile = {
            ...prebuilt,
            environment,
            doors: prebuilt.doors.map((d) => ({
              ...d,
              connectedTo:
                d.y === target.y && d.x === target.x && opposite(d.dir) === target.dir
                  ? tile.id
                  : null,
            })),
          }
          nextHidden = hiddenTiles.filter((ht) => ht.id !== prebuilt.id)
        } else {
          // 2. Fallback: place a fitting shape from D66_TILES
          const firstSpec = specFromD66()
          const candidates = [
            firstSpec,
            ...D66_TILES.filter((s) => s.key !== firstSpec.key).sort((a, b) => {
              if (tiles.length < 8) {
                const aMulti = parseTile(a).doors.length >= 2 ? 0 : 1
                const bMulti = parseTile(b).doors.length >= 2 ? 0 : 1
                if (aMulti !== bMulti) return aMulti - bMulti
              }
              return Math.random() - 0.5
            }),
          ]

          let spec = firstSpec
          let placed: ReturnType<typeof tryPlace> = null
          for (const cand of candidates) {
            placed = tryPlace(cand, target, occ)
            if (placed) {
              spec = cand
              break
            }
          }
          if (!placed) {
            set({ lastMessage: 'That passage ends in solid stone — choose another exit.' })
            return
          }

          tickPartyTorches()
          const d2d6 = rollDie(Math.random, 6) + rollDie(Math.random, 6)
          const content = resolveTileContent(d2d6, spec.corridor)
          const id = newId()
          newTile = {
            id,
            specKey: spec.key,
            corridor: spec.corridor,
            rotation: placed.rotation,
            environment,
            content,
            contentRoll2d6: d2d6,
            searched: false,
            floors: placed.floors,
            doors: placed.doors.map((d) => ({
              ...d,
              connectedTo: d.y === placed.door.y && d.x === placed.door.x ? tile.id : null,
            })),
          }
        }

        const id = newTile.id
        const content = newTile.content
        const nextTiles = tiles
          .map((t) =>
            t.id === tile.id
              ? {
                  ...t,
                  doors: t.doors.map((d) =>
                    d.y === y && d.x === x ? { ...d, connectedTo: id } : d,
                  ),
                }
              : t,
          )
          .concat(newTile)

        // Check Major Foe & Final Boss tally (Book p. 105 & p. 152: d6 + prior Major Foes >= 6)
        let pending: PendingEncounterInfo | null = null
        let nextMajorMet = majorFoesMet
        let nextFinalBossMet = finalBossMet

        if (content.kind === 'foe' || content.kind === 'dragon-lair') {
          const foeKind = content.kind === 'dragon-lair' ? 'boss' : content.foeKind
          const isMajor = foeKind === 'weird' || foeKind === 'boss'
          let isFinalBoss = false
          let bossRollInfo: string | undefined
          if (isMajor && !finalBossMet) {
            const bossRoll = rollDie(Math.random, 6)
            const total = bossRoll + majorFoesMet
            isFinalBoss = total >= 6
            bossRollInfo = `Final Boss Check: d6 (${bossRoll}) + ${majorFoesMet} prior Major Foes = ${total} ${
              isFinalBoss ? '≥ 6 → THIS IS THE FINAL BOSS!' : '(< 6, not yet the Final Boss)'
            }`
            nextMajorMet = majorFoesMet + 1
            if (isFinalBoss) nextFinalBossMet = true
          } else if (isMajor) {
            nextMajorMet = majorFoesMet + 1
          }
          pending = {
            foeKind,
            tileId: id,
            inCorridor: newTile.corridor,
            isFinalBoss,
            ...(bossRollInfo ? { bossRollInfo } : {}),
          }
        }

        set({
          tiles: nextTiles,
          hiddenTiles: nextHidden,
          currentId: id,
          majorFoesMet: nextMajorMet,
          finalBossMet: nextFinalBossMet,
          pendingEncounter: pending,
          lastMessage: null,
        })
      },

      searchCurrent: (bonus = 0) => {
        const { tiles, currentId } = get()
        const t = tiles.find((x) => x.id === currentId)
        if (!t || t.searched) return null
        const out = resolveSearch(rollDie(Math.random, 6) + (t.corridor ? -1 : 0) + bonus)
        set({ tiles: tiles.map((x) => (x.id === t.id ? { ...x, searched: true } : x)) })
        if (out === 'wandering') {
          set({
            pendingEncounter: {
              foeKind: rollWanderingKind(),
              tileId: t.id,
              inCorridor: t.corridor,
              wandering: true,
            },
          })
        }
        return out
      },

      markCurrentFeatureResolved: () =>
        set((s) => ({
          tiles: s.tiles.map((t) => (t.id === s.currentId ? { ...t, featureResolved: true } : t)),
        })),

      setEnvironment: (environment) => set({ environment }),
      clearEncounter: () => set({ pendingEncounter: null }),
      clearMessage: () => set({ lastMessage: null }),
      noteMajorFoe: () => set((s) => ({ majorFoesMet: s.majorFoesMet + 1 })),
      noteFinalBossSlain: () => set({ finalBossSlain: true }),

      exitDungeon: () => {
        const st = get()
        const entrance = st.tiles[0]
        if (!entrance || st.currentId !== entrance.id) {
          return {
            ok: false,
            message: 'You must backtrack to the Entrance Tile (#1) to exit the dungeon!',
          }
        }
        useParty.getState().resetAdventureFlags()
        set({ escapedAlive: true })
        return {
          ok: true,
          message: st.finalBossSlain
            ? 'VICTORY! Your party slew the Final Boss and made it out of the dungeon alive!'
            : 'The party retreats from the dungeon alive to regroup and resupply.',
        }
      },

      reset: () =>
        set({
          tiles: [],
          hiddenTiles: [],
          currentId: null,
          started: false,
          majorFoesMet: 0,
          finalBossMet: false,
          finalBossSlain: false,
          escapedAlive: false,
          fountainUsed: false,
          pendingEncounter: null,
          lastMessage: null,
        }),
    }),
    {
      name: '4ad-dungeon',
      version: 2,
      migrate: (persisted) => {
        const p = persisted as Partial<DungeonState> | undefined
        const malformed =
          !p ||
          !Array.isArray(p.tiles) ||
          (p.tiles.length > 0 && !Array.isArray((p.tiles[0] as { floors?: unknown }).floors))
        if (malformed) {
          return {
            tiles: [],
            hiddenTiles: [],
            currentId: null,
            environment: 'dungeon',
            majorFoesMet: 0,
            finalBossMet: false,
            finalBossSlain: false,
            escapedAlive: false,
            fountainUsed: false,
            started: false,
            pendingEncounter: null,
            lastMessage: null,
          }
        }
        return {
          ...p,
          hiddenTiles: Array.isArray(p.hiddenTiles) ? p.hiddenTiles : [],
          finalBossMet: Boolean(p.finalBossMet),
          finalBossSlain: Boolean(p.finalBossSlain),
          escapedAlive: Boolean(p.escapedAlive),
          fountainUsed: Boolean(p.fountainUsed),
        } as DungeonState
      },
    },
  ),
)

/** d66 → tile spec (keys 11–66). */
function specFromD66(): TileSpec {
  const key = 11 + (rollD66(Math.random) - 11)
  return SPEC_BY_KEY.get(key) ?? D66_TILES[0]!
}

/** Wandering Monsters table (d6): 1-2 vermin, 3-4 minion, 5 weird, 6 boss. */
function rollWanderingKind(): 'vermin' | 'minion' | 'weird' | 'boss' {
  const d = rollDie(Math.random, 6)
  if (d <= 2) return 'vermin'
  if (d <= 4) return 'minion'
  if (d === 5) return 'weird'
  return 'boss'
}
