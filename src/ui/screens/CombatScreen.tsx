import { useEffect } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { useCombat } from '../../state/combat'
import { useDungeon } from '../../state/dungeon'
import { partyHcl, useParty } from '../../state/party'
import { derive } from '../../state/pc'
import { tables } from '../../data/tables'
import { rollDie } from '../../core/dice'

function rollTreasure(): string {
  const t = tables.find((x) => x.id === 'treasure')
  if (!t) return ''
  const e = t.entries[rollDie(Math.random, 6) - 1] ?? t.entries[0]
  return e?.result ?? ''
}

export function CombatScreen() {
  const combat = useCombat()
  const dungeon = useDungeon()
  const party = useParty((s) => s.party)
  const hcl = partyHcl(party)

  // Begin an encounter when the dungeon has a pending one.
  useEffect(() => {
    if (dungeon.pendingEncounter && !combat.active) {
      combat.begin(dungeon.pendingEncounter.foeKind, dungeon.environment, hcl || 1)
      dungeon.clearEncounter()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dungeon.pendingEncounter, combat.active])

  const foe = combat.foes.find((f) => (f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) > 0 : (f.life ?? 0) > 0))
  const allDead = combat.active && !foe
  const minor = foe && (foe.kind === 'vermin' || foe.kind === 'minion')
  const underHalf = minor && foe && (foe.remaining ?? 0) < Math.floor((foe.initial ?? 1) / 2)

  if (!combat.active) {
    return (
      <ScreenShell eyebrow="Encounter" title="No Foes Yet" subtitle="Combat begins when the dark answers.">
        <div className="scaffold-note">
          Roll tiles in the <b>Dungeon</b> tab — when a tile holds foes, the encounter starts here. Initiative:
          PCs act first unless the Foes surprise you.
        </div>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell
      eyebrow={`Encounter · Round ${combat.round}`}
      title={foe ? foe.name : 'Victory!'}
      subtitle={foe ? `L${foe.level} ${foe.kind}` : 'The tile is clear.'}
    >
      {foe && (
        <div className="encard">
          <div className="encard__stats">
            <div className="stat"><b className="tnum">L{foe.level}</b><span>level</span></div>
            {minor ? (
              <div className="stat"><b className="tnum">{foe.remaining}/{foe.initial}</b><span>count</span></div>
            ) : (
              <div className="stat"><b className="tnum">{foe.life}/{foe.maxLife}</b><span>life</span></div>
            )}
            <div className="stat"><b className="tnum">{foe.attacks}</b><span>attacks</span></div>
            <div className="stat"><b className="tnum">{foe.treasure}</b><span>treasure</span></div>
          </div>
          <div className="encard__reaction">
            <span className="eyebrow">Reaction</span> {foe.reactionLabel}
          </div>
          {foe.text && <div className="encard__text">{foe.text}</div>}
        </div>
      )}

      {/* Attack buttons */}
      <div className="sect">Attack</div>
      {party.map((pc) => {
        const d = derive(pc)
        const acted = combat.pcsActed.has(pc.id)
        return (
          <div className="pcrow" key={pc.id}>
            <div className="pcrow__main">
              <div className="pcrow__name">{pc.name} <i>· {d.cls.name}</i></div>
              <div className="lifebar"><i style={{ width: `${(pc.life / d.maxLife) * 100}%` }} /></div>
            </div>
            <button
              className={`rollbtn${acted ? ' is-done' : ''}`}
              disabled={!foe}
              onClick={() => foe && combat.attack(pc, foe.uid)}
            >
              {d.attackRoll}
            </button>
          </div>
        )
      })}

      {/* Last attack result */}
      {combat.lastAttack && (
        <div className={`atkresult${combat.lastAttack.exploded ? ' is-expl' : ''}`}>
          <div className="atkresult__dice">
            {combat.lastAttack.rolls.map((r, i) => (
              <span key={i} className={`dieface${r >= 6 ? ' dieface--ex' : ''}`}>{r}</span>
            ))}
            <span className="atkresult__total tnum">= {combat.lastAttack.total}</span>
          </div>
          <div className="atkresult__note">
            {combat.lastAttack.pcName} vs {combat.lastAttack.foeName} — <b>{combat.lastAttack.note}</b>
          </div>
        </div>
      )}

      {/* Round actions */}
      <div className="outcome__actions">
        <button className="btn" onClick={() => foe && combat.foeTurn(hcl || 1)} disabled={!foe}>
          Foes attack
        </button>
        {underHalf && foe && (
          <button className="btn btn--ghost" onClick={() => combat.tryMorale(foe.uid)}>
            Check morale
          </button>
        )}
        {allDead && (
          <button
            className="btn btn--moss"
            onClick={() => {
              const loot = rollTreasure()
              combat.clear()
              useDungeon.getState().noteMajorFoe()
              alert(`Loot: ${loot}\n\n1 XP roll earned.`)
            }}
          >
            Take loot & XP
          </button>
        )}
        {foe && (
          <button className="btn btn--ghost" onClick={() => combat.clear()}>Flee</button>
        )}
      </div>

      {/* Foe turn result */}
      {combat.lastFoeTurn && combat.lastFoeTurn.length > 0 && (
        <div className="foeturn">
          <div className="eyebrow">Foes’ turn</div>
          <ul>
            {combat.lastFoeTurn.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </ScreenShell>
  )
}
