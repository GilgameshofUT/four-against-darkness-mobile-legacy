import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { ClassPicker } from '../components/ClassPicker'
import { PCSheet } from '../components/PCSheet'
import { PARTYSIZE, partyHcl, useParty } from '../../state/party'
import { partyHasLight, pcProvidesLight } from '../../state/pc'
import { useUi } from '../../state/ui'

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

  /** Recruit a balanced, fully outfitted iconic party (Warrior, Cleric, Rogue, Wizard) in one tap if desired. */
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
    // Give Rask (#3 Rear) the party Lantern in his free off-hand (4gp)
    const created = useParty.getState().party
    const rogue = created[2]
    if (rogue) {
      useParty.getState().buyEquipment(rogue.id, 'lantern')
    }
    setBannerMsg('Iconic Party recruited and outfitted! Rask (#3) holds the Lantern.')
  }

  /** Buy and equip a Lantern on the first hero with a free hand (or Shield Hook). */
  const quickBuyLantern = () => {
    // Prefer a hero in position 3 or 4 with a free off-hand, or anyone with a free hand
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
          ? `🕯️ Light: ${lightBearer?.name ?? 'Active'}`
          : '🌑 NO LIGHT SOURCE (-2 all rolls!)'
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
          className="scaffold-note"
          style={{
            marginBottom: 'var(--sp-3)',
            borderColor: hasLight ? 'var(--moss-500)' : 'var(--blood-500)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="eyebrow">Expedition Readiness · Marching Order & Light (Book pp. 95, 110)</div>
              <div style={{ fontSize: '0.82rem', marginTop: 2 }}>
                <b>Front Row (Melee in Corridors):</b>{' '}
                {party
                  .filter((p) => p.marchingOrder <= 2)
                  .map((p) => `#${p.marchingOrder} ${p.name}`)
                  .join(', ') || 'None'}{' '}
                · <b>Rear Row (Ranged/Spells in Corridors):</b>{' '}
                {party
                  .filter((p) => p.marchingOrder >= 3)
                  .map((p) => `#${p.marchingOrder} ${p.name}`)
                  .join(', ') || 'None'}
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: 4, color: hasLight ? 'var(--amber-200)' : 'var(--blood-300)' }}>
                {hasLight
                  ? `🕯️ Light Source Ready: ${lightBearer?.name} illuminates the dungeon.`
                  : '⚠️ WARNING: Nobody is holding a Lantern or Torch! Without light, all PCs suffer -2 to Attack, Defense & Saves, and cannot Search or shoot ranged weapons (Book p. 110).'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!hasLight && (
                <button className="btn" onClick={quickBuyLantern}>
                  🕯️ Buy & Equip Lantern (4gp)
                </button>
              )}
              {full && (
                <button className="btn btn--moss" onClick={() => setTab('dungeon')}>
                  Enter the Dungeon →
                </button>
              )}
            </div>
          </div>

          {/* Pending XP Rolls Banner */}
          {partySt.pendingXpRolls > 0 && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              <div className="eyebrow" style={{ color: 'var(--amber-300)' }}>
                ⭐ {partySt.pendingXpRolls} Experience Roll(s) Available! Pick a hero to roll d6 &gt; Level (Book p. 117):
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
                          ? `🎉 ${p.name} rolled d6=${r.rolled} (needed ${r.needed}+) and advanced to Level ${r.newLevel}!`
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
        <div className="scaffold-note">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
            Begin Your Expedition
          </h3>
          <p style={{ margin: '6px 0 12px' }}>
            Assemble four Level 1 adventurers to delve into the dark. Each hero rolls starting gold, chooses their starting Trait and weapon/armor loadout, prepares spells, and takes their place in the Marching Order (#1–#2 Front Row, #3–#4 Rear Row).
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setPicking(true)}>
              + Create Hero #1 (Custom Party)
            </button>
            <button className="btn btn--moss" onClick={recruitIconicParty}>
              ⚡ Recruit Iconic Party of Four (Outfitted)
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
