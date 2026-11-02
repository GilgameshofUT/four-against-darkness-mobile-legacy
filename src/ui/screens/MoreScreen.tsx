import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { ScenarioView } from '../components/ScenarioView'
import { scenarios } from '../../data/scenarios'
import { useParty } from '../../state/party'
import { useDungeon } from '../../state/dungeon'
import { attemptLevelUp } from '../../core/leveling'
import { getClass } from '../../state/pc'

const XP_SYSTEMS = [
  ['classical', 'Classical (XP rolls)'],
  ['slow', 'Slow & Sure'],
  ['oldschool', 'Old School (XP tally)'],
  ['slower', 'Slower Advancement'],
] as const

export function MoreScreen() {
  const party = useParty((s) => s.party)
  const [xpSystem, setXpSystem] = useState<string>('classical')
  const [xpLog, setXpLog] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmErase, setConfirmErase] = useState(false)
  const [openScenario, setOpenScenario] = useState<string | null>(null)
  const scenario = scenarios.find((s) => s.id === openScenario)

  const awardXp = (id: string) => {
    const pc = party.find((p) => p.id === id)
    if (!pc) return
    const before = pc.level
    const success = attemptLevelUp(Math.random, pc.level)
    if (success) useParty.getState().levelUp(id)
    setXpLog((l) => [
      `${pc.name}: d6 vs L${before} — ${success ? 'LEVEL UP!' : 'no gain'}`,
      ...l,
    ].slice(0, 8))
  }

  const exportData = () => {
    const data = {
      v: 1,
      party: localStorage.getItem('4ad-party'),
      dungeon: localStorage.getItem('4ad-dungeon'),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `4ad-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (data.party) localStorage.setItem('4ad-party', data.party)
        if (data.dungeon) localStorage.setItem('4ad-dungeon', data.dungeon)
        location.reload()
      } catch {
        setNotice('That file is not a valid 4AD save.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <ScreenShell eyebrow="Codex" title="More" subtitle="Campaign, scenarios and saves.">
      {/* XP / leveling */}
      <div className="panel" style={{ padding: 'var(--sp-3)' }}>
        <div className="eyebrow">Experience</div>
        <div className="envrow" style={{ marginTop: 'var(--sp-2)' }}>
          {XP_SYSTEMS.map(([id, label]) => (
            <button key={id} className={`chip${xpSystem === id ? ' chip--amber' : ''}`} onClick={() => setXpSystem(id)}>
              {label.split(' ')[0]}
            </button>
          ))}
        </div>
        <p className="screen__subtitle" style={{ marginTop: 'var(--sp-2)' }}>
          {XP_SYSTEMS.find(([id]) => id === xpSystem)?.[1]} — award an XP roll (d6 &gt; level, 6 always wins) to level up.
        </p>
        <div className="xpgrid">
          {party.map((pc) => (
            <button key={pc.id} className="xpbtn" onClick={() => awardXp(pc.id)}>
              <b>{pc.name}</b>
              <span>L{pc.level} {getClass(pc.classId).name}</span>
            </button>
          ))}
          {party.length === 0 && <span className="screen__subtitle">No heroes yet.</span>}
        </div>
        {xpLog.length > 0 && (
          <ul className="abilitylist" style={{ marginTop: 'var(--sp-3)' }}>
            {xpLog.map((l, i) => (<li key={i}>{l}</li>))}
          </ul>
        )}
      </div>

      {/* Scenarios */}
      <div className="sect">Adventures</div>
      {scenarios.map((s) => (
        <button key={s.id} className="pcrow pcrow--card" onClick={() => setOpenScenario(s.id)}>
          <div className="pcrow__main">
            <div className="pcrow__name">{s.name}</div>
            <div className="pcrow__meta"><span>{s.kind === 'scripted' ? 'Scripted' : 'Table-driven'}</span></div>
          </div>
          <span className="pcrow__traits">open</span>
        </button>
      ))}

      {/* Save / load */}
      <div className="sect">Save</div>
      {notice && (
        <div className="outcome">
          <div className="outcome__body">{notice}</div>
          <div className="outcome__actions"><button className="btn btn--ghost" onClick={() => setNotice(null)}>Dismiss</button></div>
        </div>
      )}
      <div className="outcome__actions">
        <button className="btn" onClick={exportData}>Export save</button>
        <label className="btn btn--ghost" style={{ cursor: 'pointer' }}>
          Import
          <input
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f) }}
          />
        </label>
      </div>
      <button
        className="btn btn--ghost"
        onClick={() => {
          if (confirmErase) {
            useParty.getState().reset()
            useDungeon.getState().reset()
            setConfirmErase(false)
          } else {
            setConfirmErase(true)
            setTimeout(() => setConfirmErase(false), 4000)
          }
        }}
      >
        {confirmErase ? 'Tap again to erase everything' : 'Erase all data'}
      </button>

      <div className="divider" />
      <p className="screen__subtitle">
        Offline PWA · data stored on this device. Four Against Darkness by Andrea Sfiligoi · Ganesha Games.
        Unofficial fan companion; not affiliated with or endorsed by the publisher.
      </p>

      {scenario && <ScenarioView scenario={scenario} onClose={() => setOpenScenario(null)} />}
    </ScreenShell>
  )
}
