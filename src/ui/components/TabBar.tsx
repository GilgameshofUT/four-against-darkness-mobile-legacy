import { useUi } from '../../state/ui'
import type { TabId } from '../../state/ui'
import { IconCombat, IconDungeon, IconMore, IconParty, IconTables } from './icons'

const TABS: { id: TabId; label: string; Icon: typeof IconParty }[] = [
  { id: 'party', label: 'Party', Icon: IconParty },
  { id: 'dungeon', label: 'Dungeon', Icon: IconDungeon },
  { id: 'combat', label: 'Combat', Icon: IconCombat },
  { id: 'tables', label: 'Tables', Icon: IconTables },
  { id: 'more', label: 'More', Icon: IconMore },
]

export function TabBar() {
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)

  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map(({ id, label, Icon }) => {
        const active = id === tab
        return (
          <button
            key={id}
            className={`tabbar__tab${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
