import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { ClassPicker } from '../components/ClassPicker'
import { PCSheet } from '../components/PCSheet'
import { derive, type PC } from '../../state/pc'
import { PARTYSIZE, useParty } from '../../state/party'

export function PartyScreen() {
  const party = useParty((s) => s.party)
  const [picking, setPicking] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const open = party.find((p) => p.id === openId)
  const hcl = party.length ? Math.max(...party.map((p) => p.level)) : 0

  return (
    <ScreenShell
      eyebrow="The Company"
      title="Your Party"
      subtitle={party.length === 0 ? 'Found four heroes to descend.' : `${party.length} of ${PARTYSIZE} · HCL ${hcl}`}
      actions={party.length < PARTYSIZE ? <button className="btn" onClick={() => setPicking(true)}>+ Hero</button> : undefined}
    >
      {party.length === 0 && (
        <div className="scaffold-note">
          Every dungeon needs a party. <b>Add four heroes</b> — a mix of healing, stealth, offense and
          defence survives best. Start with the eight core classes.
        </div>
      )}

      {party.map((pc, i) => (
        <PCRow key={pc.id} pc={pc} index={i} onOpen={() => setOpenId(pc.id)} />
      ))}

      {party.length > 0 && party.length < PARTYSIZE && (
        <button className="addslot" onClick={() => setPicking(true)}>
          + Add hero ({party.length}/{PARTYSIZE})
        </button>
      )}

      {party.length > 0 && (
        <button
          className="btn btn--ghost"
          onClick={() => {
            if (confirmReset) {
              useParty.getState().reset()
              setConfirmReset(false)
            } else {
              setConfirmReset(true)
            }
          }}
        >
          {confirmReset ? 'Tap again to confirm' : 'Reset party'}
        </button>
      )}

      {picking && <ClassPicker onClose={() => setPicking(false)} />}
      {open && <PCSheet pc={open} onClose={() => setOpenId(null)} />}
    </ScreenShell>
  )
}

function PCRow({ pc, index, onOpen }: { pc: PC; index: number; onOpen: () => void }) {
  const d = derive(pc)
  const pct = (pc.life / d.maxLife) * 100
  return (
    <div className="pcrow pcrow--card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}>
      <div className="pcrow__pos tnum">{index + 1}</div>
      <div className="pcrow__main">
        <div className="pcrow__name">
          {pc.name} <i>· L{pc.level} {d.cls.name}</i>
        </div>
        <div className="lifebar"><i style={{ width: `${pct}%` }} /></div>
        <div className="pcrow__meta">
          <span className="tnum">{pc.life}/{d.maxLife} Life</span>
          <span className="tnum">{d.attackRoll}</span>
          <span className="tnum">{d.defenseRoll}</span>
          <span className="tnum">{pc.gold}gp</span>
        </div>
      </div>
      {pc.traits.length > 0 && (
        <span className="pcrow__traits">{pc.traits.length} trait{pc.traits.length > 1 ? 's' : ''}</span>
      )}
      <button
        className="pcrow__del"
        onClick={(e) => {
          e.stopPropagation()
          useParty.getState().removeHero(pc.id)
        }}
        aria-label={`Remove ${pc.name}`}
      >
        ✕
      </button>
    </div>
  )
}
