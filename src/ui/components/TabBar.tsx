import { useUi } from '../../state/ui'
import type { TabId } from '../../state/ui'
import { useCombat } from '../../state/combat'
import { useDungeon } from '../../state/dungeon'
import { IconDungeon, IconMore, IconParty, IconTables } from './icons'

const TABS: { id: TabId; label: string; Icon: typeof IconParty }[] = [
  { id: 'party', label: 'Party & Gear', Icon: IconParty },
  { id: 'dungeon', label: 'Dungeon Delve', Icon: IconDungeon },
  { id: 'tables', label: 'Rulebook', Icon: IconTables },
  { id: 'more', label: 'Campaign', Icon: IconMore },
]

export function TabBar() {
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const combatActive = useCombat((s) => s.active)
  const dungeonStarted = useDungeon((s) => s.started)

  // Map 'combat' onto the 'dungeon' tab highlight so Delve & Combat feel like one unified stage
  const effectiveTab: TabId = tab === 'combat' ? 'dungeon' : tab

  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map(({ id, label, Icon }) => {
        const active = id === effectiveTab
        const badge =
          id === 'dungeon' && combatActive
            ? 'FIGHT'
            : id === 'dungeon' && dungeonStarted
              ? 'LIVE'
              : null
        return (
          <button
            key={id}
            className={`tabbar__tab${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => setTab(id === 'dungeon' && combatActive ? 'combat' : id)}
            style={{ position: 'relative' }}
          >
            <Icon size={20} />
            <span>{label}</span>
            {badge && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 12,
                  fontSize: '0.55rem',
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: badge === 'FIGHT' ? 'var(--blood-500)' : 'var(--moss-600)',
                  color: 'var(--parch-50)',
                  letterSpacing: '0.06em',
                }}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
