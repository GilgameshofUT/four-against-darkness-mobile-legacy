import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { tables } from '../../data/tables'
import { foeTables } from '../../data/monsters'
import { spells } from '../../data/spells'
import { equipment } from '../../data/equipment'
import { classes } from '../../data/classes'
import { rollTable } from '../rollTable'
import { rollDie } from '../../core/dice'
import type { FoeTable, RandTable } from '../../data/schema'

type Tab = 'tables' | 'foes' | 'spells' | 'gear' | 'classes'

export function TablesScreen() {
  const [tab, setTab] = useState<Tab>('tables')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [result, setResult] = useState<{ key: string; value: number; text: string } | null>(null)

  const filter = <T extends { name: string }>(list: T[]) =>
    q ? list.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())) : list

  const doRoll = (key: string, table: RandTable) => {
    const r = rollTable(table)
    setResult({ key, value: r.value, text: r.text })
  }
  const doRollFoe = (key: string, table: FoeTable) => {
    const e = table.entries[rollDie(Math.random, 6) - 1]!
    const foe = e.foes[0]!
    const detail = [
      foe.count, foe.name, `L${foe.level}${foe.maxLevel ? ` (max L${foe.maxLevel})` : ''}`,
      foe.life ? `${foe.life} Life` : null, foe.attacks ? `${foe.attacks} attack(s)` : null,
      `Treasure ${foe.treasure}`, `Reactions: ${foe.reactions}`, foe.text,
    ].filter(Boolean).join(' · ')
    setResult({ key, value: Number(e.roll), text: detail })
  }

  const tabs: [Tab, string][] = [
    ['tables', 'Tables'], ['foes', 'Foes'], ['spells', 'Spells'], ['gear', 'Gear'], ['classes', 'Classes'],
  ]

  return (
    <ScreenShell eyebrow="Reference" title="Random Tables" subtitle="Every table in the book — one tap to roll.">
      <input className="oc-input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="oc-segmented" style={{ display: 'flex', gap: 4 }}>
        {tabs.map(([id, label]) => (
          <button key={id} className={`segbtn${tab === id ? ' is-on' : ''}`} onClick={() => { setTab(id); setResult(null) }}>
            {label}
          </button>
        ))}
      </div>

      {result && result.key.startsWith(tab) && (
        <div className="outcome">
          <div className="outcome__title">Rolled {result.value}</div>
          <div className="outcome__body">{result.text}</div>
          <div className="outcome__actions"><button className="btn btn--ghost" onClick={() => setResult(null)}>Clear</button></div>
        </div>
      )}

      {tab === 'tables' && filter(tables).map((t) => (
        <TableCard key={t.id} table={t} openKey={open} setOpen={setOpen} onRoll={() => doRoll(`tables:${t.id}`, t)} />
      ))}

      {tab === 'foes' && filter(foeTables).map((t) => (
        <TableCard key={t.id} table={{ id: t.id, name: t.name, dice: t.dice, entries: t.entries.map((e) => ({ roll: e.roll, result: e.foes.map((f) => f.name).join(' / ') })) }} openKey={open} setOpen={setOpen} onRoll={() => doRollFoe(`foes:${t.id}`, t)} />
      ))}

      {tab === 'spells' && (
        <div className="listcards">
          {filter(spells).map((s) => (
            <div key={s.id} className="abilitylist"><li><b>{s.name}</b> <span className="muted">({s.school})</span> — {s.text}</li></div>
          ))}
        </div>
      )}

      {tab === 'gear' && (
        <div className="listcards">
          {filter(equipment).map((e) => (
            <div key={e.id} className="abilitylist"><li><b>{e.name}</b> <span className="muted">{e.price}gp{e.priceNote ? ` (${e.priceNote})` : ''}</span> — {e.text}</li></div>
          ))}
        </div>
      )}

      {tab === 'classes' && (
        <div className="listcards">
          {filter(classes).map((c) => (
            <div key={c.id} className="abilitylist">
              <li><b>{c.name}</b> <span className="muted">{c.role}</span> — {c.attack.text}. Life {c.life.text}. Stealth {c.stealth || '—'}.</li>
            </div>
          ))}
        </div>
      )}
    </ScreenShell>
  )
}

function TableCard({ table, openKey, setOpen, onRoll }: {
  table: RandTable
  openKey: string | null
  setOpen: (k: string | null) => void
  onRoll: () => void
}) {
  const isOpen = openKey === table.id
  return (
    <div className="tablecard">
      <button className="tablecard__head" onClick={() => setOpen(isOpen ? null : table.id)}>
        <span className="tablecard__name">{table.name}</span>
        <span className="tablecard__dice">{table.dice}</span>
      </button>
      <div className="tablecard__actions">
        <button className="btn" onClick={onRoll}>Roll</button>
      </div>
      {isOpen && (
        <ul className="tablecard__entries">
          {table.entries.map((e, i) => (
            <li key={i}><span className="tnum">{e.roll}</span> {e.result}</li>
          ))}
          {table.note && <li className="tablecard__note">{table.note}</li>}
        </ul>
      )}
    </div>
  )
}
