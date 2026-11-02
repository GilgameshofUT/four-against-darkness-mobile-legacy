import { useEffect, useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { tables } from '../../data/tables'
import { spells } from '../../data/spells'
import { rollDie, rollNotation, defaultRng } from '../../core/dice'
import { fullAttackModVs, type FoeContext } from '../../core/modifiers'
import { useCombat } from '../../state/combat'
import { useDungeon, type Environment } from '../../state/dungeon'
import { partyHcl, useParty } from '../../state/party'
import { canCastSpellsNow, derive, partyHasLight, type PC } from '../../state/pc'
import { useUi } from '../../state/ui'
import type { FoeKind } from '../../data/schema'

const KINDS: FoeKind[] = ['vermin', 'minion', 'weird', 'boss']

export function CombatScreen() {
  const combat = useCombat()
  const dungeon = useDungeon()
  const partySt = useParty()
  const party = partySt.party
  const setTab = useUi((s) => s.setTab)
  const [env, setEnv] = useState<Environment>(dungeon.environment)
  const [kind, setKind] = useState<FoeKind>('minion')
  const [lootText, setLootText] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const hcl = Math.max(1, partyHcl(party))
  const hasLight = partyHasLight(party)

  // Auto-start pending encounter from Dungeon screen if not already active
  useEffect(() => {
    if (dungeon.pendingEncounter && !combat.active) {
      const p = dungeon.pendingEncounter
      combat.begin(p.foeKind, dungeon.environment, hcl, {
        inCorridor: p.inCorridor,
        wandering: Boolean(p.wandering),
        isFinalBoss: Boolean(p.isFinalBoss),
        ...(p.bossRollInfo ? { bossRollInfo: p.bossRollInfo } : {}),
      })
      dungeon.clearEncounter()
    }
  }, [dungeon, combat, hcl])

  const foe = combat.foes.find((f) =>
    f.kind === 'vermin' || f.kind === 'minion' ? (f.remaining ?? 0) > 0 : (f.life ?? 0) > 0,
  )
  const anyFoeRecord = combat.foes[0]
  const allDead = combat.active && !foe
  const minor = foe && (foe.kind === 'vermin' || foe.kind === 'minion')
  const underHalf =
    minor && foe && !foe.moraleTested && (foe.remaining ?? 0) <= Math.floor((foe.initial ?? 1) / 2)

  const aliveParty = party.filter((p) => p.status === 'alive')
  const foeCtx: FoeContext | null = foe
    ? { name: foe.name, tags: foe.tags, kind: minor ? 'minor' : 'major', count: foe.remaining ?? 1 }
    : null

  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  const pcRollLabel = (pc: PC) => {
    if (!foeCtx) return null
    const d = derive(pc)
    const die = [6, 8, 10, 12, 20][d.tier - 1] ?? 6
    const mod = fullAttackModVs(pc, foeCtx, aliveParty.length || 4, { inDarkness: !hasLight }).total
    return `d${die}${fmt(mod)}`
  }

  const rollLootAndFinish = () => {
    const t = tables.find((x) => x.id === 'treasure')!
    const idx = rollDie(defaultRng, t.entries.length) - 1
    const entry = t.entries[idx]
    let gp = 0
    if (idx === 1) gp = rollDie(defaultRng, 6)
    else if (idx === 2) gp = rollNotation(defaultRng, '2d6')
    else if (idx === 4) gp = rollNotation(defaultRng, '2d6') * 5
    else if (idx === 5) gp = rollNotation(defaultRng, '3d6') * 10
    else if (idx === 6) gp = 40

    if (anyFoeRecord?.isFinalBoss) {
      // Book p. 105: Final Boss gp Treasure is tripled or increased to 100gp, whichever is best!
      gp = Math.max(100, gp * 3)
      dungeon.noteFinalBossSlain()
    }

    if (gp > 0) {
      partySt.addPartyGold(gp)
    }
    setLootText(
      `${entry?.result ?? 'Treasure collected.'}${
        gp > 0 ? `\n\n💰 Added +${gp}gp to party gold!` : ''
      }${
        anyFoeRecord?.isFinalBoss
          ? '\n\n🏆 FINAL BOSS SLAIN! Return to the Entrance Tile (#1) to exit the dungeon alive and claim victory!'
          : ''
      }`,
    )
    combat.markLoot()
  }

  const dwarfInParty = aliveParty.find((p) => p.classId === 'dwarf')
  const halflingInParty = aliveParty.find((p) => p.classId === 'halfling' && (p.resources.luck ?? 0) > 0)

  return (
    <ScreenShell
      eyebrow={`Encounter · HCL ${hcl} · ${combat.inCorridor ? 'Corridor (1-Wide)' : 'Room'}${
        !hasLight ? ' · 🌑 DARKNESS (-2)' : ' · 🕯️ Lit'
      }`}
      title="Clash of Steel"
      subtitle={
        combat.active
          ? `Round ${combat.round} · ${combat.environment}`
          : 'Encounters trigger automatically in the dungeon, or roll a custom test fight below.'
      }
      actions={
        combat.active ? (
          <button
            className="btn btn--ghost"
            onClick={() => {
              combat.clear()
              setLootText(null)
              if (dungeon.started) setTab('dungeon')
            }}
          >
            {dungeon.started ? '← Map' : 'End'}
          </button>
        ) : undefined
      }
    >
      {!combat.active && !lootText && (
        <div className="picker">
          <div className="eyebrow">Environment</div>
          <div className="chiprow">
            {(['dungeon', 'caverns', 'fungal'] as Environment[]).map((e) => (
              <button key={e} className={`chip${env === e ? ' chip--amber' : ''}`} onClick={() => setEnv(e)}>
                {e}
              </button>
            ))}
          </div>
          <div className="eyebrow">Foe Tier</div>
          <div className="chiprow">
            {KINDS.map((k) => (
              <button key={k} className={`chip${kind === k ? ' chip--on' : ''}`} onClick={() => setKind(k)}>
                {k}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={() => {
                combat.begin(kind, env, hcl)
                setLootText(null)
              }}
            >
              Roll Encounter
            </button>
            {dungeon.started && (
              <button className="btn btn--moss" onClick={() => setTab('dungeon')}>
                ← Back to Dungeon Map
              </button>
            )}
          </div>
        </div>
      )}

      {foe && (
        <div className="foecard">
          <div className="foecard__head">
            <div>
              <div className="eyebrow">
                {foe.kind} · L{foe.level}
                {foe.woundedPenaltyApplied ? ' (Wounded <50% HP: -1 L!)' : ''} · Morale: {foe.morale}
              </div>
              <h3 className="foecard__name">{foe.name}</h3>
            </div>
            <div className="foecard__vital">
              {minor ? (
                <>
                  <span className="eyebrow">Remaining</span>
                  <span className="foecard__num">
                    {foe.remaining}/{foe.initial}
                  </span>
                </>
              ) : (
                <>
                  <span className="eyebrow">Life</span>
                  <span className="foecard__num">
                    {foe.life}/{foe.maxLife}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="foecard__react">
            Reaction: <b>{foe.reactionLabel}</b> · Attacks/turn: <b>{minor ? ( combat.inCorridor ? `Up to 2 (Corridor)` : foe.remaining ) : foe.attacks}</b> · Damage: <b>{foe.damage}</b>
          </div>
          {foe.text && <p className="foecard__text">{foe.text}</p>}
          {combat.goldSensePreview && (
            <div style={{ fontSize: '0.78rem', color: 'var(--amber-200)', marginTop: 6 }}>
              💎 {combat.goldSensePreview}
            </div>
          )}
        </div>
      )}

      {/* STEP 1 OF INITIATIVE FLOWCHART (Book p. 146): PRE-COMBAT APPROACH CHOICE */}
      {combat.active && foe && combat.phase === 'approach' && (
        <div className="outcome" style={{ marginBottom: 'var(--sp-3)' }}>
          <div className="outcome__title">Initiative Flowchart (Book p. 146): You Spot the Foes!</div>
          <div className="outcome__body">
            The Foes have not surprised you. Do you <b>attack immediately</b> (PCs strike first), <b>wait to see their Reaction</b> ({foe.reactions}), or <b>attempt Stealth</b>?
          </div>
          <div className="outcome__actions" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button className="btn" onClick={() => combat.chooseAttackImmediately()}>
              ⚔️ Attack Immediately (PCs Go First)
            </button>
            <button className="btn btn--moss" onClick={() => combat.chooseWaitForReaction(hcl)}>
              🎲 Wait & Check Reaction
            </button>
            {!combat.wandering && (
              <>
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    const res = combat.chooseAttemptStealth('ambush')
                    setActionMsg(res.message)
                  }}
                >
                  🥷 Stealth Ambush (-1 Foe L)
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    const res = combat.chooseAttemptStealth('sneak-past')
                    setActionMsg(res.message)
                  }}
                >
                  👣 Sneak Past Quietly
                </button>
              </>
            )}
            {dwarfInParty && !combat.goldSensePreview && (
              <button
                className="btn btn--ghost"
                onClick={() => {
                  const res = combat.useDwarfGoldSense(dwarfInParty.id)
                  setActionMsg(res.message)
                }}
              >
                💎 {dwarfInParty.name}'s Gold Sense (Save vs L6)
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 1B: INTERACTIVE REACTION RESOLUTION (Bribe, Blood Offering, Puzzle, Magic Challenge, Peaceful) */}
      {combat.active && foe && combat.phase === 'reaction-choice' && (
        <div className="outcome" style={{ marginBottom: 'var(--sp-3)' }}>
          <div className="outcome__title">Foe Reaction: {foe.reactionLabel}</div>
          <div className="outcome__body">
            Choose whether to satisfy their Reaction or fight (if you fight now, Foes attack first per Book p. 90).
          </div>
          <div className="outcome__actions" style={{ flexWrap: 'wrap', gap: 8 }}>
            {/bribe/i.test(foe.reactionLabel) && (
              <button
                className="btn btn--moss"
                onClick={() => {
                  const isFood = /food|ration/i.test(foe.reactionLabel)
                  const res = isFood ? combat.payBribe(undefined, 4) : combat.payBribe()
                  setActionMsg(res.message)
                }}
              >
                💰 Pay Bribe ({foe.reactionLabel})
              </button>
            )}
            {/blood offering/i.test(foe.reactionLabel) &&
              aliveParty.map((p) => (
                <button
                  key={p.id}
                  className="btn btn--moss"
                  onClick={() => setActionMsg(combat.payBloodOffering(p.id).message)}
                >
                  🩸 {p.name} Gives Blood (-2 Life)
                </button>
              ))}
            {/puzzle/i.test(foe.reactionLabel) &&
              aliveParty.map((p) => (
                <button
                  key={p.id}
                  className="btn btn--moss"
                  onClick={() => setActionMsg(combat.attemptPuzzleReaction(p.id).message)}
                >
                  🧩 {p.name} Solves Puzzle
                </button>
              ))}
            {/magic challenge/i.test(foe.reactionLabel) &&
              aliveParty.map((p) => (
                <button
                  key={p.id}
                  className="btn btn--moss"
                  onClick={() => setActionMsg(combat.attemptMagicChallenge(p.id).message)}
                >
                  ✡️ {p.name} Accepts Magic Duel
                </button>
              ))}
            {/peaceful|ignore|quest/i.test(foe.reactionLabel) && (
              <button className="btn btn--moss" onClick={() => combat.acceptPeacefulPass()}>
                🕊️ Pass Peacefully
              </button>
            )}
            <button
              className="btn"
              onClick={() => {
                combat.foeTurn(hcl)
              }}
            >
              ⚔️ Refuse & Fight (Foes Attack First)
            </button>
          </div>
        </div>
      )}

      {/* FOE SURPRISE / FOE TURN PROMPT */}
      {combat.active && foe && combat.phase === 'foe-turn' && (
        <div className="outcome outcome--fight" style={{ marginBottom: 'var(--sp-3)' }}>
          <div className="outcome__title">Foes Strike First!</div>
          <div className="outcome__body">
            Resolve the Foes' attacks against your party's Defense rolls before taking your turn.
          </div>
          <div className="outcome__actions">
            <button className="btn" onClick={() => combat.foeTurn(hcl)}>
              🛡️ Roll Party Defense vs {foe.name}
            </button>
          </div>
        </div>
      )}

      {/* MORALE CHECK PROMPT */}
      {underHalf && foe && (
        <div className="outcome" style={{ marginBottom: 'var(--sp-2)' }}>
          <div className="outcome__title">Foes Reduced to Half or Fewer!</div>
          <div className="outcome__body">
            Book p. 94: Roll 1d6 Morale for {foe.name} (1–3 they flee and leave their Treasure!).
          </div>
          <div className="outcome__actions">
            <button className="btn btn--moss" onClick={() => combat.tryMorale(foe.uid)}>
              🎲 Roll Foe Morale (d6)
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PC TURN — CHOOSE WHICH HERO ACTS NEXT */}
      {combat.active && foe && combat.phase === 'pc-turn' && (
        <>
          <div className="sect">
            Party Turn — Tap Heroes in Any Tactical Order ({combat.pcsActed.size}/{aliveParty.length} acted)
          </div>
          <div className="pcactlist">
            {party.map((pc) => {
              const d = derive(pc)
              const done = combat.pcsActed.has(pc.id) || pc.status !== 'alive'
              const meleeCheck = combat.canPcMelee(pc)
              const spellCheck = canCastSpellsNow(pc)
              const uniquePrepared = Array.from(new Set(pc.preparedSpells))

              return (
                <div
                  key={pc.id}
                  className={`pcact${done ? ' is-done' : ''}`}
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="pcact__who">
                      <span className="pcact__name">
                        #{pc.marchingOrder} {pc.name}
                      </span>
                      <span className="eyebrow">
                        {d.cls.name} L{pc.level} · ❤️ {pc.life}/{d.maxLife} · Def {d.defenseRoll}
                      </span>
                    </div>
                    {done && <span className="chip">Acted</span>}
                  </div>

                  {/* Primary Attack, Rage, Smite & Spell Buttons */}
                  <div className="pcact__btns" style={{ flexWrap: 'wrap' }}>
                    <button
                      className="btn"
                      disabled={done || !meleeCheck.ok}
                      title={meleeCheck.reason ?? `Attack with ${d.weaponName}`}
                      onClick={() => combat.attack(pc, foe.uid)}
                    >
                      ⚔️ {pcRollLabel(pc) ?? d.attackRoll}
                    </button>

                    {/* Barbarian Rage Attack */}
                    {pc.classId === 'barbarian' && (pc.resources.rage ?? 0) > 0 && (
                      <button
                        className="btn btn--moss"
                        disabled={done || !meleeCheck.ok}
                        onClick={() => combat.attack(pc, foe.uid, undefined, false, { rage: true })}
                      >
                        🔥 Rage ({pc.resources.rage})
                      </button>
                    )}

                    {/* Paladin Divine Smite */}
                    {pc.classId === 'paladin' && (pc.resources.smite ?? 0) > 0 && (
                      <button
                        className="btn btn--moss"
                        disabled={done || !meleeCheck.ok}
                        onClick={() => combat.attack(pc, foe.uid, undefined, false, { smite: true })}
                      >
                        ⚡ Smite (3 dmg)
                      </button>
                    )}

                    {/* Prepared Spell Picker Buttons */}
                    {uniquePrepared.map((sid) => {
                      const sp = spells.find((s) => s.id === sid)
                      const count = pc.preparedSpells.filter((x) => x === sid).length
                      return (
                        <button
                          key={sid}
                          className="btn btn--moss"
                          disabled={done || !spellCheck.ok}
                          title={spellCheck.reason ?? sp?.text}
                          onClick={() => combat.castSpell(pc, foe.uid, undefined, sid)}
                        >
                          ✡️ {sp?.name ?? sid} ({count})
                        </button>
                      )
                    })}

                    {/* Legacy fallback if spellSlots > 0 but preparedSpells empty */}
                    {uniquePrepared.length === 0 && (pc.resources.spellSlots ?? 0) > 0 && (
                      <button
                        className="btn btn--moss"
                        disabled={done}
                        onClick={() => combat.castSpell(pc, foe.uid)}
                      >
                        ✡️ Cast ({pc.resources.spellSlots})
                      </button>
                    )}

                    {/* Class Combat Abilities */}
                    {pc.classId === 'acrobat' && (pc.resources.tricks ?? 0) > 0 && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() => setActionMsg(combat.useCombatAbility(pc, 'distract', foe.uid).message)}
                      >
                        🤸 Distract (-{d.tier}L, {pc.resources.tricks} left)
                      </button>
                    )}

                    {pc.classId === 'illusionist' && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() =>
                          setActionMsg(combat.useCombatAbility(pc, 'distracting-lights', foe.uid).message)
                        }
                      >
                        ✨ Distracting Lights (-{d.tier}L)
                      </button>
                    )}

                    {pc.classId === 'mushroom-monk' && (pc.resources.spores ?? 0) > 0 && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() => setActionMsg(combat.useCombatAbility(pc, 'spores', foe.uid).message)}
                      >
                        🍄 Spores (-1L, {pc.resources.spores})
                      </button>
                    )}

                    {pc.classId === 'gnome' && (pc.resources.gadget ?? 0) > 0 && (
                      <>
                        <button
                          className="chip chip--amber"
                          disabled={done}
                          onClick={() =>
                            setActionMsg(combat.useCombatAbility(pc, 'gadget-weapon', foe.uid).message)
                          }
                        >
                          ⚙️ Gadget Blade (+L)
                        </button>
                        {(pc.resources.gadget ?? 0) >= 3 && (
                          <button
                            className="chip chip--amber"
                            disabled={done}
                            onClick={() =>
                              setActionMsg(combat.useCombatAbility(pc, 'grenade', foe.uid).message)
                            }
                          >
                            💣 Grenade (2 dmg)
                          </button>
                        )}
                      </>
                    )}

                    {pc.classId === 'cleric' && (pc.resources.healing ?? 0) > 0 && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() => {
                          const wounded =
                            [...party].sort((a, b) => a.life - b.life).find((p) => p.status === 'alive') ?? pc
                          setActionMsg(partySt.castHealingPrayer(pc.id, wounded.id).message)
                        }}
                      >
                        🙏 Heal Ally ({pc.resources.healing})
                      </button>
                    )}

                    {pc.inventory.includes('holy-water') && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() => setActionMsg(combat.useCombatAbility(pc, 'holy-water', foe.uid).message)}
                      >
                        💧 Throw Holy Water
                      </button>
                    )}

                    {!pc.potionUsed && pc.inventory.includes('healing-potion') && pc.life < d.maxLife && (
                      <button
                        className="chip"
                        onClick={() => setActionMsg(partySt.drinkHealingPotion(pc.id).message)}
                      >
                        🧪 Drink Potion (Free)
                      </button>
                    )}
                  </div>

                  {!meleeCheck.ok && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--amber-300)' }}>
                      ℹ️ {meleeCheck.reason}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => combat.foeTurn(hcl)}>
              🛡️ End Party Turn → Foe Attacks
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => combat.withdrawOrFlee('withdraw', hcl)}
            >
              🚪 Withdraw (+1 Def)
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => combat.withdrawOrFlee('flee', hcl)}
            >
              🏃 Flee
            </button>
            {halflingInParty && (
              <button
                className="btn btn--ghost"
                onClick={() =>
                  setActionMsg(combat.spendHalflingLuck(halflingInParty.id, 'flee', foe.uid).message)
                }
              >
                🍀 {halflingInParty.name} Luck Escape ({halflingInParty.resources.luck})
              </button>
            )}
          </div>
        </>
      )}

      {actionMsg && (
        <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--amber-200)' }}>
          {actionMsg}
        </div>
      )}

      {allDead && (
        <div className="outcome" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="outcome__title">
            {anyFoeRecord?.isFinalBoss ? '🏆 FINAL BOSS DEFEATED!' : 'Victory!'}
          </div>
          <div className="outcome__body" style={{ whiteSpace: 'pre-line' }}>
            {lootText ?? 'All Foes defeated — roll for Treasure and claim your XP.'}
          </div>
          <div className="outcome__actions" style={{ flexWrap: 'wrap', gap: 8 }}>
            {combat.lootReady && (
              <button className="btn btn--moss" onClick={rollLootAndFinish}>
                💰 Roll & Collect Treasure
              </button>
            )}
            <button
              className="btn"
              onClick={() => {
                combat.clear()
                setLootText(null)
                if (dungeon.started) setTab('dungeon')
              }}
            >
              {dungeon.started ? '← Return to Dungeon Map' : 'Done'}
            </button>
          </div>
        </div>
      )}

      {!combat.active && lootText && (
        <div className="outcome" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="outcome__title">Encounter Spoils Collected</div>
          <div className="outcome__body" style={{ whiteSpace: 'pre-line' }}>{lootText}</div>
          <div className="outcome__actions">
            <button
              className="btn btn--moss"
              onClick={() => {
                setLootText(null)
                if (dungeon.started) setTab('dungeon')
              }}
            >
              ← Return to Dungeon Map
            </button>
          </div>
        </div>
      )}

      {combat.log.length > 0 && (
        <>
          <div className="sect">Combat Chronicle</div>
          <div className="logbox">
            {combat.log
              .slice()
              .reverse()
              .map((l, i) => (
                <div key={i} className="logbox__line">
                  {l}
                </div>
              ))}
          </div>
        </>
      )}
    </ScreenShell>
  )
}
