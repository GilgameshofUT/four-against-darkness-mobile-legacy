import { ScreenShell } from '../components/ScreenShell'

const SLOTS = ['Vanguard', 'Faith', 'Shadow', 'Arcanum']

export function PartyScreen() {
  return (
    <ScreenShell
      eyebrow="The Company"
      title="Your Party"
      subtitle="Four against the dark. Arrange your marching order."
    >
      <div className="scaffold-note">
        <b>Phase 4</b> builds this: pick four classes, auto-computed Attack / Defense / Life, traits,
        spells and inventory — all persisted to your device.
      </div>

      <div className="scaffold-grid">
        {SLOTS.map((slot, i) => (
          <div className="scaffold-tile" key={slot}>
            <div className="scaffold-tile__label">
              Position {i + 1} · {slot}
            </div>
            <div className="scaffold-tile__value">
              Empty <small>— tap to found</small>
            </div>
          </div>
        ))}
      </div>

      <div className="divider" />
      <p className="screen__subtitle">
        Marching order determines who soaks traps and who fights in the rearguard.
      </p>
    </ScreenShell>
  )
}
