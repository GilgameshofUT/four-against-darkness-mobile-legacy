import { useState } from 'react'
import { equipment } from '../../data/equipment'
import { spells } from '../../data/spells'
import {
  canCastSpellsNow,
  derive,
  pcProvidesLight,
  type PC,
} from '../../state/pc'
import { useParty } from '../../state/party'

const SECRETS_LIST = [
  'Weakness of a Foe (+2 Attack vs chosen Major Foe)',
  'Location of a Hidden Treasure (3d6×10gp in empty room)',
  'Location of a Magic Item',
  'True Name of a Spiritual Entity (Angel heal / Demon 4 dmg)',
  'New Spell (+1 spell & slot)',
  'Increase of Magical or Spiritual Power (+1 permanent slot/prayer)',
  'Terrifying Secret (auto-fail Foe Morale)',
]

export function PCSheet({ pc, onRemove }: { pc: PC; onRemove: () => void }) {
  const d = derive(pc)
  const partySt = useParty()
  const [confirmCut, setConfirmCut] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showSpells, setShowSpells] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const schoolSpells = d.cls.magic?.school
    ? spells.filter(
        (s) =>
          s.school === d.cls.magic!.school &&
          !(pc.classId === 'elf' && s.id === 'blessing'),
      )
    : []

  const hasLight = pcProvidesLight(pc)
  const mainItem = pc.mainHand ? equipment.find((e) => e.id === pc.mainHand) : null
  const isTwoHanded = (mainItem?.hands ?? 1) === 2
  const spellCheck = d.cls.magic?.usesSpells ? canCastSpellsNow(pc) : { ok: true }

  // Available items in PC's hands + backpack for equipping
  const allHeldAndCarried = Array.from(
    new Set([
      ...(pc.mainHand ? [pc.mainHand] : []),
      ...(pc.offHand ? [pc.offHand] : []),
      ...pc.inventory,
    ]),
  )

  const mainHandChoices = allHeldAndCarried.filter((id) => {
    const it = equipment.find((e) => e.id === id)
    return it && (it.category === 'weapon' || it.category === 'light')
  })

  const offHandChoices = allHeldAndCarried.filter((id) => {
    const it = equipment.find((e) => e.id === id)
    return it && (id === 'shield' || it.category === 'light' || (it.category === 'weapon' && (it.hands ?? 1) === 1))
  })

  const idxInParty = partySt.party.findIndex((p) => p.id === pc.id)
  const prevHero = idxInParty > 0 ? partySt.party[idxInParty - 1] : null
  const nextHero = idxInParty >= 0 && idxInParty < partySt.party.length - 1 ? partySt.party[idxInParty + 1] : null

  return (
    <article className="pcsheet">
      {/* 1. PLAY SHEET HEADER: Marching Order, Name, Class, Level, Light */}
      <header className="pcsheet__head">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="chip chip--amber" style={{ padding: '1px 6px', fontSize: '0.7rem' }}>
              #{pc.marchingOrder} {pc.marchingOrder <= 2 ? 'FRONT ROW' : 'REAR ROW'}
            </span>
            <span>
              {d.cls.name} · L{pc.level} · Tier {d.tier}
            </span>
            {hasLight && (
              <span className="chip" style={{ background: '#4a3810', color: '#f8dca0', fontSize: '0.7rem' }}>
                {pc.continualLight
                  ? '✨ Continual Light'
                  : pc.lanternOnHook
                    ? '🕯️ Shield-Hook Lantern'
                    : pc.kuklaHairLantern
                      ? '🕯️ Hair Lantern'
                      : pc.mainHand === 'torch' || pc.offHand === 'torch'
                        ? `🔥 Torch (${pc.torchRoomsLeft} rm)`
                        : '🕯️ Lantern'}
              </span>
            )}
            {pc.status !== 'alive' && (
              <span className="chip" style={{ background: '#5a1818', color: '#ffd0d0' }}>
                {pc.status.toUpperCase()}
              </span>
            )}
          </div>
          <h3 className="pcsheet__name">{pc.name}</h3>
        </div>
        <div className="pcsheet__head-actions" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {prevHero && (
            <button
              className="stepbtn"
              title="Move forward in Marching Order"
              onClick={() => partySt.swapMarchingOrder(pc.id, prevHero.id)}
            >
              ↑
            </button>
          )}
          {nextHero && (
            <button
              className="stepbtn"
              title="Move back in Marching Order"
              onClick={() => partySt.swapMarchingOrder(pc.id, nextHero.id)}
            >
              ↓
            </button>
          )}
          <button
            className="pcsheet__remove"
            onClick={() => {
              if (confirmCut) onRemove()
              else setConfirmCut(true)
            }}
            aria-label={`Dismiss ${pc.name}`}
          >
            {confirmCut ? 'Confirm?' : '×'}
          </button>
        </div>
      </header>

      {/* 2. PLAY SHEET 9-ICON STAT GRID (Book p. 206) */}
      <div className="pcsheet__stats">
        <div className="statbox">
          <span className="statbox__k">⚔️ Attack</span>
          <span className="statbox__v">{d.attackRoll}</span>
          <span className="eyebrow" style={{ fontSize: '0.65rem' }}>{d.weaponName}</span>
        </div>
        <div className="statbox">
          <span className="statbox__k">🛡️ Defense</span>
          <span className="statbox__v">{d.defenseRoll}</span>
          <span className="eyebrow" style={{ fontSize: '0.65rem' }}>
            {d.armorName}{pc.offHand === 'shield' ? ' + Shield' : pc.shieldOnBack ? ' (Shield on back)' : ''}
          </span>
        </div>
        <div className="statbox">
          <span className="statbox__k">❤️ Life</span>
          <span className="statbox__v">
            {pc.life}/{d.maxLife}
          </span>
          <div className="statbox__step">
            <button className="stepbtn" onClick={() => partySt.setLife(pc.id, pc.life - 1)}>−</button>
            <button className="stepbtn" onClick={() => partySt.setLife(pc.id, pc.life + 1)}>+</button>
          </div>
        </div>
        <div className="statbox">
          <span className="statbox__k">💰 Gold (gp)</span>
          <span className="statbox__v">{pc.gold}</span>
          <div className="statbox__step">
            <button className="stepbtn" onClick={() => partySt.addGold(pc.id, -5)}>−5</button>
            <button className="stepbtn" onClick={() => partySt.addGold(pc.id, 5)}>+5</button>
          </div>
        </div>
        <div className="statbox">
          <span className="statbox__k">👁️ Clues</span>
          <span className="statbox__v">{pc.clues}/3</span>
          <div className="statbox__step">
            <button className="stepbtn" onClick={() => partySt.addClue(pc.id)}>+1</button>
            {pc.clues >= 3 && (
              <button
                className="stepbtn"
                title="Spend 3 Clues to reveal a Secret (+1 XP roll)"
                onClick={() => {
                  const res = partySt.revealSecret(pc.id, SECRETS_LIST[0]!)
                  setStatusMsg(res.message)
                }}
              >
                Secret!
              </button>
            )}
          </div>
        </div>
        <div className="statbox">
          <span className="statbox__k">🍖 Rations / Madness</span>
          <span className="statbox__v">
            {pc.foodRations} / {pc.madness}m
          </span>
          <div className="statbox__step">
            <button
              className="stepbtn"
              title="Add 1 Food Ration"
              onClick={() => partySt.updateHero(pc.id, { foodRations: Math.min(10, pc.foodRations + 1) })}
            >
              +Food
            </button>
          </div>
        </div>
      </div>

      {/* 3. HANDS & WORN EQUIPMENT COMPARTMENT (Book p. 110 & p. 206) */}
      <div className="pcsheet__sec">
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          Hands & Worn Equipment (2 Hands Limit · Book p. 110)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.75rem' }}>
            <span className="eyebrow">Main Hand</span>
            <select
              value={pc.mainHand ?? ''}
              onChange={(e) => partySt.equipHand(pc.id, 'mainHand', e.target.value || null)}
              style={{
                background: 'var(--ink-800)',
                color: 'var(--parch-100)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: '4px 6px',
              }}
            >
              <option value="">Empty (Unarmed -2)</option>
              {mainHandChoices.map((id) => {
                const it = equipment.find((x) => x.id === id)
                return (
                  <option key={id} value={id}>
                    {it?.name ?? id} {(it?.hands ?? 1) === 2 ? '(2H)' : '(1H)'}
                  </option>
                )
              })}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.75rem' }}>
            <span className="eyebrow">Off Hand</span>
            <select
              value={isTwoHanded ? '' : pc.offHand ?? ''}
              disabled={isTwoHanded}
              onChange={(e) => partySt.equipHand(pc.id, 'offHand', e.target.value || null)}
              style={{
                background: 'var(--ink-800)',
                color: 'var(--parch-100)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: '4px 6px',
                opacity: isTwoHanded ? 0.6 : 1,
              }}
            >
              <option value="">
                {isTwoHanded ? `Occupied by ${mainItem?.name ?? '2H Weapon'}` : 'Empty (Free Hand)'}
              </option>
              {offHandChoices.map((id) => {
                const it = equipment.find((x) => x.id === id)
                return (
                  <option key={id} value={id}>
                    {it?.name ?? id}
                  </option>
                )
              })}
            </select>
          </label>
        </div>

        {/* Shield on Back / Lantern Hook / Healing quick actions */}
        <div className="chiprow" style={{ marginTop: 6 }}>
          {(pc.offHand === 'shield' || pc.shieldOnBack) && (
            <button className="chip" onClick={() => partySt.toggleShieldBack(pc.id)}>
              {pc.shieldOnBack ? '🛡️ Ready Shield to Hand' : '🎒 Strap Shield to Back (Free Hand)'}
            </button>
          )}
          {pc.offHand === 'shield' && (pc.inventory.includes('lantern') || pc.lanternOnHook) && (
            <button className="chip" onClick={() => partySt.toggleLanternHook(pc.id)}>
              {pc.lanternOnHook ? 'Unhook Lantern' : '🪝 Hang Lantern on Shield'}
            </button>
          )}
          {!pc.bandageUsed && pc.life < d.maxLife && (
            <button
              className="chip chip--amber"
              onClick={() => setStatusMsg(partySt.useBandage(pc.id).message)}
            >
              🩹 Use Bandage (+1 Life)
            </button>
          )}
          {pc.classId === 'cleric' && (pc.resources.healing ?? 0) > 0 && (
            <button
              className="chip chip--amber"
              onClick={() => setStatusMsg(partySt.castHealingPrayer(pc.id, pc.id).message)}
            >
              🙏 Heal Self (d6+{pc.level}, {pc.resources.healing} left)
            </button>
          )}
          {pc.classId === 'paladin' && (pc.resources.prayer ?? 0) > 0 && pc.life < d.maxLife && (
            <button
              className="chip chip--amber"
              onClick={() => setStatusMsg(partySt.usePaladinHeal(pc.id, pc.id, 1).message)}
            >
              ✨ Lay on Hands (+1 Life, {pc.resources.prayer} left)
            </button>
          )}
        </div>

        {!spellCheck.ok && (
          <div style={{ color: 'var(--blood-300)', fontSize: '0.75rem', marginTop: 4 }}>
            ⚠️ {spellCheck.reason}
          </div>
        )}
      </div>

      {/* 4. CLASS RESOURCES (Tricks, Luck, Rage, Gadgets, Prayers, Panache, Spores) */}
      {Object.keys(pc.resources).length > 0 && (
        <div className="pcsheet__pools">
          {Object.entries(pc.resources).map(([k, v]) => (
            <div key={k} className="poolchip">
              <span className="poolchip__k">{k}</span>
              <button className="stepbtn" onClick={() => partySt.spendResource(pc.id, k, 1)}>−</button>
              <span className="poolchip__v">{v}</span>
              <button className="stepbtn" onClick={() => partySt.spendResource(pc.id, k, -1)}>+</button>
            </div>
          ))}
        </div>
      )}

      {/* 5. TRAITS & SPECIALIZATIONS */}
      <div className="pcsheet__sec">
        <div className="eyebrow">
          Trait{pc.classId === 'halfling' ? 's (Halflings choose 2)' : ''}
          {pc.swornEnemy ? ` · Sworn Enemy: ${pc.swornEnemy}` : ''}
          {pc.specialistSpell ? ` · Specialist: ${pc.specialistSpell}` : ''}
        </div>
        <div className="chiprow">
          {d.cls.traits.map((t) => {
            const on = pc.traits.includes(t.name)
            const max = pc.classId === 'halfling' ? 2 : 1
            return (
              <button
                key={t.name}
                className={`chip${on ? ' chip--on' : ''}`}
                onClick={() => partySt.toggleTrait(pc.id, t.name, max)}
                title={t.text}
              >
                {t.name}
              </button>
            )
          })}
        </div>
        {pc.traits.map((tName) => {
          const tObj = d.cls.traits.find((x) => x.name === tName)
          return tObj ? (
            <div key={tName} style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
              <b>{tObj.name}:</b> {tObj.text}
            </div>
          ) : null
        })}
      </div>

      {/* 6. PREPARED SPELLS (Wizard, Elf, Druid, Illusionist, Gnome) */}
      {schoolSpells.length > 0 && d.slots > 0 && (
        <div className="pcsheet__sec">
          <div className="eyebrow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Prepared Spells ({pc.preparedSpells.length}/{d.slots} slots ready)
            </span>
            <button className="chip" onClick={() => setShowSpells((v) => !v)}>
              {showSpells ? 'Hide Spellbook' : 'Prepare Spells'}
            </button>
          </div>
          <div className="chiprow" style={{ marginTop: 4 }}>
            {pc.preparedSpells.map((sid, idx) => {
              const sp = spells.find((s) => s.id === sid)
              return (
                <span key={`${sid}-${idx}`} className="chip chip--amber" title={sp?.text}>
                  ✡️ {sp?.name ?? sid}
                </span>
              )
            })}
            {pc.spentSpells.map((sid, idx) => {
              const sp = spells.find((s) => s.id === sid)
              return (
                <span key={`spent-${sid}-${idx}`} className="chip" style={{ opacity: 0.5 }}>
                  (Spent: {sp?.name ?? sid})
                </span>
              )
            })}
          </div>
          {showSpells && (
            <div className="chiprow" style={{ marginTop: 6 }}>
              {schoolSpells.map((sp) => (
                <button
                  key={sp.id}
                  className="chip"
                  onClick={() => {
                    if (pc.classId === 'gnome') {
                      // Gnomes fill all L slots with the same chosen Illusionist spell (Book p. 36)
                      partySt.setPreparedSpells(
                        pc.id,
                        Array.from({ length: d.slots }, () => sp.id),
                      )
                    } else if (pc.preparedSpells.length < d.slots) {
                      partySt.setPreparedSpells(pc.id, [...pc.preparedSpells, sp.id])
                    } else {
                      partySt.setPreparedSpells(pc.id, [...pc.preparedSpells.slice(1), sp.id])
                    }
                  }}
                  title={sp.text}
                >
                  + {sp.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. BACKPACK & OUTFITTING SHOP */}
      <div className="pcsheet__sec">
        <div className="eyebrow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Backpack & Provisions ({pc.inventory.length} items)
          </span>
          <button className="chip chip--amber" onClick={() => setShowShop((v) => !v)}>
            {showShop ? 'Close Shop' : '🛒 Buy Gear'}
          </button>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--parch-200)', marginTop: 4 }}>
          {pc.inventory.length === 0
            ? 'Backpack empty'
            : pc.inventory
                .map((id) => equipment.find((e) => e.id === id)?.name ?? id)
                .join(' · ')}
        </div>

        {showShop && (
          <div className="chiprow" style={{ marginTop: 8 }}>
            {[
              'lantern',
              'lantern-hook',
              'bandage',
              'food-ration',
              'rope',
              'torch',
              'ten-foot-pole',
              'shield',
              'light-armor',
              'heavy-armor',
              'sword',
              'mace',
              'two-handed-sword',
              'bow',
              'crossbow',
              'holy-water',
              'healing-potion',
              'bag-of-nails',
            ].map((id) => {
              const item = equipment.find((e) => e.id === id)
              if (!item) return null
              return (
                <button
                  key={id}
                  className="chip"
                  title={item.text}
                  onClick={() => {
                    const res = partySt.buyEquipment(pc.id, id)
                    setStatusMsg(res.message)
                  }}
                >
                  + {item.name} ({item.price}gp)
                </button>
              )
            })}
          </div>
        )}
        {statusMsg && (
          <div style={{ fontSize: '0.75rem', color: 'var(--amber-300)', marginTop: 6 }}>
            {statusMsg}
          </div>
        )}
      </div>
    </article>
  )
}
