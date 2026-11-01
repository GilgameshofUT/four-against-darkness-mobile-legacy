import { ScreenShell } from '../components/ScreenShell'
import { IconDice } from '../components/icons'

export function DungeonScreen() {
  return (
    <ScreenShell
      eyebrow="Random Dungeon · Turn 1"
      title="The Sunless Warrens"
      subtitle="Roll a tile, draw it, and see what waits inside."
      actions={
        <button className="btn" type="button">
          <IconDice size={18} />
          Roll tile
        </button>
      }
    >
      <div className="scaffold-note">
        <b>Phase 5</b> adds the auto-mapping canvas: d66 tile shapes (36 + 6 starting rooms), room /
        corridor rendering, and the Tile Content Table.
      </div>

      <div className="scaffold-tile" style={{ minHeight: 180, justifyContent: 'center', alignItems: 'center' }}>
        <div className="scaffold-tile__label">Dungeon map</div>
        <div className="scaffold-tile__value" style={{ textAlign: 'center' }}>
          First room awaits <small>— roll to begin</small>
        </div>
      </div>

      <div className="scaffold-grid">
        <div className="scaffold-tile">
          <div className="scaffold-tile__label">Environment</div>
          <div className="scaffold-tile__value">Dungeon</div>
        </div>
        <div className="scaffold-tile">
          <div className="scaffold-tile__label">Highest Level</div>
          <div className="scaffold-tile__value">
            HCL <small>—</small>
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
