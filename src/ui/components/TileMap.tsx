import { useEffect, useRef } from 'react'
import { useDungeon, type Environment } from '../../state/dungeon'

const CELL = 16

const ENV_FILL: Record<Environment, string> = {
  dungeon: '#2f3a1e',
  caverns: '#3a2c1c',
  fungal: '#24401f',
}

export function TileMap({ height = 240 }: { height?: number }) {
  const tiles = useDungeon((s) => s.tiles)
  const currentId = useDungeon((s) => s.currentId)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    // Global bounds over every floor cell.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const t of tiles) {
      for (const [y, x] of t.floors) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
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
    const px = (x: number) => offX + (x - minX) * scale
    const py = (y: number) => offY + (y - minY) * scale

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

    // floors
    for (const t of tiles) {
      for (const [y, x] of t.floors) {
        ctx.fillStyle = t.corridor ? '#3d3a1e' : ENV_FILL[t.environment]
        ctx.fillRect(px(x) + 1, py(y) + 1, scale - 2, scale - 2)
        ctx.strokeStyle = '#0c0a07'
        ctx.strokeRect(px(x) + 1, py(y) + 1, scale - 2, scale - 2)
      }
    }

    // current tile outline
    const cur = tiles.find((t) => t.id === currentId)
    if (cur && cur.floors.length > 0) {
      let a = Infinity, b = Infinity, c2 = -Infinity, d2 = -Infinity
      for (const [y, x] of cur.floors) {
        if (x < a) a = x; if (y < b) b = y; if (x > c2) c2 = x; if (y > d2) d2 = y
      }
      ctx.strokeStyle = '#f4d18a'
      ctx.lineWidth = 2
      ctx.strokeRect(px(a) - 1, py(b) - 1, (c2 - a + 1) * scale + 2, (d2 - b + 1) * scale + 2)
      ctx.lineWidth = 1
    }

    // doors: amber dot (open) vs dim dot (connected)
    for (const t of tiles) {
      for (const dr of t.doors) {
        const cx = px(dr.x) + scale / 2
        const cy = py(dr.y) + scale / 2
        ctx.fillStyle = dr.connectedTo ? '#8a6a3a' : '#f4d18a'
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(2.5, scale * 0.3), 0, Math.PI * 2)
        ctx.fill()
        // direction tick
        const dv: Record<string, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
        const [dx, dy] = dv[dr.dir] ?? [0, 0]
        ctx.strokeStyle = dr.connectedTo ? '#8a6a3a' : '#f4d18a'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + dx * scale * 0.5, cy + dy * scale * 0.5)
        ctx.stroke()
        ctx.lineWidth = 1
      }
    }
  }, [tiles, currentId, height])

  return <canvas ref={canvasRef} width={360} height={height} className="tilemap" />
}
