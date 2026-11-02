import { useState } from 'react'
import { classes } from '../../data/classes'
import { spells } from '../../data/spells'
import type { HeroClass } from '../../data/schema'
import {
  computeSlots,
  defaultPreparedSpells,
  getStartingLoadouts,
  type CreatePCOptions,
} from '../../state/pc'
import { IconCoin, IconDice, IconHeart, IconShield, IconSword } from './icons'

const DEFAULT_NAMES: Record<string, string> = {
  warrior: 'Bjorn',
  cleric: 'Solveig',
  rogue: 'Rask',
  wizard: 'Alrik',
  barbarian: 'Thora',
  dwarf: 'Durin',
  elf: 'Sylthas',
  halfling: 'Pip',
  acrobat: 'Lira',
  assassin: 'Vex',
  bulwark: 'Gunnar',
  druid: 'Elowen',
  gnome: 'Gyrip',
  illusionist: 'Miravel',
  kukla: 'agata',
  'light-gladiator': 'Cassia',
  'mushroom-monk': 'amanita',
  paladin: 'Sigurd',
  ranger: 'Dara',
  swashbuckler: 'Inigo',
}

const SWORN_ENEMIES = ['Orcs', 'Goblins', 'Kobolds', 'Trolls', 'Ogres', 'Vampires', 'Werewolves', 'Chaos monsters', 'Dragons', 'Mushroom men']

export function ClassPicker({
  slotNumber,
  onPick,
  onCancel,
}: {
  slotNumber?: number
  onPick: (name: string, classId: string, opts: CreatePCOptions) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<HeroClass>(classes.find((c) => c.id === 'warrior') ?? classes[0]!)
  const [name, setName] = useState(DEFAULT_NAMES[selected.id] ?? selected.name)
  const [traits, setTraits] = useState<string[]>([selected.traits[0]!.name])
  const [loadoutId, setLoadoutId] = useState<string>(getStartingLoadouts(selected.id, [selected.traits[0]!.name])[0]!.id)
  const [swornEnemy, setSwornEnemy] = useState<string>('Orcs')
  const [specialistSpell, setSpecialistSpell] = useState<string>('fireball')
  const [weaponTraining, setWeaponTraining] = useState<'sword' | 'mace'>('sword')
  const [preparedSpells, setPreparedSpells] = useState<string[]>(
    defaultPreparedSpells(selected.id, computeSlots(selected, 1, [selected.traits[0]!.name])),
  )

  const chooseClass = (c: HeroClass) => {
    setSelected(c)
    setName(DEFAULT_NAMES[c.id] ?? c.name)
    const initTraits = c.id === 'halfling' ? [c.traits[0]!.name, c.traits[1]!.name] : [c.traits[0]!.name]
    setTraits(initTraits)
    const loads = getStartingLoadouts(c.id, initTraits)
    setLoadoutId(loads[0]!.id)
    const slots = computeSlots(c, 1, initTraits)
    setPreparedSpells(defaultPreparedSpells(c.id, slots, specialistSpell))
  }

  const maxTraits = selected.id === 'halfling' ? 2 : 1
  const loadouts = getStartingLoadouts(selected.id, traits)
  const slots = computeSlots(selected, 1, traits)
  const schoolSpells = selected.magic?.school
    ? spells.filter(
        (s) =>
          s.school === selected.magic!.school &&
          !(selected.id === 'elf' && s.id === 'blessing'),
      )
    : []

  const rollRandomTraits = () => {
    if (selected.id === 'halfling') {
      const i1 = Math.floor(Math.random() * 6)
      let i2 = Math.floor(Math.random() * 6)
      while (i2 === i1) i2 = Math.floor(Math.random() * 6)
      const next = [selected.traits[i1]!.name, selected.traits[i2]!.name]
      setTraits(next)
    } else {
      const i1 = Math.floor(Math.random() * 6)
      const next = [selected.traits[i1]!.name]
      setTraits(next)
    }
  }

  return (
    <div className="picker">
      <div className="picker__head">
        <div>
          <span className="eyebrow">
            {slotNumber
              ? `Create Hero #${slotNumber} (${slotNumber <= 2 ? 'Front Row' : 'Rear Row'})`
              : 'Create Hero (Level 1)'}
          </span>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            1. Choose Class ({classes.length} Book Classes)
          </h3>
        </div>
        <button className="picker__close" onClick={onCancel}>Cancel</button>
      </div>

      {/* Step 1: Class Grid */}
      <div className="picker__grid">
        {classes.map((c) => (
          <button
            key={c.id}
            className={`picker__item${c.id === selected.id ? ' is-selected' : ''}`}
            onClick={() => chooseClass(c)}
          >
            <span className="picker__item-name">{c.name}</span>
            <span className="picker__item-role">{c.core ? '★ Core · ' : ''}{c.role}</span>
          </button>
        ))}
      </div>

      {/* Step 2: Class Summary & Configuration */}
      <div className="picker__detail">
        <div className="picker__detail-title">
          {selected.name} — {selected.role}
        </div>
        <div className="picker__detail-meta">
          <span><IconHeart size={13} /> Life {selected.life.text}</span>
          <span><IconSword size={13} /> Atk {selected.attack.text}</span>
          <span><IconShield size={13} /> Def {selected.defense.text}</span>
          <span><IconCoin size={13} /> Gold {selected.startingWealth.text}</span>
        </div>
        <p className="picker__detail-gear">
          <b>Allowed Armor:</b> {selected.armorAllowed} · <b>Allowed Weapons:</b> {selected.weaponsAllowed}
        </p>
        {selected.abilities.length > 0 && (
          <div style={{ fontSize: '0.76rem', color: 'var(--parch-200)', marginBottom: 8 }}>
            {selected.abilities.slice(0, 3).map((a) => (
              <div key={a.name}>
                <b>{a.name}:</b> {a.text}
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Starting Trait(s) */}
        <div style={{ marginTop: 8 }}>
          <div className="eyebrow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              2. Starting Trait{maxTraits > 1 ? 's (Pick 2)' : ' (Pick 1 or Roll d6)'}
            </span>
            <button className="chip" onClick={rollRandomTraits}><IconDice size={13} /> Roll d6 Trait</button>
          </div>
          <div className="chiprow" style={{ marginTop: 4 }}>
            {selected.traits.map((t, idx) => {
              const on = traits.includes(t.name)
              return (
                <button
                  key={t.name}
                  className={`chip${on ? ' chip--amber' : ''}`}
                  onClick={() => {
                    let next: string[]
                    if (on) {
                      next = traits.length > 1 ? traits.filter((x) => x !== t.name) : traits
                    } else if (traits.length < maxTraits) {
                      next = [...traits, t.name]
                    } else {
                      next = [...traits.slice(1), t.name]
                    }
                    setTraits(next)
                    const nextLoads = getStartingLoadouts(selected.id, next)
                    if (!nextLoads.some((l) => l.id === loadoutId)) {
                      setLoadoutId(nextLoads[0]!.id)
                    }
                  }}
                  title={t.text}
                >
                  {idx + 1}. {t.name}
                </button>
              )
            })}
          </div>
          {traits.map((tName) => {
            const tObj = selected.traits.find((x) => x.name === tName)
            return tObj ? (
              <div key={tName} style={{ fontSize: '0.75rem', color: 'var(--amber-200)', marginTop: 4 }}>
                <b>{tObj.name}:</b> {tObj.text}
              </div>
            ) : null
          })}
        </div>

        {/* Ranger Sworn Enemy / Warrior Sword-Mace / Wizard Specialist */}
        {selected.id === 'ranger' && (
          <div style={{ marginTop: 8 }}>
            <div className="eyebrow">Ranger Sworn Enemy (Shifts Attack/Defense to d8! Book p. 58)</div>
            <div className="chiprow" style={{ marginTop: 4 }}>
              {SWORN_ENEMIES.map((se) => (
                <button
                  key={se}
                  className={`chip${swornEnemy === se ? ' chip--amber' : ''}`}
                  onClick={() => setSwornEnemy(se)}
                >
                  {se}
                </button>
              ))}
            </div>
          </div>
        )}

        {selected.id === 'warrior' && traits.includes('Sword/Mace Training') && (
          <div style={{ marginTop: 8 }}>
            <div className="eyebrow">Sword/Mace Training Choice (+Tier Attack)</div>
            <div className="chiprow" style={{ marginTop: 4 }}>
              {(['sword', 'mace'] as const).map((w) => (
                <button
                  key={w}
                  className={`chip${weaponTraining === w ? ' chip--amber' : ''}`}
                  onClick={() => setWeaponTraining(w)}
                >
                  {w === 'sword' ? 'Sword (Slashing)' : 'Mace (Crushing)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {selected.id === 'wizard' && traits.includes('Specialist') && (
          <div style={{ marginTop: 8 }}>
            <div className="eyebrow">Wizard Specialist Spell (+Tier Spellcasting)</div>
            <div className="chiprow" style={{ marginTop: 4 }}>
              {(['fireball', 'lightning', 'sleep'] as const).map((sp) => (
                <button
                  key={sp}
                  className={`chip${specialistSpell === sp ? ' chip--amber' : ''}`}
                  onClick={() => setSpecialistSpell(sp)}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Starting Equipment Loadout */}
        <div style={{ marginTop: 10 }}>
          <div className="eyebrow">3. Starting Equipment Loadout (Book p. 19–65)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {loadouts.map((l) => (
              <button
                key={l.id}
                className={`chip${loadoutId === l.id ? ' chip--amber' : ''}`}
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '6px 10px' }}
                onClick={() => setLoadoutId(l.id)}
              >
                {loadoutId === l.id ? '● ' : '○ '} {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 5: Spell Preparation for Spellcasters */}
        {schoolSpells.length > 0 && slots > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="eyebrow">
              4. Memorize Starting Spells ({preparedSpells.length}/{slots} Slots)
            </div>
            <div className="chiprow" style={{ marginTop: 4 }}>
              {preparedSpells.map((sid, i) => {
                const sp = spells.find((s) => s.id === sid)
                return (
                  <span key={`${sid}-${i}`} className="chip chip--amber">
                    Slot {i + 1}: {sp?.name ?? sid}
                  </span>
                )
              })}
            </div>
            <div className="chiprow" style={{ marginTop: 6 }}>
              {schoolSpells.map((sp) => (
                <button
                  key={sp.id}
                  className="chip"
                  title={sp.text}
                  onClick={() => {
                    if (selected.id === 'gnome') {
                      setPreparedSpells(Array.from({ length: slots }, () => sp.id))
                    } else if (preparedSpells.length < slots) {
                      setPreparedSpells([...preparedSpells, sp.id])
                    } else {
                      setPreparedSpells([...preparedSpells.slice(1), sp.id])
                    }
                  }}
                >
                  + {sp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Name & Confirm */}
        <div className="picker__form" style={{ marginTop: 12 }}>
          <input
            className="picker__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hero name"
          />
          <button
            className="btn"
            onClick={() =>
              onPick(name.trim() || selected.name, selected.id, {
                traits,
                loadoutId,
                preparedSpells: preparedSpells.slice(0, slots),
                swornEnemy,
                specialistSpell,
                weaponTraining,
              })
            }
          >
            Recruit {selected.name}
          </button>
        </div>
      </div>
    </div>
  )
}
