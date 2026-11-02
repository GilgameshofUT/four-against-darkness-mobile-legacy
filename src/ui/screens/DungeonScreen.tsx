import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { TileMap } from '../components/TileMap'
import { tables } from '../../data/tables'
import { useDungeon, type Environment } from '../../state/dungeon'
import { useUi } from '../../state/ui'
import { partyHcl, useParty } from '../../state/party'
import type { RandTable } from '../../data/schema'

function getTable(id: string): RandTable | undefined {
  return tables.find((t) => t.id === id)
}

/** Roll one entry from a table (uniform over entries). */
function rollTable(t: RandTable): { roll: string; result: string } {
  const e = t.entries[Math.floor(Math.random() * t.entries.length)]
  return { roll: e?.roll ?? '?', result: e?.result ?? '' }
}

interface Outcome {
  title: string
  body: string
  action?: 'fight' | 'search'
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

  const hcl = partyHcl(party)
  const current = d.tiles.find((t) => t.id === d.currentId)

  const rollFor = (kind: string, env: Environment): Outcome => {
    const et = ENV_TABLES[env]
    if (kind === 'treasure') {
      const a = rollTable(getTable('treasure')!)
      return { title: 'Treasure', body: a.result }
    }
    if (kind === 'treasure-trap') {
      const trap = rollTable(getTable(et.trap)!)
      const a = rollTable(getTable('treasure')!)
      return { title: 'Trapped treasure', body: `Trap — ${trap.result}\n\nLoot — ${a.result}` }
    }
    if (kind === 'special-feature') {
      const a = rollTable(getTable(et.feature)!)
      return { title: 'Special feature', body: a.result }
    }
    if (kind === 'special-event') {
      const a = rollTable(getTable(et.event)!)
      return { title: 'Special event', body: a.result }
    }
    if (kind === 'dragon-lair')
      return { title: 'Dragon’s lair', body: 'A dragon guards this lair.', action: 'fight' }
    return { title: kind, body: '' }
  }

  const onRollTile = () => {
    const content = d.rollNext()
    if (!content) return
    if (content.kind === 'foe') {
      const names = { vermin: 'Vermin', minion: 'Minions', weird: 'A Weird Monster', boss: 'A Boss!' }
      setOutcome({ title: 'Encounter!', body: `${names[content.foeKind]} block your path.`, action: 'fight' })
    } else if (content.kind === 'empty') {
      setOutcome({ title: 'Empty tile', body: 'Nothing here — you may Search it.', action: 'search' })
    } else {
      setOutcome(rollFor(content.kind, d.environment))
    }
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

  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <ScreenShell
      eyebrow={`Random Dungeon · HCL ${hcl}`}
      title="The Sunless Warrens"
      subtitle={d.started ? `${d.tiles.length} tiles · ${d.environment}` : 'Roll a tile, draw it, see what waits inside.'}
      actions={
        d.started ? (
          <button className="btn" onClick={onRollTile}>Roll tile</button>
        ) : undefined
      }
    >
      {/* Environment switch (secret passages change this) */}
      <div className="envrow">
        {(['dungeon', 'caverns', 'fungal'] as Environment[]).map((e) => (
          <button
            key={e}
            className={`chip${d.environment === e ? ' chip--amber' : ''}`}
            onClick={() => d.setEnvironment(e)}
          >
            {e}
          </button>
        ))}
      </div>

      {!d.started ? (
        <div className="scaffold-note">
          Your mission: slay the <b>Final Boss</b>, take its Treasure, and get out alive. Roll a tile to
          place the first room.
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
              <span className="eyebrow">Current tile</span>
              <span>
                {current.shape.isCorridor ? 'Corridor' : 'Room'} · {current.searched ? 'searched' : 'unsearched'} · {current.environment}
              </span>
              <button
                className={`tileinfo__clear${confirmClear ? ' is-armed' : ''}`}
                onClick={() => {
                  if (confirmClear) {
                    d.reset()
                    setOutcome(null)
                    setConfirmClear(false)
                  } else {
                    setConfirmClear(true)
                  }
                }}
                title="Clear the dungeon and start over"
              >
                {confirmClear ? 'Sure?' : 'Clear'}
              </button>
            </div>
          )}

          {d.pendingEncounter && !outcome && (
            <div className="outcome outcome--fight">
              <b>Encounter!</b> Switch to Combat to resolve it.
              <button className="btn" onClick={goFight}>Fight</button>
            </div>
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
