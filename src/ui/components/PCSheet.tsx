import { derive, type PC } from '../../state/pc'
import { useParty } from '../../state/party'
import { spells } from '../../data/spells'

export function PCSheet({ pc, onClose }: { pc: PC; onClose: () => void }) {
  const d = derive(pc)
  const setLife = useParty((s) => s.setLife)
  const addGold = useParty((s) => s.addGold)
  const spend = useParty((s) => s.spendResource)
  const toggleTrait = useParty((s) => s.toggleTrait)
  const togglePrepared = useParty((s) => s.togglePrepared)
  const levelUp = useParty((s) => s.levelUp)
  const addClue = useParty((s) => s.addClue)
  const traitMax = d.cls.id === 'halfling' ? 2 : 1

  return (
    <div className="sheet" role="dialog" aria-label={pc.name}>
      <div className="sheet__bar">
        <span className="eyebrow">
          L{pc.level} {d.cls.name}
        </span>
        <button className="sheet__x" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="sheet__body">
        <h2 className="display sheet__title">{pc.name}</h2>

        <div className="statgrid">
          <div className="stat"><b className="tnum">{d.attackRoll}</b><span>attack</span></div>
          <div className="stat"><b className="tnum">{d.defenseRoll}</b><span>defense</span></div>
          <div className="stat"><b className="tnum">{d.cls.stealth || '—'}</b><span>stealth</span></div>
          <div className="stat"><b className="tnum">{pc.gold}gp</b><span>gold</span></div>
        </div>

        {/* Life */}
        <div className="liferow">
          <span className="eyebrow">Life</span>
          <div className="lifebar lifebar--lg"><i style={{ width: `${(pc.life / d.maxLife) * 100}%` }} /></div>
          <span className="tnum">{pc.life}/{d.maxLife}</span>
          <div className="liferow__btns">
            <button className="btn btn--ghost" onClick={() => setLife(pc.id, pc.life - 1)}>−</button>
            <button className="btn btn--ghost" onClick={() => setLife(pc.id, pc.life + 1)}>+</button>
          </div>
        </div>

        {/* Resource pools */}
        {Object.keys(pc.resources).length > 0 && (
          <div className="resgrid">
            {Object.entries(pc.resources).map(([k, v]) => (
              <button key={k} className="resbtn" onClick={() => spend(pc.id, k, 1)} title={`Spend1 ${k}`}>
                <b className="tnum">{v}</b>
                <span>{k}</span>
              </button>
            ))}
          </div>
        )}

        {/* Abilities */}
        <h3 className="sheet__h">Abilities</h3>
        <ul className="abilitylist">
          {d.cls.abilities.map((a) => (
            <li key={a.name}>
              <b>{a.name}.</b> {a.text}
            </li>
          ))}
        </ul>

        {/* Spells (wizards, druids, illusionists) */}
        {d.cls.magic?.school && d.cls.magic.school !== 'cleric' && (
          <>
            <h3 className="sheet__h">
              Spells ({pc.preparedSpells.length}/{d.slots} prepared · {pc.resources.spellSlots ?? 0} slots left)
            </h3>
            <ul className="traitlist">
              {spells
                .filter((s) => s.school === d.cls.magic!.school)
                .map((s) => {
                  const on = pc.preparedSpells.includes(s.id)
                  return (
                    <li
                      key={s.id}
                      className={`traitrow${on ? ' is-on' : ''}`}
                      onClick={() => togglePrepared(pc.id, s.id, d.slots)}
                    >
                      <b>{s.name}.</b> {s.text}
                    </li>
                  )
                })}
            </ul>
          </>
        )}

        {/* Traits */}
        <h3 className="sheet__h">Traits (pick {traitMax})</h3>
        <ul className="traitlist">
          {d.cls.traits.map((t) => {
            const on = pc.traits.includes(t.name)
            return (
              <li
                key={t.name}
                className={`traitrow${on ? ' is-on' : ''}`}
                onClick={() => toggleTrait(pc.id, t.name, traitMax)}
              >
                <b>{t.name}.</b> {t.text}
              </li>
            )
          })}
        </ul>

        <div className="confirm__actions">
          <button className="btn btn--ghost" onClick={() => addGold(pc.id, 1)}>+1gp</button>
          <button className="btn btn--ghost" onClick={() => addClue(pc.id)}>+1 Clue</button>
          <button className="btn btn--moss" onClick={() => levelUp(pc.id)}>Level up (XP roll)</button>
        </div>
      </div>
    </div>
  )
}
