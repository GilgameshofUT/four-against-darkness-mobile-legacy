import { ScreenShell } from '../components/ScreenShell'

const TABLE_GROUPS = [
  { name: 'Dungeon', count: 12, note: 'tile content · features · events · traps' },
  { name: 'Caverns', count: 8, note: 'special features · events · foes' },
  { name: 'Fungal Grottoes', count: 8, note: 'madness · mushrooms · foes' },
  { name: 'Fiendish Foes', count: 6, note: 'vermin · minions · bosses · treasure' },
  { name: 'Reactions', count: 1, note: '15 outcomes, d6' },
  { name: 'Search & Doors', count: 3, note: 'search · wandering · door (2d6)' },
]

export function TablesScreen() {
  return (
    <ScreenShell eyebrow="Reference" title="Random Tables" subtitle="Every table in the book, one tap to roll.">
      <div className="scaffold-note">
        <b>Phase 7</b> transcribes all ~45 tables into searchable, tappable rollers with their exact
        book wording.
      </div>

      <div className="scaffold-grid">
        {TABLE_GROUPS.map((g) => (
          <div className="scaffold-tile" key={g.name}>
            <div className="scaffold-tile__label">{g.name}</div>
            <div className="scaffold-tile__value">
              {g.count} <small>tables</small>
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>{g.note}</div>
          </div>
        ))}
      </div>
    </ScreenShell>
  )
}
