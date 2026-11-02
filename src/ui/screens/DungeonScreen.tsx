import { useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { TileMap } from '../components/TileMap'
import { tables } from '../../data/tables'
import { rollDie, rollExploding, rollNotation, defaultRng } from '../../core/dice'
import { trapOrLockMod } from '../../core/modifiers'
import { useDungeon, type Environment, type DoorRef } from '../../state/dungeon'
import { useCombat } from '../../state/combat'
import { useUi } from '../../state/ui'
import { partyHcl, useParty } from '../../state/party'
import { getClass, maxLife, partyHasLight, pcProvidesLight } from '../../state/pc'
import type { RandTable } from '../../data/schema'
import {
  IconCamp,
  IconCoin,
  IconCrown,
  IconDice,
  IconDoor,
  IconEye,
  IconHeart,
  IconLantern,
  IconMap,
  IconPotion,
  IconPrayer,
  IconSearch,
  IconSword,
  IconTrap,
} from '../components/icons'

const DIR_NAME: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' }

function getTable(id: string): RandTable | undefined {
  return tables.find((t) => t.id === id)
}
function rollTableEntry(t: RandTable): { index: number; result: string } {
  const idx = rollDie(defaultRng, t.entries.length) - 1
  return { index: idx + 1, result: t.entries[idx]?.result ?? '' }
}

interface TrapChallengeState {
  description: string
  level: number
  damage: number
  targetPcId: string
  hasTreasureAfter: boolean
  disarmAttempted: boolean
  disarmNote?: string
  saveRolled: boolean
  saveTotal?: number
  saveSuccess?: boolean
  saveNote?: string
}

interface Outcome {
  title: string
  body: string
  action?:
    | 'fight'
    | 'search'
    | 'found-choice'
    | 'statue-choice'
    | 'puzzle-choice'
    | 'healer-shop'
    | 'alchemist-shop'
    | undefined
  puzzleLevel?: number
}

const ENV_TABLES: Record<Environment, { feature: string; event: string; trap: string }> = {
  dungeon: { feature: 'dungeon-special-feature', event: 'dungeon-special-events', trap: 'dungeon-traps' },
  caverns: { feature: 'cavern-special-feature', event: 'caverns-special-events', trap: 'caverns-traps' },
  fungal: { feature: 'dungeon-special-feature', event: 'fungal-special-events', trap: 'fungal-traps' },
}

export function DungeonScreen() {
  const d = useDungeon()
  const partySt = useParty()
  const party = partySt.party
  const setTab = useUi((s) => s.setTab)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [trapState, setTrapState] = useState<TrapChallengeState | null>(null)
  const [healPicker, setHealPicker] = useState<
    null | { kind: 'cleric-heal' | 'cleric-blessing' | 'paladin-heal' | 'bandage'; actorId: string }
  >(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [campMsg, setCampMsg] = useState<string | null>(null)

  const hcl = Math.max(1, partyHcl(party))
  const current = d.tiles.find((t) => t.id === d.currentId)
  const isAtEntrance = d.tiles.length > 0 && d.currentId === d.tiles[0]!.id
  const hasLight = partyHasLight(party)
  const lightBearer = party.find((p) => pcProvidesLight(p))

  // Front-row disarmer (#1 or #2 Rogue, Gnome, Kukla, or Acrobat)
  const trapDisarmer = party.find(
    (p) =>
      p.status === 'alive' &&
      p.marchingOrder <= 2 &&
      (p.classId === 'rogue' || p.classId === 'gnome' || p.classId === 'kukla' || p.classId === 'acrobat'),
  )

  const resolveAndAwardTreasure = (): string => {
    const t = getTable('treasure')!
    const r = rollTableEntry(t)
    let gpEarned = 0
    if (r.index === 1) gpEarned = rollDie(defaultRng, 6)
    else if (r.index === 2) gpEarned = rollNotation(defaultRng, '2d6')
    else if (r.index === 4) gpEarned = rollNotation(defaultRng, '2d6') * 5
    else if (r.index === 5) gpEarned = rollNotation(defaultRng, '3d6') * 10
    else if (r.index === 6) gpEarned = 50

    const dwarfNose = party.find(
      (p) => p.classId === 'dwarf' && p.traits.includes('Gold Nose') && !p.usedTraitsAdventure.includes('Gold Nose'),
    )
    if (dwarfNose && gpEarned > 0) {
      gpEarned = r.index === 5 ? 180 : r.index === 4 ? 60 : 12
      partySt.updateHero(dwarfNose.id, {
        usedTraitsAdventure: [...dwarfNose.usedTraitsAdventure, 'Gold Nose'],
      })
    }

    if (gpEarned > 0) {
      partySt.addPartyGold(gpEarned)
      return `${r.result}\n\nAwarded +${gpEarned}gp to the party!`
    }
    if (r.index === 3) {
      const recipient = party.find((p) => p.classId === 'wizard' || p.classId === 'elf') ?? party[0]
      if (recipient) {
        partySt.updateHero(recipient.id, {
          inventory: [...recipient.inventory, 'scroll-of-blessing'],
        })
      }
      return `${r.result}\n\nAdded Scroll to ${recipient?.name ?? 'party'}'s backpack!`
    }
    return r.result
  }

  /** Start an interactive Trap Challenge so the player actively rolls Disarm & Save! */
  const startTrapChallenge = (env: Environment, hasTreasureAfter: boolean) => {
    const et = ENV_TABLES[env]
    const trapRoll = rollTableEntry(getTable(et.trap)!)
    const trapL = hcl + 2
    const targetPc = party.find((p) => p.status === 'alive') ?? party[0]
    if (!targetPc) return
    setOutcome(null)
    setTrapState({
      description: trapRoll.result,
      level: trapL,
      damage: trapRoll.index === 6 ? 2 : 1,
      targetPcId: targetPc.id,
      hasTreasureAfter,
      disarmAttempted: false,
      saveRolled: false,
    })
  }

  const resolveSpecialFeature = (env: Environment): Outcome => {
    const et = ENV_TABLES[env]
    const r = rollTableEntry(getTable(et.feature)!)
    if (env === 'dungeon') {
      if (r.index === 1) {
        if (!d.fountainUsed) {
          for (const p of party) {
            if (p.status === 'alive') partySt.setLife(p.id, p.life + 1)
          }
          useDungeon.setState({ fountainUsed: true })
          return {
            title: 'Special Feature: Fountain',
            body: `${r.result}\n\nAll wounded heroes recover +1 Life!`,
          }
        }
        return { title: 'Special Feature: Fountain', body: `${r.result}\n\n(Already used a fountain this adventure.)` }
      }
      if (r.index === 2) {
        const target = party[0]
        if (target) {
          partySt.updateHero(target.id, {
            activeEffects: [...target.activeEffects, 'blessed-temple'],
          })
        }
        return {
          title: 'Special Feature: Blessed Temple',
          body: `${r.result}\n\n${target?.name ?? 'Hero'} gains +1 Attack vs Undead and Demons!`,
        }
      }
      if (r.index === 4) {
        const victim = party[rollDie(defaultRng, party.length) - 1]
        if (victim) {
          partySt.updateHero(victim.id, {
            activeEffects: [...victim.activeEffects, 'cursed-altar'],
          })
        }
        return {
          title: 'Special Feature: Cursed Altar',
          body: `${r.result}\n\n${victim?.name ?? 'A hero'} is cursed (-1 Defense until Blessed)!`,
        }
      }
      if (r.index === 5) {
        return {
          title: 'Special Feature: Mysterious Statue',
          body: r.result,
          action: 'statue-choice',
        }
      }
      if (r.index === 6) {
        const boxL = rollDie(defaultRng, 6)
        return {
          title: `Special Feature: Puzzle Box (L${boxL})`,
          body: r.result,
          action: 'puzzle-choice',
          puzzleLevel: boxL,
        }
      }
    }
    return { title: 'Special Feature', body: r.result }
  }

  const resolveSpecialEvent = (env: Environment): Outcome | null => {
    const et = ENV_TABLES[env]
    const r = rollTableEntry(getTable(et.event)!)
    if (env === 'dungeon') {
      if (r.index === 2) {
        return { title: 'Special Event: Wandering Monsters!', body: r.result, action: 'fight' }
      }
      if (r.index === 4) {
        startTrapChallenge(env, false)
        return null
      }
      if (r.index === 5) {
        return { title: 'Special Event: Wandering Healer', body: r.result, action: 'healer-shop' }
      }
      if (r.index === 6) {
        return { title: 'Special Event: Wandering Alchemist', body: r.result, action: 'alchemist-shop' }
      }
    }
    return { title: 'Special Event', body: r.result }
  }

  const showContent = (kind: string, env: Environment, d2d6?: number) => {
    const rollTag = d2d6 ? ` (2d6 = ${d2d6})` : ''
    if (kind === 'foe' || kind === 'dragon-lair') {
      const pending = useDungeon.getState().pendingEncounter
      setOutcome({
        title: pending?.isFinalBoss ? `FINAL BOSS ENCOUNTER!${rollTag}` : `Encounter!${rollTag}`,
        body:
          (pending?.bossRollInfo ? `${pending.bossRollInfo}\n\n` : '') +
          (kind === 'dragon-lair' ? 'A dragon guards this lair!' : 'Hostile Foes block your path.'),
        action: 'fight',
      })
    } else if (kind === 'empty') {
      setOutcome({
        title: `Empty Chamber${rollTag}`,
        body: hasLight
          ? 'Nothing immediately visible — you may Search this tile (d6) or choose your next doorway.'
          : 'Pitch Darkness! Without a light source you cannot Search this tile.',
        action: hasLight ? 'search' : undefined,
      })
    } else if (kind === 'treasure') {
      setOutcome({
        title: `Treasure Discovered!${rollTag}`,
        body: resolveAndAwardTreasure(),
      })
    } else if (kind === 'treasure-trap') {
      startTrapChallenge(env, true)
    } else if (kind === 'special-feature') {
      setOutcome(resolveSpecialFeature(env))
    } else if (kind === 'special-event') {
      const ev = resolveSpecialEvent(env)
      if (ev) setOutcome(ev)
    }
  }

  const goFight = (overrideKind?: 'vermin' | 'minion' | 'weird' | 'boss') => {
    const st = useDungeon.getState()
    const pending = st.pendingEncounter
    const foeKind = overrideKind ?? pending?.foeKind ?? 'minion'
    useCombat.getState().begin(foeKind, st.environment, hcl, {
      inCorridor: pending?.inCorridor ?? Boolean(current?.corridor),
      wandering: Boolean(pending?.wandering),
      isFinalBoss: Boolean(pending?.isFinalBoss),
      ...(pending?.bossRollInfo ? { bossRollInfo: pending.bossRollInfo } : {}),
    })
    d.clearEncounter()
    setOutcome(null)
    setTab('combat')
  }

  const onDoor = (door: DoorRef) => {
    setCampMsg(null)
    setTrapState(null)
    const prevId = d.currentId
    d.chooseDoor(d.currentId!, door.y, door.x)
    const st = useDungeon.getState()

    if (st.lastMessage) {
      setOutcome({
        title: st.pendingEncounter ? 'Rear Ambush!' : 'Dungeon Notice',
        body: st.lastMessage,
        action: st.pendingEncounter ? 'fight' : undefined,
      })
      return
    }
    if (st.currentId === prevId) return
    const cur = st.tiles.find((t) => t.id === st.currentId)
    if (!cur) return
    showContent(cur.content.kind, cur.environment, cur.contentRoll2d6)
  }

  const onSearch = () => {
    if (!hasLight) {
      setOutcome({
        title: 'Pitch Darkness',
        body: 'You cannot Search without a light source (Lantern, Torch, or Continual Light — Book p. 110)!',
      })
      return
    }
    let bonus = 0
    if (
      (d.environment === 'dungeon' || d.environment === 'caverns') &&
      party.some((p) => p.status === 'alive' && p.traits.includes('Underground Explorer'))
    ) {
      bonus += 1
    }
    if (party.some((p) => p.status === 'alive' && p.traits.includes('Keen Observer'))) {
      bonus += 1
    }

    const r = d.searchCurrent(bonus)
    if (r === null) return
    if (r === 'wandering') {
      setOutcome({
        title: 'Wandering Monsters!',
        body: 'Your searching noise attracted Wandering Monsters!',
        action: 'fight',
      })
    } else if (r === 'empty') {
      setOutcome({
        title: 'Search Complete',
        body: `Nothing hidden here${current?.corridor ? ' (corridors roll at -1)' : ''}.`,
      })
    } else {
      setOutcome({
        title: 'Search Success (5–6)! Choose Your Discovery:',
        body: 'Book p. 107: Choose 1) Hidden Treasure, 2) Secret Door, 3) Secret Passage, or 4) +1 Clue.',
        action: 'found-choice',
      })
    }
  }

  const open = current ? d.openDoors(current.id) : []
  const back = current ? d.connectedDoors(current.id) : []
  const clericWithHeal = party.find((p) => p.classId === 'cleric' && (p.resources.healing ?? 0) > 0 && p.status === 'alive')
  const clericWithBless = party.find((p) => p.classId === 'cleric' && (p.resources.blessing ?? 0) > 0 && p.status === 'alive')
  const paladinWithPrayer = party.find((p) => p.classId === 'paladin' && (p.resources.prayer ?? 0) > 0 && p.status === 'alive')
  const bandageHolder = party.find((p) => p.inventory.includes('bandage'))

  if (party.length < 4) {
    return (
      <ScreenShell
        eyebrow="Party Incomplete"
        title="Assemble Your Party First"
        subtitle={`You have ${party.length}/4 adventurers recruited.`}
      >
        <div className="pcsheet">
          <p>
            Before entering the dungeon, recruit all <b>4 heroes</b>, choose their starting loadouts and spells, and verify someone carries a <b>Lantern</b>.
          </p>
          <div style={{ marginTop: 'var(--sp-2)' }}>
            <button className="btn btn--moss" onClick={() => setTab('party')}>
              Go to Party Creation ({party.length}/4)
            </button>
          </div>
        </div>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell
      eyebrow={`Dungeon Delve · HCL ${hcl} · Major Foes: ${d.majorFoesMet}${d.finalBossSlain ? ' · BOSS SLAIN' : ''}`}
      title="The Sunless Warrens"
      subtitle={
        d.started
          ? `${d.tiles.length} rooms mapped · ${d.environment} · ${
              hasLight ? `Light: ${lightBearer?.name}` : 'DARKNESS (-2 all rolls!)'
            }`
          : 'Slay the Final Boss and get out alive.'
      }
    >
      {/* MARCHING ORDER & LIGHT BAR */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {party.map((p) => {
          const lit = pcProvidesLight(p)
          const cap = maxLife(getClass(p.classId), p.level, p.traits)
          return (
            <button
              key={p.id}
              className="statbox"
              style={{
                alignItems: 'flex-start',
                textAlign: 'left',
                borderColor: lit ? 'var(--amber-400)' : 'rgba(180,150,100,0.22)',
              }}
              onClick={() => setTab('party')}
              title="Tap to open Play Sheet, swap hands, or reorder Marching Order"
            >
              <span className="eyebrow" style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                #{p.marchingOrder} {p.marchingOrder <= 2 ? 'Front' : 'Rear'}
                {lit && <IconLantern size={11} />}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: 'var(--parch-50)' }}>
                {p.name}
              </span>
              <span style={{ fontSize: '0.7rem', color: p.life <= 2 ? 'var(--blood-300)' : 'var(--amber-200)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconHeart size={11} /> {p.life}/{cap} · {p.gold}g
              </span>
            </button>
          )
        })}
      </div>

      <div className="envrow">
        {(['dungeon', 'caverns', 'fungal'] as Environment[]).map((e) => (
          <button
            key={e}
            className={`chip${d.environment === e ? ' chip--amber' : ''}`}
            onClick={() => d.setEnvironment(e)}
          >
            <IconMap size={13} /> {e}
          </button>
        ))}
      </div>

      {!d.started ? (
        <div className="pcsheet">
          <div>
            Your mission: explore the subterranean complex door-by-door, track <b>Major Foes</b> (each rolls{' '}
            <code>d6 + prior Major Foes ≥ 6</code> to reveal the <b>Final Boss</b>), slay the Final Boss, and <b>return to the Entrance Stairs alive</b>.
          </div>
          {!hasLight && (
            <div style={{ color: 'var(--blood-300)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconLantern size={15} /> Nobody in your party has a light source equipped! Equip a Lantern on the Party tab first.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn--moss"
              onClick={() => {
                d.start()
                setOutcome({
                  title: 'Entrance Hall Mapped (Tile #1)',
                  body: 'You descend the stone stairs into the Entrance Hall. Tap any gold doorway on the map or choose an exit door below to open it.',
                })
              }}
            >
              <IconDoor size={16} /> Descend into the Dungeon
            </button>
            {!hasLight && (
              <button className="btn btn--ghost" onClick={() => setTab('party')}>
                Equip Lantern First
              </button>
            )}
          </div>
        </div>
      ) : d.escapedAlive ? (
        <div className="pcsheet">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)', color: 'var(--amber-200)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconCrown size={20} /> {d.finalBossSlain ? 'Expedition Victory!' : 'Expedition Concluded'}
          </h3>
          <p>
            {d.finalBossSlain
              ? 'Your party slew the Final Boss of the Sunless Warrens and made it back up the Entrance Stairs alive with their spoils!'
              : 'Your party retreated safely to the surface to tend their wounds and resupply.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button
              className="btn btn--moss"
              onClick={() => {
                d.reset()
                setOutcome(null)
              }}
            >
              Start New Dungeon Expedition
            </button>
            <button className="btn btn--ghost" onClick={() => setTab('party')}>
              View Party & Spend XP/Gold
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mapcard">
            <TileMap height={240} onSelectDoor={(dr) => !d.pendingEncounter && !trapState && onDoor(dr)} />
          </div>

          {current && (
            <div className="tileinfo">
              <span className="eyebrow">{isAtEntrance ? 'Entrance Stairs (#1)' : `Tile #${d.tiles.indexOf(current) + 1}`}</span>
              <span>
                {current.corridor ? 'Corridor (1-wide: #1&#2 melee)' : 'Room (All 4 melee)'} ·{' '}
                {current.searched ? 'Searched' : 'Unsearched'}
              </span>
              <button
                className={`tileinfo__clear${confirmClear ? ' is-armed' : ''}`}
                onClick={() => {
                  if (confirmClear) {
                    d.reset()
                    setOutcome(null)
                    setTrapState(null)
                    setConfirmClear(false)
                  } else setConfirmClear(true)
                }}
              >
                {confirmClear ? 'Confirm?' : 'Reset'}
              </button>
            </div>
          )}

          {/* INTERACTIVE TRAP CHALLENGE CARD (Player rolls Disarm & Avoid Save!) */}
          {trapState && (
            <div className="defcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="eyebrow" style={{ color: 'var(--amber-300)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconTrap size={15} /> Interactive Trap Challenge · Level {trapState.level}
                </span>
                <span className="chip chip--blood">{trapState.damage} Dmg on Fail</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--parch-100)' }}>
                {trapState.description}
              </div>

              {/* Step 1: Front-Row Disarm Option */}
              {!trapState.disarmAttempted && !trapState.saveRolled && trapDisarmer && (
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(180,150,100,0.2)' }}>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>
                    Step 1 — Front-Row Trap Detection ({trapDisarmer.name} #{trapDisarmer.marchingOrder})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--parch-200)', marginBottom: 8 }}>
                    {trapDisarmer.name} spots the mechanism and can attempt a Disarm Save vs. L{trapState.level} (adding +{trapOrLockMod(trapDisarmer, 'disarm', !hasLight)}).
                  </div>
                  <button
                    className="btn btn--moss"
                    onClick={() => {
                      const mod = trapOrLockMod(trapDisarmer, 'disarm', !hasLight)
                      const r = rollExploding(defaultRng, 6)
                      const total = r.total + mod
                      if (r.rolls[0] !== 1 && total >= trapState.level) {
                        const loot = trapState.hasTreasureAfter ? `\n\n${resolveAndAwardTreasure()}` : ''
                        setTrapState(null)
                        setOutcome({
                          title: `Trap Disarmed! (Rolled [${r.rolls.join('+')}] + ${mod} = ${total} vs L${trapState.level})`,
                          body: `${trapDisarmer.name} neutralizes the trap before it can spring!${loot}`,
                        })
                      } else {
                        setTrapState({
                          ...trapState,
                          disarmAttempted: true,
                          disarmNote: `${trapDisarmer.name} rolled [${r.rolls.join('+')}] + ${mod} = ${total} vs L${trapState.level} — Disarm failed! The trap springs!`,
                        })
                      }
                    }}
                  >
                    <IconDice size={16} /> Roll Disarm Save ({trapDisarmer.name} +{trapOrLockMod(trapDisarmer, 'disarm', !hasLight)})
                  </button>
                </div>
              )}

              {trapState.disarmNote && (
                <div style={{ fontSize: '0.8rem', color: 'var(--blood-300)' }}>
                  {trapState.disarmNote}
                </div>
              )}

              {/* Step 2: Threatened Hero Rolls Save to Avoid Trap */}
              {!trapState.saveRolled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="eyebrow">
                    {trapDisarmer && !trapState.disarmAttempted ? 'Or Skip Disarm & Roll Save:' : 'Step 2 — Roll Save to Avoid Trap:'}
                  </div>
                  <div className="chiprow">
                    {party
                      .filter((p) => p.status === 'alive')
                      .map((p) => (
                        <button
                          key={p.id}
                          className={`chip${trapState.targetPcId === p.id ? ' chip--amber' : ''}`}
                          onClick={() => setTrapState({ ...trapState, targetPcId: p.id })}
                        >
                          Target: #{p.marchingOrder} {p.name} ({p.life} HP)
                        </button>
                      ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn"
                      onClick={() => {
                        const victim = party.find((p) => p.id === trapState.targetPcId) ?? party[0]!
                        const mod =
                          (victim.classId === 'rogue' || victim.classId === 'halfling' || victim.classId === 'acrobat'
                            ? victim.level
                            : Math.floor(victim.level / 2)) + (hasLight ? 0 : -2)
                        const r = rollExploding(defaultRng, 6)
                        const total = r.total + mod
                        const success = r.rolls[0] !== 1 && total >= trapState.level
                        if (!success) {
                          partySt.setLife(victim.id, victim.life - trapState.damage)
                        }
                        setTrapState({
                          ...trapState,
                          saveRolled: true,
                          saveTotal: total,
                          saveSuccess: success,
                          saveNote: success
                            ? `${victim.name} rolled [${r.rolls.join('+')}] + ${mod} = ${total} vs L${trapState.level} — SAVED! Avoided all damage!`
                            : `${victim.name} rolled [${r.rolls.join('+')}] + ${mod} = ${total} vs L${trapState.level} — FAILED! Took ${trapState.damage} damage.`,
                        })
                      }}
                    >
                      <IconDice size={16} /> Roll Trap Save (vs L{trapState.level})
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Post-Save Reroll Options (Halfling Luck / Paladin Prayer / Rogue Evasion) or Continue */}
              {trapState.saveRolled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: trapState.saveSuccess ? 'var(--moss-200)' : 'var(--blood-300)',
                    }}
                  >
                    {trapState.saveNote}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!trapState.saveSuccess &&
                      party.some((p) => p.classId === 'halfling' && (p.resources.luck ?? 0) > 0) && (
                        <button
                          className="btn btn--moss"
                          onClick={() => {
                            const hlf = party.find((p) => p.classId === 'halfling' && (p.resources.luck ?? 0) > 0)!
                            partySt.spendResource(hlf.id, 'luck', 1)
                            const victim = party.find((p) => p.id === trapState.targetPcId) ?? party[0]!
                            partySt.setLife(victim.id, victim.life + trapState.damage)
                            setTrapState({ ...trapState, saveRolled: false, saveNote: `${hlf.name} spends 1 Luck — roll Trap Save again!` })
                          }}
                        >
                          Spend Halfling Luck to Reroll Save
                        </button>
                      )}
                    {!trapState.saveSuccess && paladinWithPrayer && (
                      <button
                        className="btn btn--moss"
                        onClick={() => {
                          partySt.spendResource(paladinWithPrayer.id, 'prayer', 1)
                          const victim = party.find((p) => p.id === trapState.targetPcId) ?? party[0]!
                          partySt.setLife(victim.id, victim.life + trapState.damage)
                          setTrapState({
                            ...trapState,
                            saveRolled: false,
                            saveNote: `${paladinWithPrayer.name} spends 1 Prayer point — roll Trap Save again!`,
                          })
                        }}
                      >
                        Spend Paladin Prayer to Reroll Save
                      </button>
                    )}
                    <button
                      className="btn"
                      onClick={() => {
                        const hadLoot = trapState.hasTreasureAfter
                        setTrapState(null)
                        if (hadLoot) {
                          setOutcome({
                            title: 'Treasure Chest Opened!',
                            body: resolveAndAwardTreasure(),
                          })
                        }
                      }}
                    >
                      {trapState.hasTreasureAfter ? 'Open Treasure Chest' : 'Continue'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Persistent Active Encounter Banner if pendingEncounter is active */}
          {d.pendingEncounter && (!outcome || outcome.action !== 'fight') && !trapState && (
            <div className="outcome outcome--fight">
              <div className="outcome__title">Hostile Foes Block Your Path!</div>
              <div className="outcome__body">
                {d.pendingEncounter.bossRollInfo ?? `A ${d.pendingEncounter.foeKind} encounter awaits in this chamber.`}
              </div>
              <div className="outcome__actions">
                <button className="btn" onClick={() => goFight()}>
                  <IconSword size={16} /> Enter Encounter
                </button>
              </div>
            </div>
          )}

          {/* Active Tile Outcome / Interactive Event Panel */}
          {outcome && !trapState && (
            <div className={`outcome${outcome.action === 'fight' ? ' outcome--fight' : ''}`}>
              <div className="outcome__title">{outcome.title}</div>
              <div className="outcome__body">{outcome.body}</div>
              <div className="outcome__actions">
                {outcome.action === 'fight' && (
                  <button className="btn" onClick={() => goFight()}>
                    <IconSword size={16} /> Enter Encounter
                  </button>
                )}
                {outcome.action === 'search' && current && !current.searched && (
                  <button className="btn btn--moss" onClick={onSearch}>
                    <IconSearch size={16} /> Search Tile (d6{current.corridor ? '-1' : ''})
                  </button>
                )}

                {outcome.action === 'found-choice' && (
                  <>
                    <button
                      className="btn btn--moss"
                      onClick={() => {
                        const r1 = rollNotation(defaultRng, '2d6') + hcl
                        const r2 = rollNotation(defaultRng, '2d6') + hcl
                        const gp = r1 * r2
                        partySt.addPartyGold(gp)
                        setOutcome({
                          title: 'Hidden Treasure Found!',
                          body: `Behind a loose flagstone you uncover (${r1} × ${r2}) = ${gp}gp! Added to party gold.`,
                        })
                      }}
                    >
                      <IconCoin size={15} /> Hidden Treasure
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        const target = party[0]
                        if (target) partySt.addClue(target.id)
                        setOutcome({
                          title: 'Clue Discovered!',
                          body: `${target?.name ?? 'Your party'} records +1 Clue (${(target?.clues ?? 0) + 1}/3 toward revealing a Secret).`,
                        })
                      }}
                    >
                      <IconEye size={15} /> +1 Clue
                    </button>
                    <button
                      className="btn btn--ghost"
                      onClick={() => {
                        const nextEnv: Environment =
                          d.environment === 'dungeon' ? 'caverns' : d.environment === 'caverns' ? 'fungal' : 'dungeon'
                        d.setEnvironment(nextEnv)
                        setOutcome({
                          title: 'Secret Passage!',
                          body: `You discover a hidden passage leading into the ${nextEnv.toUpperCase()}!`,
                        })
                      }}
                    >
                      <IconDoor size={15} /> Secret Passage
                    </button>
                  </>
                )}

                {outcome.action === 'statue-choice' && (
                  <>
                    <button
                      className="btn"
                      onClick={() => {
                        const r = rollDie(defaultRng, 6)
                        if (r <= 3) {
                          goFight('boss')
                        } else {
                          const gp = rollNotation(defaultRng, '3d6') * 10
                          partySt.addPartyGold(gp)
                          setOutcome({
                            title: `Statue Shatters (d6=${r})!`,
                            body: `Inside the hollow stone you find ${gp}gp!`,
                          })
                        }
                      }}
                    >
                      <IconDice size={15} /> Touch the Statue (d6)
                    </button>
                    <button className="btn btn--ghost" onClick={() => setOutcome(null)}>
                      Leave It Alone
                    </button>
                  </>
                )}

                {outcome.action === 'puzzle-choice' && (
                  <>
                    <button
                      className="btn btn--moss"
                      onClick={() => {
                        const solver =
                          party.find((p) => p.classId === 'wizard' || p.classId === 'rogue') ?? party[0]!
                        const pL = outcome.puzzleLevel ?? 4
                        const mod =
                          solver.classId === 'wizard' || solver.classId === 'rogue' ? solver.level : 0
                        const r = rollExploding(defaultRng, 6)
                        const total = r.total + mod
                        if (r.rolls[0] !== 1 && total >= pL) {
                          const loot = resolveAndAwardTreasure()
                          setOutcome({
                            title: `Puzzle Box Solved (${total} vs L${pL})!`,
                            body: `${solver.name} unlocks the box!\n\n${loot}`,
                          })
                        } else {
                          partySt.setLife(solver.id, solver.life - 1)
                          setOutcome({
                            title: `Puzzle Blast (${total} vs L${pL})!`,
                            body: `Energy zaps ${solver.name} for 1 damage! You can try again or leave it.`,
                            action: 'puzzle-choice',
                            puzzleLevel: pL,
                          })
                        }
                      }}
                    >
                      <IconDice size={15} /> Try to Solve Box
                    </button>
                    <button className="btn btn--ghost" onClick={() => setOutcome(null)}>
                      Leave It Alone
                    </button>
                  </>
                )}

                {outcome.action === 'healer-shop' && (
                  <>
                    {party.map((p) => (
                      <button
                        key={p.id}
                        className="btn btn--moss"
                        onClick={() => {
                          const totalGold = party.reduce((s, x) => s + x.gold, 0)
                          if (totalGold < 10) {
                            setCampMsg('Need 10gp to pay the Wandering Healer.')
                            return
                          }
                          partySt.addGold(party.find((x) => x.gold >= 10)?.id ?? p.id, -10)
                          partySt.setLife(p.id, p.life + 1)
                          setCampMsg(`Wandering Healer restores +1 Life to ${p.name} (-10gp).`)
                        }}
                      >
                        Heal {p.name} (+1 Life, 10gp)
                      </button>
                    ))}
                  </>
                )}

                {outcome.action === 'alchemist-shop' && (
                  <>
                    <button
                      className="btn btn--moss"
                      onClick={() => {
                        const target = party.find((p) => p.classId !== 'barbarian') ?? party[0]!
                        const totalGold = party.reduce((s, x) => s + x.gold, 0)
                        if (totalGold < 50) {
                          setCampMsg('Need 50gp for a Potion of Healing.')
                          return
                        }
                        partySt.addGold(party.find((x) => x.gold > 0)?.id ?? target.id, -50)
                        partySt.updateHero(target.id, {
                          inventory: [...target.inventory, 'healing-potion'],
                        })
                        setCampMsg(`Bought Potion of Healing (50gp) for ${target.name}!`)
                      }}
                    >
                      <IconPotion size={15} /> Buy Healing Potion (50gp)
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        const target = party[0]!
                        const totalGold = party.reduce((s, x) => s + x.gold, 0)
                        if (totalGold < 30) {
                          setCampMsg('Need 30gp for Blade Poison.')
                          return
                        }
                        partySt.addGold(party.find((x) => x.gold > 0)?.id ?? target.id, -30)
                        partySt.updateHero(target.id, {
                          activeEffects: [...target.activeEffects, 'envenomed-weapon'],
                        })
                        setCampMsg(`Applied Blade Poison (+1 Attack) to ${target.name}'s weapon!`)
                      }}
                    >
                      <IconSword size={15} /> Buy Blade Poison (30gp)
                    </button>
                  </>
                )}

                {outcome.action !== 'fight' && (
                  <button className="btn btn--ghost" onClick={() => setOutcome(null)}>
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ROOM ACTIONS: Search, Targeted Heal/Bless/Bandage, Rest, Exit at Entrance */}
          {current && !d.pendingEncounter && !trapState && (
            <div className="chiprow">
              {!current.searched && (
                <button className="chip chip--amber" onClick={onSearch}>
                  <IconSearch size={13} /> Search {current.corridor ? 'Corridor (d6-1)' : 'Room (d6)'}
                </button>
              )}
              {clericWithHeal && (
                <button
                  className="chip chip--amber"
                  onClick={() => setHealPicker({ kind: 'cleric-heal', actorId: clericWithHeal.id })}
                >
                  <IconPrayer size={13} /> {clericWithHeal.name}: Heal Ally ({clericWithHeal.resources.healing})
                </button>
              )}
              {clericWithBless && (
                <button
                  className="chip"
                  onClick={() => setHealPicker({ kind: 'cleric-blessing', actorId: clericWithBless.id })}
                >
                  <IconPrayer size={13} /> {clericWithBless.name}: Blessing ({clericWithBless.resources.blessing})
                </button>
              )}
              {paladinWithPrayer && (
                <button
                  className="chip chip--amber"
                  onClick={() => setHealPicker({ kind: 'paladin-heal', actorId: paladinWithPrayer.id })}
                >
                  <IconPrayer size={13} /> {paladinWithPrayer.name}: Lay on Hands ({paladinWithPrayer.resources.prayer})
                </button>
              )}
              {bandageHolder && (
                <button
                  className="chip"
                  onClick={() => setHealPicker({ kind: 'bandage', actorId: bandageHolder.id })}
                >
                  <IconHeart size={13} /> Apply Bandage
                </button>
              )}
              {!partySt.restedThisAdventure && (
                <button
                  className="chip"
                  onClick={() => {
                    const res = partySt.restParty()
                    setCampMsg(res.message)
                    if (rollDie(defaultRng, 6) === 1) {
                      setOutcome({
                        title: 'Wandering Monsters Interrupt Rest!',
                        body: `${res.message}\n\nAfter recovering, Wandering Monsters force the door!`,
                        action: 'fight',
                      })
                    }
                  }}
                >
                  <IconCamp size={13} /> Rest Party (1/Adv)
                </button>
              )}
              {isAtEntrance && (
                <button
                  className={`chip${d.finalBossSlain ? ' chip--amber' : ''}`}
                  onClick={() => {
                    const res = d.exitDungeon()
                    setCampMsg(res.message)
                  }}
                >
                  <IconDoor size={13} />
                  {d.finalBossSlain
                    ? 'Exit Dungeon Alive (Claim Victory!)'
                    : 'Exit Dungeon (Retreat to Town)'}
                </button>
              )}
            </div>
          )}

          {/* TARGET PICKER TRAY ON DUNGEON SCREEN */}
          {healPicker && (
            <div className="target-tray">
              <div className="eyebrow" style={{ color: 'var(--amber-200)', marginBottom: 6 }}>
                Choose Target Hero:
              </div>
              <div className="chiprow">
                {party.map((ally) => {
                  const cap = maxLife(getClass(ally.classId), ally.level, ally.traits)
                  return (
                    <button
                      key={ally.id}
                      className="chip chip--on"
                      onClick={() => {
                        let msg = ''
                        if (healPicker.kind === 'cleric-heal') {
                          msg = partySt.castHealingPrayer(healPicker.actorId, ally.id).message
                        } else if (healPicker.kind === 'cleric-blessing') {
                          msg = partySt.castBlessingPrayer(healPicker.actorId, ally.id).message
                        } else if (healPicker.kind === 'paladin-heal') {
                          msg = partySt.usePaladinHeal(healPicker.actorId, ally.id, 1).message
                        } else {
                          msg = partySt.useBandage(ally.id).message
                        }
                        setCampMsg(msg)
                        setHealPicker(null)
                      }}
                    >
                      #{ally.marchingOrder} {ally.name} ({ally.life}/{cap} HP)
                    </button>
                  )
                })}
                <button className="chip" onClick={() => setHealPicker(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {campMsg && (
            <div style={{ fontSize: '0.8rem', color: 'var(--amber-200)' }}>
              {campMsg}
            </div>
          )}

          {/* Door choice — the heart of navigation */}
          {current && !d.pendingEncounter && !trapState && (
            <>
              <div className="sect">Choose an Exit Door (or Tap Door on Map)</div>
              <div className="doorgroup">
                {open.map((door) => (
                  <button
                    key={`${door.y},${door.x}`}
                    className="doorbtn doorbtn--new"
                    onClick={() => onDoor(door)}
                  >
                    <span className="doorbtn__dir">
                      <IconDoor size={15} /> {DIR_NAME[door.dir]} Doorway
                    </span>
                    <span className="doorbtn__hint">unexplored chamber (reveal next room)</span>
                  </button>
                ))}
                {back.map((door) => (
                  <button
                    key={`${door.y},${door.x}`}
                    className="doorbtn doorbtn--back"
                    onClick={() => onDoor(door)}
                  >
                    <span className="doorbtn__dir">
                      <IconDoor size={15} /> {DIR_NAME[door.dir]} Doorway
                    </span>
                    <span className="doorbtn__hint">retrace steps (1-in-6 Wandering Monsters)</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </ScreenShell>
  )
}
