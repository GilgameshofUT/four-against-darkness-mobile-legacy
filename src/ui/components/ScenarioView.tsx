import { useState } from 'react'
import type { Scenario } from '../../data/schema'
import { rollTable } from '../rollTable'
import { rollDie } from '../../core/dice'

export function ScenarioView({ scenario, onClose }: { scenario: Scenario; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="sheet" role="dialog" aria-label={scenario.name}>
      <div className="sheet__bar">
        <span className="eyebrow">{scenario.kind === 'scripted' ? 'Scripted scenario' : 'Table-driven scenario'}</span>
        <button className="sheet__x" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="sheet__body">
        <h2 className="display sheet__title">{scenario.name}</h2>
        <p className="confirm__role">{scenario.intro}</p>

        {result && (
          <div className="outcome">
            <div className="outcome__title">Result</div>
            <div className="outcome__body">{result}</div>
            <div className="outcome__actions"><button className="btn btn--ghost" onClick={() => setResult(null)}>Clear</button></div>
          </div>
        )}

        {scenario.tables.map((t) => (
          <div key={t.id} className="tablecard" style={{ marginTop: 'var(--sp-3)' }}>
            <button className="tablecard__head" onClick={() => setOpen(open === t.id ? null : t.id)}>
              <span className="tablecard__name">{t.name}</span>
              <span className="tablecard__dice">{t.dice}</span>
            </button>
            <div className="tablecard__actions">
              <button className="btn" onClick={() => setResult(`${t.name}: ${rollTable(t).text}`)}>Roll</button>
            </div>
            {open === t.id && (
              <ul className="tablecard__entries">
                {t.entries.map((e, i) => (<li key={i}><span className="tnum">{e.roll}</span> {e.result}</li>))}
                {t.note && <li className="tablecard__note">{t.note}</li>}
              </ul>
            )}
          </div>
        ))}

        {scenario.foeTables.map((t) => (
          <div key={t.id} className="tablecard" style={{ marginTop: 'var(--sp-3)' }}>
            <button className="tablecard__head" onClick={() => setOpen(open === t.id ? null : t.id)}>
              <span className="tablecard__name">{t.name}</span>
              <span className="tablecard__dice">{t.dice}</span>
            </button>
            <div className="tablecard__actions">
              <button
                className="btn"
                onClick={() => {
                  const e = t.entries[rollDie(Math.random, 6) - 1]!
                  const f = e.foes[0]!
                  setResult(`${f.name} — L${f.level}${f.count ? ` (${f.count})` : ''}${f.life ? `, ${f.life} Life` : ''}. ${f.reactions}. ${f.text ?? ''}`)
                }}
              >
                Roll
              </button>
            </div>
            {open === t.id && (
              <ul className="tablecard__entries">
                {t.entries.map((e, i) => (<li key={i}><span className="tnum">{e.roll}</span> {e.foes.map((f) => f.name).join(' / ')}</li>))}
                {t.note && <li className="tablecard__note">{t.note}</li>}
              </ul>
            )}
          </div>
        ))}

        <h3 className="sheet__h">Notes</h3>
        <ul className="abilitylist">
          {scenario.notes.map((n, i) => (<li key={i}>{n}</li>))}
        </ul>
      </div>
    </div>
  )
}
