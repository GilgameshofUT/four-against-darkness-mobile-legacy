import { ScreenShell } from '../components/ScreenShell'
import { IconSkull } from '../components/icons'

export function CombatScreen() {
  return (
    <ScreenShell eyebrow="Encounter" title="No Foes Yet" subtitle="Combat begins when the dark answers.">
      <div className="scaffold-note">
        <b>Phase 6</b> wires the full loop to the rules engine: initiative flowchart, reactions,
        per-hero attack rolls with the Explosion rule, defense, morale and loot.
      </div>

      <div
        className="scaffold-tile"
        style={{ minHeight: 150, justifyContent: 'center', alignItems: 'center', gap: 'var(--sp-3)' }}
      >
        <IconSkull size={40} />
        <div className="scaffold-tile__value" style={{ textAlign: 'center', fontSize: 'var(--text-md)' }}>
          The corridor is quiet… for now
        </div>
      </div>

      <div className="scaffold-grid">
        <div className="scaffold-tile">
          <div className="scaffold-tile__label">Reaction</div>
          <div className="scaffold-tile__value">—</div>
        </div>
        <div className="scaffold-tile">
          <div className="scaffold-tile__label">Morale</div>
          <div className="scaffold-tile__value">—</div>
        </div>
      </div>
    </ScreenShell>
  )
}
