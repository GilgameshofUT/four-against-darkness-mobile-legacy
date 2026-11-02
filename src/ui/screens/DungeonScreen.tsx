import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { TileMap } from '../components/TileMap'
import { tables } from '../../data/tables'
import { useDungeon, type Environment, type DoorRef } from '../../state/dungeon'
import { useUi } from '../../state/ui'
import { partyHcl, useParty } from '../../state/party'
import type { RandTable } from '../../data/schema'

const DIR_NAME: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' }

function getTable(id: string): RandTable | undefined {
  return tables.find((t) => t.id === id)
}
function rollTable(t: RandTable): string {
  const e = t.entries[Math.floor(Math.random() * t.entries.length)]
  return e?.result ?? ''
}

interface Outcome {
  title: string
  body: string
  action?: 'fight' | 'search' | undefined
}

const ENV_TABLES: Record<Environment, { feature: string; event: string; trap: string }> = {
  dungeon: { feature: 'dungeon-special-feature', event: 'dungeon-special-events', trap: 'dungeon-traps' },
  caverns: { feature: 'cavern-special-feature', event: 'caverns-special-events', trap: 'caverns-traps' },
  fungal: { feature: 'dungeon-special-feature', event: 'fungal-special-events', trap: 'fungal-traps' },
}

export function DungeonScreen() {
  const d = useDungeon()
  const party = useParty((s) => s.party)
  const setTab = useUi((s) => s.setTab)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const hcl = partyHcl(party)
  const current = d.tiles.find((t) => t.id === d.currentId)

  const rollFor = (kind: string, env: Environment): Outcome => {
    const et = ENV_TABLES[env]
    if (kind === 'treasure') return { title: 'Treasure', body: rollTable(getTable('treasure')!) }
    if (kind === 'treasure-trap')
      return {
        title: 'Trapped treasure',
        body: `Trap — ${rollTable(getTable(et.trap)!)}\n\nLoot — ${rollTable(getTable('treasure')!)}`,
      }
    if (kind === 'special-feature') return { title: 'Special feature', body: rollTable(getTable(et.feature)!) }
    if (kind === 'special-event') return { title: 'Special event', body: rollTable(getTable(et.event)!) }
    if (kind === 'dragon-lair') return { title: 'Dragon’s lair', body: 'A dragon guards this lair.', action: 'fight' }
    return { title: kind, body: '' }
  }

  const showContent = (kind: string, env: Environment) => {
    if (kind === 'foe') setOutcome({ title: 'Encounter!', body: 'Foes block your path.', action: 'fight' })
    else if (kind === 'empty') setOutcome({ title: 'Empty tile', body: 'Nothing here — you may Search it.', action: 'search' })
    else setOutcome(rollFor(kind, env))
  }

  /** The player picks a door: walk back through a known one, or into the dark. */
  const onDoor = (door: DoorRef) => {
    const prevId = d.currentId
    d.chooseDoor(d.currentId!, door.y, door.x)
    const st = useDungeon.getState()

    if (st.lastMessage) {
      setOutcome({
        title: st.pendingEncounter ? 'Ambush!' : 'Notice',
        body: st.lastMessage,
        action: st.pendingEncounter ? 'fight' : undefined,
      })
      return
    }
    if (st.currentId === prevId) return // blocked: no room
    const cur = st.tiles.find((t) => t.id === st.currentId)
    if (!cur) return
    if (st.pendingEncounter) {
      setOutcome({ title: 'Encounter!', body: 'Foes block your path.', action: 'fight' })
      return
    }
    showContent(cur.content.kind, cur.environment)
  }

  const onSearch = () => {
    const r = d.searchCurrent()
    if (r === null) return
    if (r === 'wandering') setOutcome({ title: 'Wandering Monsters!', body: 'Something heard you.', action: 'fight' })
    else if (r === 'empty') setOutcome({ title: 'Search', body: 'Nothing to see here.' })
    else setOutcome({ title: 'You found something', body: 'Choose: hidden treasure, secret door, secret passage, or 1 Clue.' })
  }

  const goFight = () => {
    setOutcome(null)
    setTab('combat')
  }

  const open = current ? d.openDoors(current.id) : []
  const back = current ? d.connectedDoors(current.id) : []

  return (
    <ScreenShell
      eyebrow={`Random Dungeon · HCL ${hcl}`}
      title="The Sunless Warrens"
      subtitle={d.started ? `${d.tiles.length} tiles · ${d.environment}` : 'Slay the Final Boss and get out alive.'}
      actions={undefined}
    >
      <div className="envrow">
        {(['dungeon', 'caverns', 'fungal'] as Environment[]).map((e) => (
          <button key={e} className={`chip${d.environment === e ? ' chip--amber' : ''}`} onClick={() => d.setEnvironment(e)}>
            {e}
          </button>
        ))}
      </div>

      {!d.started ? (
        <div className="scaffold-note">
          Your mission: slay the <b>Final Boss</b>, take its Treasure, and get out alive. Roll a tile to place the first room.
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <button className="btn btn--moss" onClick={() => { d.start(); setOutcome(null) }}>
              Enter the dungeon
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mapcard">
            <TileMap height={220} />
          </div>

          {current && (
            <div className="tileinfo">
              <span className="eyebrow">You are in</span>
              <span>
                {current.corridor ? 'a corridor' : 'a room'} · {current.searched ? 'searched' : 'unsearched'} · {current.environment}
              </span>
              <button
                className={`tileinfo__clear${confirmClear ? ' is-armed' : ''}`}
                onClick={() => {
                  if (confirmClear) { d.reset(); setOutcome(null); setConfirmClear(false) }
                  else setConfirmClear(true)
                }}
                title="Clear the dungeon"
              >
                {confirmClear ? 'Sure?' : 'Clear'}
              </button>
            </div>
          )}

          {/* Door choice — the heart of navigation */}
          {current && (
            <>
              <div className="sect">Choose an exit</div>
              <div className="doorgroup">
                {open.map((door) => (
                  <button key={`${door.y},${door.x}`} className="doorbtn doorbtn--new" onClick={() => onDoor(door)}>
                    <span className="doorbtn__dir">{DIR_NAME[door.dir]}</span>
                    <span className="doorbtn__hint">into the dark</span>
                  </button>
                ))}
                {back.map((door) => (
                  <button key={`${door.y},${door.x}`} className="doorbtn doorbtn--back" onClick={() => onDoor(door)}>
                    <span className="doorbtn__dir">{DIR_NAME[door.dir]}</span>
                    <span className="doorbtn__hint">back the way you came</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {outcome && (
            <div className={`outcome${outcome.action === 'fight' ? ' outcome--fight' : ''}`}>
              <div className="outcome__title">{outcome.title}</div>
              <div className="outcome__body">{outcome.body}</div>
              <div className="outcome__actions">
                {outcome.action === 'fight' && <button className="btn" onClick={goFight}>Fight</button>}
                {outcome.action === 'search' && <button className="btn btn--moss" onClick={onSearch}>Search</button>}
                <button className="btn btn--ghost" onClick={() => setOutcome(null)}>Dismiss</button>
              </div>
            </div>
          )}
        </>
      )}
    </ScreenShell>
  )
}
