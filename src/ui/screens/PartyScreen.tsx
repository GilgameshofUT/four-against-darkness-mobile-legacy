import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { ClassPicker } from '../components/ClassPicker'
import { PCSheet } from '../components/PCSheet'
import { PARTYSIZE, partyHcl, useParty } from '../../state/party'
import { partyHasLight, pcProvidesLight } from '../../state/pc'
import { useUi } from '../../state/ui'
import { IconCrown, IconDungeon, IconLantern, IconParty } from '../components/icons'

export function PartyScreen() {
  const partySt = useParty()
  const party = partySt.party
  const setTab = useUi((s) => s.setTab)
  const [picking, setPicking] = useState(false)
  const [bannerMsg, setBannerMsg] = useState<string | null>(null)

  const hcl = partyHcl(party)
  const full = party.length >= PARTYSIZE
  const hasLight = partyHasLight(party)
  const totalGold = party.reduce((s, p) => s + p.gold, 0)
  const lightBearer = party.find((p) => pcProvidesLight(p))

  const recruitIconicParty = () => {
    partySt.reset()
    partySt.addHero('Bjorn', 'warrior', {
      traits: ['Tight Guard'],
      loadoutId: 'war-sword-shield',
    })
    partySt.addHero('Solveig', 'cleric', {
      traits: ['Sacred Defense'],
      loadoutId: 'clr-mace-shield',
    })
    partySt.addHero('Rask', 'rogue', {
      traits: ['Knife Fighter'],
      loadoutId: 'rog-dagger',
    })
    partySt.addHero('Alrik', 'wizard', {
      traits: ['Arcane Memory'],
      loadoutId: 'wiz-dagger',
      preparedSpells: ['fireball', 'lightning', 'sleep', 'protection'],
    })
    const created = useParty.getState().party
    const rogue = created[2]
    if (rogue) {
      useParty.getState().buyEquipment(rogue.id, 'lantern')
    }
    setBannerMsg('Iconic Party recruited and outfitted! Rask (#3) holds the Lantern.')
  }

  const quickBuyLantern = () => {
    const candidate =
      [...party].reverse().find((p) => p.offHand === null || p.classId === 'kukla') ??
      party[0]
    if (!candidate) return
    const res = partySt.buyEquipment(candidate.id, 'lantern')
    setBannerMsg(res.message)
  }

  return (
    <ScreenShell
      eyebrow={`Party Play Sheet · ${party.length}/${PARTYSIZE}${hcl ? ` · HCL ${hcl}` : ''}`}
      title="The Four Adventurers"
      subtitle={`Party Gold: ${totalGold}gp · ${
        hasLight
          ? `Light Bearer: ${lightBearer?.name ?? 'Active'}`
          : 'NO LIGHT SOURCE (-2 to all rolls!)'
      }`}
      actions={
        !full && !picking ? (
          <button className="btn" onClick={() => setPicking(true)}>
            + Recruit Hero #{party.length + 1}
          </button>
        ) : undefined
      }
    >
      {/* EXPEDITION READINESS & MARCHING ORDER BANNER */}
      {party.length > 0 && (
        <div
          className="pcsheet"
          style={{
            borderColor: hasLight ? 'var(--moss-500)' : 'var(--blood-500)',
            borderTopColor: hasLight ? 'var(--moss-400)' : 'var(--blood-400)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="eyebrow">Expedition Readiness · Marching Order & Light (Book pp. 95, 110)</div>
              <div style={{ fontSize: '0.82rem', marginTop: 4, color: 'var(--parch-100)' }}>
                <b>Front Row (Corridor Melee):</b>{' '}
                {party
                  .filter((p) => p.marchingOrder <= 2)
                  .map((p) => `#${p.marchingOrder} ${p.name}`)
                  .join(', ') || 'None'}{' '}
                · <b>Rear Row (Corridor Ranged/Spells):</b>{' '}
                {party
                  .filter((p) => p.marchingOrder >= 3)
                  .map((p) => `#${p.marchingOrder} ${p.name}`)
                  .join(', ') || 'None'}
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  marginTop: 4,
                  color: hasLight ? 'var(--amber-200)' : 'var(--blood-300)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <IconLantern size={15} />
                {hasLight
                  ? `Light Source Ready: ${lightBearer?.name} illuminates the dungeon.`
                  : 'WARNING: Nobody holds a Lantern or Torch! Without light, all PCs suffer -2 to Attack, Defense & Saves, and cannot Search or shoot ranged weapons.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!hasLight && (
                <button className="btn" onClick={quickBuyLantern}>
                  <IconLantern size={16} /> Buy & Equip Lantern (4gp)
                </button>
              )}
              {full && (
                <button className="btn btn--moss" onClick={() => setTab('dungeon')}>
                  <IconDungeon size={16} /> Enter the Dungeon
                </button>
              )}
            </div>
          </div>

          {/* Pending XP Rolls Banner */}
          {partySt.pendingXpRolls > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(180,150,100,0.2)' }}>
              <div className="eyebrow" style={{ color: 'var(--amber-200)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconCrown size={14} /> {partySt.pendingXpRolls} Experience Roll(s) Available — Pick a hero to roll d6 &gt; Level (Book p. 117):
              </div>
              <div className="chiprow" style={{ marginTop: 6 }}>
                {party.map((p) => (
                  <button
                    key={p.id}
                    className="chip chip--amber"
                    onClick={() => {
                      const r = partySt.rollXpForHero(p.id)
                      setBannerMsg(
                        r.leveledUp
                          ? `${p.name} rolled d6=${r.rolled} (needed ${r.needed}+) and advanced to Level ${r.newLevel}!`
                          : `${p.name} rolled d6=${r.rolled} (needed ${r.needed}+) — stays Level ${r.newLevel}.`,
                      )
                    }}
                  >
                    Roll XP for {p.name} (L{p.level}, need {Math.min(6, p.level + 1)}+)
                  </button>
                ))}
              </div>
            </div>
          )}

          {bannerMsg && (
            <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--amber-200)' }}>
              {bannerMsg}
            </div>
          )}
        </div>
      )}

      {picking && (
        <ClassPicker
          slotNumber={party.length + 1}
          onPick={(name, classId, opts) => {
            partySt.addHero(name, classId, opts)
            setPicking(false)
          }}
          onCancel={() => setPicking(false)}
        />
      )}

      {party.length === 0 && !picking && (
        <div className="pcsheet">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)', color: 'var(--parch-50)' }}>
            Begin Your Expedition
          </h3>
          <p style={{ margin: '4px 0 12px', fontSize: '0.88rem', color: 'var(--parch-300)' }}>
            Assemble four Level 1 adventurers to delve into the dark. Each hero rolls starting gold, chooses their starting Trait and weapon/armor loadout, prepares spells, and takes their place in the Marching Order (#1–#2 Front Row, #3–#4 Rear Row).
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setPicking(true)}>
              + Create Hero #1 (Custom Party)
            </button>
            <button className="btn btn--moss" onClick={recruitIconicParty}>
              <IconParty size={16} /> Recruit Iconic Party of Four (Outfitted)
            </button>
          </div>
        </div>
      )}

      <div className="pclist">
        {party.map((pc) => (
          <PCSheet key={pc.id} pc={pc} onRemove={() => partySt.removeHero(pc.id)} />
        ))}
      </div>
    </ScreenShell>
  )
}
