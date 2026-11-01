import { TabBar } from './ui/components/TabBar'
import { CombatScreen } from './ui/screens/CombatScreen'
import { DungeonScreen } from './ui/screens/DungeonScreen'
import { MoreScreen } from './ui/screens/MoreScreen'
import { PartyScreen } from './ui/screens/PartyScreen'
import { TablesScreen } from './ui/screens/TablesScreen'
import { useUi } from './state/ui'

export default function App() {
  const tab = useUi((s) => s.tab)

  return (
    <div className="app">
      <div className="app__viewport">
        {tab === 'party' && <PartyScreen />}
        {tab === 'dungeon' && <DungeonScreen />}
        {tab === 'combat' && <CombatScreen />}
        {tab === 'tables' && <TablesScreen />}
        {tab === 'more' && <MoreScreen />}
      </div>
      <TabBar />
    </div>
  )
}
