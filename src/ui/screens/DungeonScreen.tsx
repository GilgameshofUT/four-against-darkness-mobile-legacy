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
import { partyHasLight, pcProvidesLight } from '../../state/pc'
import type { RandTable } from '../../data/schema'

const DIR_NAME: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' }

function getTable(id: string): RandTable | undefined {
  return tables.find((t) => t.id === id)
}
function rollTableEntry(t: RandTable): { index: number; result: string } {
  const idx = rollDie(defaultRng, t.entries.length) - 1
  return { index: idx + 1, result: t.entries[idx]?.result ?? '' }
}

interface Outcome {
  title: string
  body: string
  action?: 'fight' | 'search' | 'found-choice' | 'statue-choice' | 'puzzle-choice' | 'healer-shop' | 'alchemist-shop' | 'trap-disarm' | undefined
  trapLevel?: number
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
  const [confirmClear, setConfirmClear] = useState(false)
  const [campMsg, setCampMsg] = useState<string | null>(null)

  const hcl = Math.max(1, partyHcl(party))
  const current = d.tiles.find((t) => t.id === d.currentId)
  const isAtEntrance = d.tiles.length > 0 && d.currentId === d.tiles[0]!.id
  const hasLight = partyHasLight(party)
  const lightBearer = party.find((p) => pcProvidesLight(p))

  // Check if a Rogue/Gnome/Kukla is in front row (#1 or #2) to disarm traps (Book p. 110 & p. 164)
  const trapDisarmer = party.find(
    (p) =>
      p.status === 'alive' &&
      p.marchingOrder <= 2 &&
      (p.classId === 'rogue' || p.classId === 'gnome' || p.classId === 'kukla'),
  )

  /** Award rolled treasure gold/items to the party and return a descriptive summary. */
  const resolveAndAwardTreasure = (): string => {
    const t = getTable('treasure')!
    const r = rollTableEntry(t)
    let gpEarned = 0
    if (r.index === 1) gpEarned = rollDie(defaultRng, 6)
    else if (r.index === 2) gpEarned = rollNotation(defaultRng, '2d6')
    else if (r.index === 4) gpEarned = rollNotation(defaultRng, '2d6') * 5
    else if (r.index === 5) gpEarned = rollNotation(defaultRng, '3d6') * 10
    else if (r.index === 6) gpEarned = 50

    // Dwarf Gold Nose trait option: maximize random gp once per adventure
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
      return `${r.result}\n\n💰 Awarded +${gpEarned}gp to the party!`
    }
    if (r.index === 3) {
      // Scroll found! Give to Wizard/Elf/Caster or first PC
      const recipient = party.find((p) => p.classId === 'wizard' || p.classId === 'elf') ?? party[0]
      if (recipient) {
        partySt.updateHero(recipient.id, {
          inventory: [...recipient.inventory, 'scroll-of-blessing'],
        })
      }
      return `${r.result}\n\n📜 Added Scroll to ${recipient?.name ?? 'party'}'s backpack!`
    }
    return r.result
  }

  const resolveSpecialFeature = (env: Environment): Outcome => {
    const et = ENV_TABLES[env]
    const r = rollTableEntry(getTable(et.feature)!)
    if (env === 'dungeon') {
      if (r.index === 1) {
        // Fountain: heals 1 Life to all wounded PCs the first time
        if (!d.fountainUsed) {
          for (const p of party) {
            if (p.status === 'alive') partySt.setLife(p.id, p.life + 1)
          }
          useDungeon.setState({ fountainUsed: true })
          return {
            title: 'Special Feature: Fountain',
            body: `${r.result}\n\n💧 All wounded heroes recover +1 Life!`,
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
          body: `${r.result}\n\n✨ ${target?.name ?? 'Hero'} gains +1 Attack vs Undead and Demons!`,
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
          body: `${r.result}\n\n⚠️ ${victim?.name ?? 'A hero'} is cursed (-1 Defense until Blessed)!`,
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

  const resolveSpecialEvent = (env: Environment): Outcome => {
    const et = ENV_TABLES[env]
    const r = rollTableEntry(getTable(et.event)!)
    if (env === 'dungeon') {
      if (r.index === 2) {
        return { title: 'Special Event: Wandering Monsters!', body: r.result, action: 'fight' }
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
    const et = ENV_TABLES[env]
    const rollTag = d2d6 ? ` (2d6 = ${d2d6})` : ''
    if (kind === 'foe' || kind === 'dragon-lair') {
      const pending = useDungeon.getState().pendingEncounter
      setOutcome({
        title: pending?.isFinalBoss ? `🔥 FINAL BOSS ENCOUNTER!${rollTag}` : `Encounter!${rollTag}`,
        body:
          (pending?.bossRollInfo ? `${pending.bossRollInfo}\n\n` : '') +
          (kind === 'dragon-lair' ? 'A dragon guards this lair!' : 'Foes block your path.'),
        action: 'fight',
      })
    } else if (kind === 'empty') {
      setOutcome({
        title: `Empty Tile${rollTag}`,
        body: hasLight
          ? 'Nothing immediately visible — you may Search this tile (d6) or choose your next exit.'
          : '🌑 It is pitch dark! Without a light source you cannot Search this tile.',
        action: hasLight ? 'search' : undefined,
      })
    } else if (kind === 'treasure') {
      setOutcome({
        title: `Treasure!${rollTag}`,
        body: resolveAndAwardTreasure(),
      })
    } else if (kind === 'treasure-trap') {
      const trapRoll = rollTableEntry(getTable(et.trap)!)
      const trapL = hcl + 2
      if (trapDisarmer) {
        setOutcome({
          title: `Trap Spotted!${rollTag}`,
          body: `${trapRoll.result}\n\n${trapDisarmer.name} (#${trapDisarmer.marchingOrder}) can attempt to Disarm the Trap (Save vs L${trapL}) before it triggers!`,
          action: 'trap-disarm',
          trapLevel: trapL,
        })
      } else {
        // Trigger trap damage on front-row PC (#1), then award treasure
        const leader = party[0]
        if (leader) partySt.setLife(leader.id, leader.life - 1)
        const lootText = resolveAndAwardTreasure()
        setOutcome({
          title: `Trapped Treasure!${rollTag}`,
          body: `Trap — ${trapRoll.result} (${leader?.name ?? 'Leader'} takes 1 damage!)\n\nLoot — ${lootText}`,
        })
      }
    } else if (kind === 'special-feature') {
      setOutcome(resolveSpecialFeature(env))
    } else if (kind === 'special-event') {
      setOutcome(resolveSpecialEvent(env))
    }
  }

  /** Launch combat in the Combat store and switch to the Encounter screen. */
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

  /** The player picks a door: walk back through a known one, or into the dark. */
  const onDoor = (door: DoorRef) => {
    setCampMsg(null)
    const prevId = d.currentId
    d.chooseDoor(d.currentId!, door.y, door.x)
    const st = useDungeon.getState()

    if (st.lastMessage) {
      setOutcome({
        title: st.pendingEncounter ? 'Rear Ambush!' : 'Notice',
        body: st.lastMessage,
        action: st.pendingEncounter ? 'fight' : undefined,
      })
      return
    }
    if (st.currentId === prevId) return
    const cur = st.tiles.find((t) => t.id === st.currentId)
    if (!cur) return
    if (st.pendingEncounter) {
      showContent(cur.content.kind, cur.environment, cur.contentRoll2d6)
      return
    }
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
    // Check Dwarf Underground Explorer (+1 in dungeon/caverns) or Wizard Keen Observer (+1)
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

  if (party.length < 4) {
    return (
      <ScreenShell
        eyebrow="Party Incomplete"
        title="Assemble Your Party First"
        subtitle={`You have ${party.length}/4 adventurers recruited.`}
      >
        <div className="scaffold-note">
          Before entering the dungeon, recruit all <b>4 heroes</b>, choose their starting loadouts and spells, and verify someone carries a <b>Lantern</b>.
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <button className="btn btn--moss" onClick={() => setTab('party')}>
              Go to Party Creation ({party.length}/4) →
            </button>
          </div>
        </div>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell
      eyebrow={`Random Dungeon · HCL ${hcl} · Major Foes: ${d.majorFoesMet}${d.finalBossSlain ? ' · 🏆 BOSS SLAIN' : ''}`}
      title="The Sunless Warrens"
      subtitle={
        d.started
          ? `${d.tiles.length} tiles · ${d.environment} · ${
              hasLight ? `🕯️ Light: ${lightBearer?.name}` : '🌑 DARKNESS (-2 all rolls!)'
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
          marginBottom: 'var(--sp-2)',
        }}
      >
        {party.map((p) => {
          const lit = pcProvidesLight(p)
          return (
            <button
              key={p.id}
              className="chip"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '4px 6px',
                borderColor: lit ? 'var(--amber-400)' : 'var(--line)',
              }}
              onClick={() => setTab('party')}
              title="Tap to inspect Play Sheet, hands, or swap Marching Order"
            >
              <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                #{p.marchingOrder} {p.marchingOrder <= 2 ? 'Front' : 'Rear'} {lit ? '🕯️' : ''}
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--parch-100)' }}>
                {p.name}
              </span>
              <span style={{ fontSize: '0.7rem', color: p.life <= 2 ? 'var(--blood-300)' : 'var(--amber-200)' }}>
                ❤️ {p.life} · 💰 {p.gold}g
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
            {e}
          </button>
        ))}
      </div>

      {!d.started ? (
        <div className="scaffold-note">
          <div>
            Your mission: explore the dungeon door-by-door, track <b>Major Foes</b> (each rolls{' '}
            <code>d6 + prior Major Foes ≥ 6</code> to reveal the <b>Final Boss</b>), slay the Final Boss, and <b>return to the Entrance Tile alive</b>.
          </div>
          {!hasLight && (
            <div style={{ color: 'var(--blood-300)', marginTop: 8, fontSize: '0.82rem' }}>
              ⚠️ Nobody in your party has a light source equipped! You will fight and explore at -2 in pitch darkness unless you buy/equip a Lantern on the Party tab.
            </div>
          )}
          <div style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn--moss"
              onClick={() => {
                d.start()
                setOutcome({
                  title: 'Entrance Room Placed (Tile #1)',
                  body: 'You step into the first room of the dungeon. Choose an exit door below to delve into the dark.',
                })
              }}
            >
              Enter the Dungeon
            </button>
            {!hasLight && (
              <button className="btn btn--ghost" onClick={() => setTab('party')}>
                Equip Lantern First →
              </button>
            )}
          </div>
        </div>
      ) : d.escapedAlive ? (
        <div className="scaffold-note">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-display)', color: 'var(--amber-200)' }}>
            {d.finalBossSlain ? '🏆 Expedition Victory!' : 'Expedition Concluded'}
          </h3>
          <p>
            {d.finalBossSlain
              ? 'Your party slew the Final Boss of the Sunless Warrens and made it back to the surface alive with their loot!'
              : 'Your party retreated safely to the surface to tend their wounds and resupply.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
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
            <TileMap height={220} />
          </div>

          {current && (
            <div className="tileinfo">
              <span className="eyebrow">{isAtEntrance ? 'Entrance (#1)' : 'Current Tile'}</span>
              <span>
                {current.corridor ? 'Corridor (1-wide: #1&#2 melee)' : 'Room (All 4 melee)'} ·{' '}
                {current.searched ? 'searched' : 'unsearched'} · {current.environment}
              </span>
              <button
                className={`tileinfo__clear${confirmClear ? ' is-armed' : ''}`}
                onClick={() => {
                  if (confirmClear) {
                    d.reset()
                    setOutcome(null)
                    setConfirmClear(false)
                  } else setConfirmClear(true)
                }}
                title="Reset the dungeon"
              >
                {confirmClear ? 'Sure?' : 'Reset'}
              </button>
            </div>
          )}

          {/* Active Tile Outcome / Interactive Event Panel */}
          {outcome && (
            <div className={`outcome${outcome.action === 'fight' ? ' outcome--fight' : ''}`} style={{ marginBottom: 'var(--sp-3)' }}>
              <div className="outcome__title">{outcome.title}</div>
              <div className="outcome__body" style={{ whiteSpace: 'pre-line' }}>{outcome.body}</div>
              <div className="outcome__actions" style={{ flexWrap: 'wrap' }}>
                {outcome.action === 'fight' && (
                  <button className="btn" onClick={() => goFight()}>
                    ⚔️ Enter Encounter
                  </button>
                )}
                {outcome.action === 'search' && current && !current.searched && (
                  <button className="btn btn--moss" onClick={onSearch}>
                    🔍 Search Tile (d6{current.corridor ? '-1' : ''})
                  </button>
                )}

                {/* Search 5-6 Discovery Choices (Book p. 107) */}
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
                          body: `Behind a loose stone you uncover (${r1} × ${r2}) = ${gp}gp! Added to party gold.`,
                        })
                      }}
                    >
                      💰 Hidden Treasure
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
                      👁️ +1 Clue
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
                      🕳️ Secret Passage
                    </button>
                  </>
                )}

                {/* Trap Disarm Choice for Front-Row Rogue/Gnome/Kukla */}
                {outcome.action === 'trap-disarm' && trapDisarmer && (
                  <button
                    className="btn btn--moss"
                    onClick={() => {
                      const tL = outcome.trapLevel ?? hcl + 2
                      const mod = trapOrLockMod(trapDisarmer, 'disarm', !hasLight)
                      const r = rollExploding(defaultRng, 6)
                      const total = r.total + mod
                      const loot = resolveAndAwardTreasure()
                      if (r.rolls[0] !== 1 && total >= tL) {
                        setOutcome({
                          title: `Trap Disarmed (${total} vs L${tL})!`,
                          body: `${trapDisarmer.name} deftly disarms the mechanism!\n\n${loot}`,
                        })
                      } else {
                        partySt.setLife(trapDisarmer.id, trapDisarmer.life - 1)
                        setOutcome({
                          title: `Disarm Failed (${total} vs L${tL})!`,
                          body: `The trap springs on ${trapDisarmer.name} (-1 Life)!\n\n${loot}`,
                        })
                      }
                    }}
                  >
                    🛠️ Disarm Trap with {trapDisarmer.name}
                  </button>
                )}

                {/* Statue Choice (Book p. 153) */}
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
                      ✋ Touch the Statue (d6)
                    </button>
                    <button className="btn btn--ghost" onClick={() => setOutcome(null)}>
                      Leave It Alone
                    </button>
                  </>
                )}

                {/* Puzzle Box Choice (Book p. 153) */}
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
                      🧩 Try to Solve Box
                    </button>
                    <button className="btn btn--ghost" onClick={() => setOutcome(null)}>
                      Leave It Alone
                    </button>
                  </>
                )}

                {/* Wandering Healer Shop (Book p. 154: 10gp per Life) */}
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

                {/* Wandering Alchemist Shop (Book p. 154: Potion 50gp, Blade Poison 30gp) */}
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
                      🧪 Buy Healing Potion (50gp)
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
                      🗡️ Buy Blade Poison (30gp)
                    </button>
                  </>
                )}

                {outcome.action !== 'fight' && (
                  <button className="btn btn--ghost" onClick={() => setOutcome(null)}>
                    Continue
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ROOM ACTIONS: Search, Rest, Exit at Entrance */}
          {current && !d.pendingEncounter && (
            <div className="chiprow" style={{ marginBottom: 'var(--sp-3)' }}>
              {!current.searched && (
                <button className="chip chip--amber" onClick={onSearch}>
                  🔍 Search {current.corridor ? 'Corridor (d6-1)' : 'Room (d6)'}
                </button>
              )}
              {!partySt.restedThisAdventure && (
                <button
                  className="chip"
                  onClick={() => {
                    const res = partySt.restParty()
                    setCampMsg(res.message)
                    // 1-in-6 chance of Wandering Monsters when resting (Book p. 114)
                    if (rollDie(defaultRng, 6) === 1) {
                      setOutcome({
                        title: 'Wandering Monsters Interrupt Rest!',
                        body: `${res.message}\n\nAfter recovering, Wandering Monsters force the door!`,
                        action: 'fight',
                      })
                    }
                  }}
                >
                  ⛺ Rest Party (1/Adv)
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
                  {d.finalBossSlain
                    ? '🏆 Exit Dungeon Alive (Complete Mission!)'
                    : '🚪 Exit Dungeon (Retreat to Town)'}
                </button>
              )}
            </div>
          )}

          {campMsg && (
            <div style={{ fontSize: '0.8rem', color: 'var(--amber-200)', marginBottom: 'var(--sp-2)' }}>
              {campMsg}
            </div>
          )}

          {/* Door choice — the heart of navigation */}
          {current && !d.pendingEncounter && (
            <>
              <div className="sect">Choose an Exit Door</div>
              <div className="doorgroup">
                {open.map((door) => (
                  <button
                    key={`${door.y},${door.x}`}
                    className="doorbtn doorbtn--new"
                    onClick={() => onDoor(door)}
                  >
                    <span className="doorbtn__dir">{DIR_NAME[door.dir]} Door</span>
                    <span className="doorbtn__hint">open into the unexplored dark (roll d66 + 2d6)</span>
                  </button>
                ))}
                {back.map((door) => (
                  <button
                    key={`${door.y},${door.x}`}
                    className="doorbtn doorbtn--back"
                    onClick={() => onDoor(door)}
                  >
                    <span className="doorbtn__dir">{DIR_NAME[door.dir]} Door</span>
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
