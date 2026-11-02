import { useEffect, useRef } from 'react'
import { useDungeon, type DoorRef, type PlacedTile } from '../../state/dungeon'
import { delta } from '../../core/tiles'

const MAX_CELL = 22
const MIN_CELL = 10

export function TileMap({
  height = 250,
  onSelectDoor,
}: {
  height?: number
  onSelectDoor?: (door: DoorRef) => void
}) {
  const tiles = useDungeon((s) => s.tiles)
  const currentId = useDungeon((s) => s.currentId)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hitZonesRef = useRef<Array<{ cx: number; cy: number; r: number; door: DoorRef }>>([])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    hitZonesRef.current = []

    // Global bounds over every floor cell + 1-cell margin for unexplored door previews
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const t of tiles) {
      for (const [y, x] of t.floors) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      for (const dr of t.doors) {
        const [dy, dx] = delta(dr.dir)
        const nx = dr.x + dx
        const ny = dr.y + dy
        if (nx < minX) minX = nx
        if (ny < minY) minY = ny
        if (nx > maxX) maxX = nx
        if (ny > maxY) maxY = ny
      }
    }

    if (!Number.isFinite(minX)) {
      ctx.clearRect(0, 0, cv.width, cv.height)
      return
    }

    const padCells = 2
    minX -= padCells
    minY -= padCells
    maxX += padCells
    maxY += padCells

    const cols = Math.max(8, maxX - minX + 1)
    const rows = Math.max(8, maxY - minY + 1)
    const scale = Math.max(
      MIN_CELL,
      Math.min(MAX_CELL, (cv.width - 20) / cols, (height - 20) / rows),
    )
    const offX = (cv.width - cols * scale) / 2
    const offY = (height - rows * scale) / 2
    const px = (x: number) => offX + (x - minX) * scale
    const py = (y: number) => offY + (y - minY) * scale

    // 1. Aged Dark Parchment / Slate Backdrop
    const bgGrad = ctx.createRadialGradient(
      cv.width / 2,
      height / 2,
      20,
      cv.width / 2,
      height / 2,
      cv.width * 0.75,
    )
    bgGrad.addColorStop(0, '#231d15')
    bgGrad.addColorStop(1, '#120f0b')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, cv.width, height)

    // 2. Subtle Graph-Paper Grid across the map
    ctx.strokeStyle = 'rgba(180, 155, 110, 0.08)'
    ctx.lineWidth = 1
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath()
      ctx.moveTo(offX + c * scale, offY)
      ctx.lineTo(offX + c * scale, offY + rows * scale)
      ctx.stroke()
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath()
      ctx.moveTo(offX, offY + r * scale)
      ctx.lineTo(offX + cols * scale, offY + r * scale)
      ctx.stroke()
    }

    // Map each cell coordinate to its owning tile
    const ownerMap = new Map<string, PlacedTile>()
    for (const t of tiles) {
      for (const [y, x] of t.floors) {
        ownerMap.set(`${y},${x}`, t)
      }
    }

    // 3. Stone Cross-Hatching Shadow around rooms (like the book's hand-inked plates!)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    for (const t of tiles) {
      for (const [y, x] of t.floors) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!ownerMap.has(`${y + dy},${x + dx}`)) {
              ctx.fillRect(px(x + dx), py(y + dy), scale, scale)
            }
          }
        }
      }
    }

    // 4. Draw Room & Corridor Floors (continuous parchment stone, with faint interior grid)
    for (const t of tiles) {
      const isCurrent = t.id === currentId
      for (const [y, x] of t.floors) {
        if (isCurrent) {
          ctx.fillStyle = t.corridor ? '#b89f6d' : '#d6be8c'
        } else {
          ctx.fillStyle = t.corridor ? '#6e5f42' : '#8b7956'
        }
        ctx.fillRect(px(x), py(y), scale, scale)

        // Faint interior flagstone grid line
        ctx.strokeStyle = isCurrent ? 'rgba(40, 28, 12, 0.25)' : 'rgba(20, 14, 6, 0.25)'
        ctx.lineWidth = 0.75
        ctx.strokeRect(px(x), py(y), scale, scale)
      }
    }

    // 5. Draw Continuous Thick Ink Walls ONLY along tile boundaries (matching Book pp. 149–151!)
    ctx.strokeStyle = '#0d0905'
    ctx.lineWidth = Math.max(2.2, scale * 0.14)
    ctx.lineCap = 'square'
    for (const t of tiles) {
      const floorSet = new Set(t.floors.map(([y, x]) => `${y},${x}`))
      for (const [y, x] of t.floors) {
        const x0 = px(x)
        const y0 = py(y)
        const x1 = x0 + scale
        const y1 = y0 + scale
        // North wall
        if (!floorSet.has(`${y - 1},${x}`)) {
          ctx.beginPath()
          ctx.moveTo(x0, y0)
          ctx.lineTo(x1, y0)
          ctx.stroke()
        }
        // South wall
        if (!floorSet.has(`${y + 1},${x}`)) {
          ctx.beginPath()
          ctx.moveTo(x0, y1)
          ctx.lineTo(x1, y1)
          ctx.stroke()
        }
        // West wall
        if (!floorSet.has(`${y},${x - 1}`)) {
          ctx.beginPath()
          ctx.moveTo(x0, y0)
          ctx.lineTo(x0, y1)
          ctx.stroke()
        }
        // East wall
        if (!floorSet.has(`${y},${x + 1}`)) {
          ctx.beginPath()
          ctx.moveTo(x1, y0)
          ctx.lineTo(x1, y1)
          ctx.stroke()
        }
      }
    }

    // 6. Highlight Current Tile Perimeter in Warm Torch Gold
    const cur = tiles.find((t) => t.id === currentId)
    if (cur) {
      const floorSet = new Set(cur.floors.map(([y, x]) => `${y},${x}`))
      ctx.strokeStyle = '#f5c453'
      ctx.lineWidth = 2
      for (const [y, x] of cur.floors) {
        const x0 = px(x)
        const y0 = py(y)
        const x1 = x0 + scale
        const y1 = y0 + scale
        if (!floorSet.has(`${y - 1},${x}`)) {
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke()
        }
        if (!floorSet.has(`${y + 1},${x}`)) {
          ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke()
        }
        if (!floorSet.has(`${y},${x - 1}`)) {
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke()
        }
        if (!floorSet.has(`${y},${x + 1}`)) {
          ctx.beginPath(); ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); ctx.stroke()
        }
      }
    }

    // 7. Draw Room Landmarks (Entrance Stairs, Searched mark, Content icon, Party Banner)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    tiles.forEach((t, idx) => {
      if (t.floors.length === 0) return
      let sumX = 0
      let sumY = 0
      for (const [y, x] of t.floors) {
        sumX += x
        sumY += y
      }
      const cx = px(sumX / t.floors.length) + scale / 2
      const cy = py(sumY / t.floors.length) + scale / 2

      ctx.font = `bold ${Math.max(9, Math.floor(scale * 0.55))}px serif`
      ctx.fillStyle = t.id === currentId ? '#231709' : '#1e160c'
      if (idx === 0) {
        ctx.fillText('STAIRS', cx, cy)
      } else if (t.searched) {
        ctx.fillText('S', cx, cy)
      } else if (t.content.kind === 'special-feature') {
        ctx.fillText('★', cx, cy)
      } else if (t.content.kind === 'treasure' || t.content.kind === 'treasure-trap') {
        ctx.fillText('◈', cx, cy)
      }
    })

    // 8. Draw Architectural Doors on the Wall Boundaries + Fog-of-War "?" Previews
    for (const t of tiles) {
      const isCurTile = t.id === currentId
      for (const dr of t.doors) {
        const x0 = px(dr.x)
        const y0 = py(dr.y)
        let wx = x0 + scale / 2
        let wy = y0 + scale / 2
        const horiz = dr.dir === 'N' || dr.dir === 'S'
        if (dr.dir === 'N') wy = y0
        if (dr.dir === 'S') wy = y0 + scale
        if (dr.dir === 'W') wx = x0
        if (dr.dir === 'E') wx = x0 + scale

        const doorW = horiz ? scale * 0.62 : Math.max(4, scale * 0.26)
        const doorH = horiz ? Math.max(4, scale * 0.26) : scale * 0.62

        ctx.fillStyle = dr.connectedTo
          ? '#a88754'
          : isCurTile
            ? '#f5c453'
            : '#c49a45'
        ctx.strokeStyle = '#140e07'
        ctx.lineWidth = 1.2
        ctx.fillRect(wx - doorW / 2, wy - doorH / 2, doorW, doorH)
        ctx.strokeRect(wx - doorW / 2, wy - doorH / 2, doorW, doorH)

        // If unexplored door on current tile, draw a shadowy "?" fog-of-war cell beyond it
        if (!dr.connectedTo && isCurTile) {
          const [dy, dx] = delta(dr.dir)
          const fx = px(dr.x + dx) + scale / 2
          const fy = py(dr.y + dy) + scale / 2
          ctx.fillStyle = 'rgba(245, 196, 83, 0.16)'
          ctx.strokeStyle = 'rgba(245, 196, 83, 0.55)'
          ctx.setLineDash([2, 2])
          ctx.fillRect(px(dr.x + dx) + 1, py(dr.y + dy) + 1, scale - 2, scale - 2)
          ctx.strokeRect(px(dr.x + dx) + 1, py(dr.y + dy) + 1, scale - 2, scale - 2)
          ctx.setLineDash([])
          ctx.fillStyle = '#f5c453'
          ctx.font = `bold ${Math.max(9, Math.floor(scale * 0.55))}px serif`
          ctx.fillText('?', fx, fy)

          hitZonesRef.current.push({ cx: fx, cy: fy, r: scale * 0.75, door: dr })
        }

        if (isCurTile) {
          hitZonesRef.current.push({ cx: wx, cy: wy, r: scale * 0.65, door: dr })
        }
      }
    }
  }, [tiles, currentId, height])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectDoor || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    for (const z of hitZonesRef.current) {
      const dist = Math.hypot(x - z.cx, y - z.cy)
      if (dist <= z.r) {
        onSelectDoor(z.door)
        return
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={height}
      className="tilemap"
      onClick={handleCanvasClick}
      style={{ cursor: onSelectDoor ? 'pointer' : 'default' }}
    />
  )
}
