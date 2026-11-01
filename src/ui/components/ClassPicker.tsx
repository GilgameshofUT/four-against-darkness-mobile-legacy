import { useState } from 'react'
import { classes } from '../../data/classes'
import { useParty } from '../../state/party'

const DEFAULT_NAME = (clsName: string, n: number) => `${clsName} ${n}`

export function ClassPicker({ onClose }: { onClose: () => void }) {
  const addHero = useParty((s) => s.addHero)
  const count = useParty((s) => s.party.length)
  const [selId, setSelId] = useState<string | null>(null)
  const [name, setName] = useState('')

  const sel = selId ? classes.find((c) => c.id === selId) : undefined

  const pick = (id: string) => {
    setSelId(id)
    setName('')
  }
  const confirm = () => {
    if (!sel) return
    addHero(name.trim() || DEFAULT_NAME(sel.name, count + 1), sel.id)
    onClose()
  }

  const core = classes.filter((c) => c.core)
  const others = classes.filter((c) => !c.core)

  const Row = (c: (typeof classes)[number]) => (
    <button key={c.id} className={`classrow${selId === c.id ? ' is-sel' : ''}`} onClick={() => pick(c.id)}>
      <span className="classrow__name">{c.name}</span>
      <span className="classrow__role">{c.role}</span>
      {c.core && <span className="classrow__badge">core</span>}
    </button>
  )

  return (
    <div className="sheet" role="dialog" aria-label="Choose a class">
      <div className="sheet__bar">
        <span className="eyebrow">Found a hero</span>
        <button className="sheet__x" onClick={onClose} aria-label="Cancel">
          ✕
        </button>
      </div>
      <div className="sheet__body">
        {!sel && (
          <>
            <h2 className="display sheet__title">Choose a class</h2>
            <div className="classlist">
              <div className="classlist__group">Core classes</div>
              {core.map(Row)}
              <div className="classlist__group">Other classes</div>
              {others.map(Row)}
            </div>
          </>
        )}
        {sel && (
          <div className="confirm">
            <h2 className="display sheet__title">{sel.name}</h2>
            <p className="confirm__role">{sel.role}</p>
            <div className="confirm__stats">
              <div className="stat"><b>{sel.attack.text.split(' ').slice(0, 3).join(' ')}</b><span>attack</span></div>
              <div className="stat"><b>{sel.life.text}</b><span>life</span></div>
              <div className="stat"><b>{sel.stealth || '—'}</b><span>stealth</span></div>
            </div>
            <p className="confirm__desc">{sel.weaponsAllowed}</p>
            <label className="oc-field confirm__name">
              <span>Name</span>
              <input
                className="oc-input"
                value={name}
                placeholder={DEFAULT_NAME(sel.name, count + 1)}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="confirm__actions">
              <button className="btn btn--ghost" onClick={() => setSelId(null)}>Back</button>
              <button className="btn btn--moss" onClick={confirm}>Add to party</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
