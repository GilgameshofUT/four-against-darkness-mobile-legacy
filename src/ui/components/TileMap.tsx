import { useEffect, useRef } from 'react'
import { useDungeon, type Environment } from '../../state/dungeon'
import type { Dir } from '../../core/dungeon'

const CELL = 16

/** Connector cells look like torchlit passage: slightly warmer fill. */
const CONNECTOR_FILL = '#3d3a1e'

const ENV_FILL: Record<Environment, string> = {
  dungeon: '#2f3a1e',
  caverns: '#3a2c1c',
  fungal: '#24401f',
}

/** Pixel centre of a given opening side on a tile's bounding box. */
function openingXY(x: number, y: number, w: number, h: number, d: Dir): [number, number] {
  switch (d) {
    case 'N': return [x + w / 2, y]
    case 'S': return [x + w / 2, y + h]
    case 'W': return [x, y + h / 2]
    case 'E': return [x + w, y + h / 2]
  }
}

export function TileMap({ height = 240 }: { height?: number }) {
  const tiles = useDungeon((s) => s.tiles)
  const currentId = useDungeon((s) => s.currentId)
  const moveCurrent = useDungeon((s) => s.moveCurrent)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    // Flatten cells with tile offsets; find global bounds.
    // Connector cells ride along with their tile.
    const placed: Array<{ gx: number; gy: number; env: Environment; connector: boolean }> = []
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const track = (gx: number, gy: number, env: Environment, connector: boolean) => {
      placed.push({ gx, gy, env, connector })
      if (gx < minX) minX = gx
      if (gy < minY) minY = gy
      if (gx > maxX) maxX = gx
      if (gy > maxY) maxY = gy
    }
    for (const t of tiles) {
      for (const [cx, cy] of t.shape.cells) track(t.x + cx, t.y + cy, t.environment, false)
      for (const [gx, gy] of t.extraCells ?? []) track(gx, gy, t.environment, true)
    }
    if (!Number.isFinite(minX)) {
      ctx.clearRect(0, 0, cv.width, cv.height)
      return
    }

    const cols = maxX - minX + 1
    const rows = maxY - minY + 1
    const scale = Math.min(CELL, (cv.width - 16) / cols, (height - 16) / rows)
    const offX = (cv.width - cols * scale) / 2
    const offY = (height - rows * scale) / 2

    ctx.clearRect(0, 0, cv.width, cv.height)
    // grid
    ctx.strokeStyle = '#241f18'
    ctx.lineWidth = 1
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath(); ctx.moveTo(offX + c * scale, offY); ctx.lineTo(offX + c * scale, offY + rows * scale); ctx.stroke()
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath(); ctx.moveTo(offX, offY + r * scale); ctx.lineTo(offX + cols * scale, offY + r * scale); ctx.stroke()
    }

    const px = (gx: number) => offX + (gx - minX) * scale
    const py = (gy: number) => offY + (gy - minY) * scale

    // cells
    for (const p of placed) {
      ctx.fillStyle = p.connector ? CONNECTOR_FILL : ENV_FILL[p.env]
      ctx.fillRect(px(p.gx) + 1, py(p.gy) + 1, scale - 2, scale - 2)
      ctx.strokeStyle = '#0c0a07'
      ctx.strokeRect(px(p.gx) + 1, py(p.gy) + 1, scale - 2, scale - 2)
    }

    // doors: stored connector endpoints when present, else the shape's openings
    for (const t of tiles) {
      let w = 0, h = 0
      for (const [cx, cy] of t.shape.cells) {
        if (cx + 1 > w) w = cx + 1
        if (cy + 1 > h) h = cy + 1
      }
      const pts: Array<[number, number]> = []
      if (t.doors && t.doors.length > 0) {
        for (const [gx, gy] of t.doors) pts.push([px(gx) + scale / 2, py(gy) + scale / 2])
      } else {
        for (const d of t.openings) {
          const [ox, oy] = openingXY(t.x, t.y, w, h, d)
          pts.push([px(ox), py(oy)])
        }
      }
      for (const [dx, dy] of pts) {
        ctx.fillStyle = t.id === currentId ? '#f4d18a' : '#e8b45c'
        ctx.beginPath()
        ctx.arc(dx, dy, Math.max(2, scale * 0.28), 0, Math.PI * 2)
        ctx.fill()
      }
      if (t.id === currentId) {
        ctx.strokeStyle = '#f4d18a'
        ctx.lineWidth = 2
        ctx.strokeRect(px(t.x) - 1, py(t.y) - 1, w * scale + 2, h * scale + 2)
        ctx.lineWidth = 1
      }
    }
  }, [tiles, currentId, height])

  const click = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current
    if (!cv) return
    const rect = cv.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * cv.width
    const my = ((e.clientY - rect.top) / rect.height) * cv.height
    // find clicked tile by hit-testing its cells (recompute layout)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const cellsOf = (t: (typeof tiles)[number]): Array<[number, number]> => [
      ...t.shape.cells.map(([cx, cy]): [number, number] => [t.x + cx, t.y + cy]),
      ...(t.extraCells ?? []),
    ]
    for (const t of tiles) for (const [gx, gy] of cellsOf(t)) {
      if (gx < minX) minX = gx; if (gy < minY) minY = gy
      if (gx > maxX) maxX = gx; if (gy > maxY) maxY = gy
    }
    if (!Number.isFinite(minX)) return
    const cols = maxX - minX + 1, rows = maxY - minY + 1
    const scale = Math.min(CELL, (cv.width - 16) / cols, (height - 16) / rows)
    const offX = (cv.width - cols * scale) / 2
    const offY = (height - rows * scale) / 2
    for (const t of tiles) {
      for (const [gx, gy] of cellsOf(t)) {
        const x = offX + (gx - minX) * scale
        const y = offY + (gy - minY) * scale
        if (mx >= x && mx < x + scale && my >= y && my < y + scale) {
          moveCurrent(t.id)
          return
        }
      }
    }
  }

  return <canvas ref={canvasRef} width={360} height={height} className="tilemap" onClick={click} />
}
