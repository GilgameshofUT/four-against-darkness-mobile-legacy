/* ============================================================
   Tile model — faithful to the book's d66 plates & the fad
   reference implementation.

   A tile is a raw grid of single-char cells:
     ' ' (space) = void (outside the tile)
     '.'          = floor
     'N','E','S','W' = a DOOR: a floor cell that also exits the
                      tile in that direction.
   Corridors are1-wide; rooms are2+ wide (marked C in the book).

   Assembly: a new tile is snapped so one of its doors sits
   directly beyond an existing door, with opposing directions,
   rotating the new tile as needed (book p.104).
   ============================================================ */

export type Dir = 'N' | 'E' | 'S' | 'W'

export interface Door {
  y: number
  x: number
  dir: Dir
}

export interface TileSpec {
  key: number
  corridor: boolean
  raw: string[]
}

export interface ParsedTile {
  key: number
  corridor: boolean
  /** Passable cells (floor + doors), as [y,x]. */
  floors: Array<[number, number]>
  doors: Door[]
  h: number
  w: number
}

const DX: Record<Dir, number> = { N: 0, E: 1, S: 0, W: -1 }
const DY: Record<Dir, number> = { N: -1, E: 0, S: 1, W: 0 }
const OPPOSITE: Record<Dir, Dir> = { N: 'S', E: 'W', S: 'N', W: 'E' }
const ROTATE: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' }

export const delta = (d: Dir): [number, number] => [DY[d], DX[d]]
export const opposite = (d: Dir): Dir => OPPOSITE[d]

export function parseTile(spec: TileSpec): ParsedTile {
  const floors: Array<[number, number]> = []
  const doors: Door[] = []
  const h = spec.raw.length
  const w = spec.raw[0]?.length ?? 0
  for (let y = 0; y < h; y++) {
    const row = spec.raw[y] ?? ''
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ' '
      if (ch === ' ') continue
      floors.push([y, x])
      if (ch === 'N' || ch === 'E' || ch === 'S' || ch === 'W') doors.push({ y, x, dir: ch })
    }
  }
  return { key: spec.key, corridor: spec.corridor, floors, doors, h, w }
}

/** Rotate a parsed tile90° clockwise (floors + doors). */
export function rotateTile(t: ParsedTile, times: number): ParsedTile {
  let cur: ParsedTile = { ...t, floors: t.floors.map((c) => [c[0], c[1]] as [number, number]), doors: t.doors.map((d) => ({ ...d })) }
  for (let r = 0; r < ((times % 4) + 4) % 4; r++) {
    const nh = cur.w
    const nw = cur.h
    const floors = cur.floors.map(([y, x]): [number, number] => [x, nh - 1 - y])
    const doors = cur.doors.map((d) => ({ y: d.x, x: cur.h - 1 - d.y, dir: ROTATE[d.dir] }))
    cur = { key: cur.key, corridor: cur.corridor, floors, doors, h: nh, w: nw }
  }
  return cur
}
