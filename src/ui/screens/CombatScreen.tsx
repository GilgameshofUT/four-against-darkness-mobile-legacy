import { useEffect, useState } from 'react'
import { ScreenShell } from '../components/ScreenShell'
import { tables } from '../../data/tables'
import { spells } from '../../data/spells'
import { rollDie, rollNotation, defaultRng } from '../../core/dice'
import { fullAttackModVs, fullDefenseModVs, type FoeContext } from '../../core/modifiers'
import { useCombat } from '../../state/combat'
import { useDungeon, type Environment } from '../../state/dungeon'
import { partyHcl, useParty } from '../../state/party'
import { canCastSpellsNow, derive, getClass, maxLife, partyHasLight, type PC } from '../../state/pc'
import { useUi } from '../../state/ui'
import type { FoeKind } from '../../data/schema'
import {
  IconArcane,
  IconCoin,
  IconCrown,
  IconDice,
  IconDoor,
  IconEye,
  IconHeart,
  IconPotion,
  IconPrayer,
  IconShield,
  IconStealth,
  IconSword,
} from '../components/icons'

const KINDS: FoeKind[] = ['vermin', 'minion', 'weird', 'boss']

interface CombatTargetPrompt {
  actorId: string
  kind: 'cleric-heal' | 'cleric-blessing' | 'paladin-heal' | 'spell-buff'
  spellId?: string
  label: string
}

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
  const [targetPrompt, setTargetPrompt] = useState<CombatTargetPrompt | null>(null)

  const hcl = Math.max(1, partyHcl(party))
  const hasLight = partyHasLight(party)

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
    let tierShift = 0
    if (
      pc.classId === 'ranger' &&
      pc.swornEnemy &&
      new RegExp(pc.swornEnemy.replace(/s$/i, ''), 'i').test(foeCtx.name)
    ) {
      tierShift = 1
    }
    const die = [6, 8, 10, 12, 20][Math.min(4, d.tier - 1 + tierShift)] ?? 6
    const mod = fullAttackModVs(pc, foeCtx, aliveParty.length || 4, { inDarkness: !hasLight }).total
    return `d${die}${fmt(mod)}`
  }

  const pcDefLabel = (pc: PC, firstAttack = false) => {
    if (!foeCtx) return derive(pc).defenseRoll
    const d = derive(pc)
    const die = [6, 8, 10, 12, 20][d.tier - 1] ?? 6
    const mod = fullDefenseModVs(pc, foeCtx, {
      inDarkness: !hasLight,
      surprisedByWandering: combat.wandering && combat.round === 1,
      firstAttackOfCombat: firstAttack,
      hasLightSource: hasLight,
    }).total
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
      gp = Math.max(100, gp * 3)
      dungeon.noteFinalBossSlain()
    }

    if (gp > 0) {
      partySt.addPartyGold(gp)
    }
    setLootText(
      `${entry?.result ?? 'Treasure collected.'}${
        gp > 0 ? `\n\nAdded +${gp}gp to party gold!` : ''
      }${
        anyFoeRecord?.isFinalBoss
          ? '\n\nFINAL BOSS SLAIN! Return to the Entrance Stairs (#1) to exit the dungeon alive and claim victory!'
          : ''
      }`,
    )
    combat.markLoot()
  }

  const dwarfInParty = aliveParty.find((p) => p.classId === 'dwarf')
  const halflingInParty = aliveParty.find((p) => p.classId === 'halfling' && (p.resources.luck ?? 0) > 0)

  const handleTargetedSelection = (targetId: string) => {
    if (!targetPrompt) return
    const actor = party.find((p) => p.id === targetPrompt.actorId)
    if (!actor) return
    if (targetPrompt.kind === 'cleric-heal') {
      const res = partySt.castHealingPrayer(actor.id, targetId)
      setActionMsg(res.message)
    } else if (targetPrompt.kind === 'cleric-blessing') {
      const res = partySt.castBlessingPrayer(actor.id, targetId)
      setActionMsg(res.message)
    } else if (targetPrompt.kind === 'paladin-heal') {
      const res = partySt.usePaladinHeal(actor.id, targetId, 1)
      setActionMsg(res.message)
    } else if (targetPrompt.kind === 'spell-buff' && targetPrompt.spellId && foe) {
      combat.castSpell(actor, foe.uid, undefined, targetPrompt.spellId, targetId)
    }
    setTargetPrompt(null)
  }

  return (
    <ScreenShell
      eyebrow={`Encounter · HCL ${hcl} · ${combat.inCorridor ? 'Corridor (1-Wide)' : 'Room'}${
        !hasLight ? ' · DARKNESS (-2)' : ' · Torchlit'
      }`}
      title="Clash of Steel"
      subtitle={
        combat.active
          ? `Round ${combat.round} · ${combat.environment}`
          : 'Encounters trigger automatically in the dungeon, or roll a skirmish below.'
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
            {dungeon.started ? 'Map' : 'End'}
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
              <IconDice size={16} /> Roll Encounter
            </button>
            {dungeon.started && (
              <button className="btn btn--moss" onClick={() => setTab('dungeon')}>
                Return to Dungeon Map
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
                {foe.kind} · Level {foe.level}
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
            Reaction: <b>{foe.reactionLabel}</b> · Attacks/turn:{' '}
            <b>{minor ? (combat.inCorridor ? 'Max 2 (Corridor)' : foe.remaining) : foe.attacks}</b> · Damage:{' '}
            <b>{foe.damage}</b>
          </div>
          {foe.text && <p className="foecard__text">{foe.text}</p>}
          {combat.goldSensePreview && (
            <div style={{ fontSize: '0.78rem', color: 'var(--amber-200)', marginTop: 6 }}>
              {combat.goldSensePreview}
            </div>
          )}
        </div>
      )}

      {/* STEP 1 OF INITIATIVE FLOWCHART (Book p. 146): PRE-COMBAT APPROACH CHOICE */}
      {combat.active && foe && combat.phase === 'approach' && (
        <div className="outcome">
          <div className="outcome__title">Initiative Flowchart (Book p. 146): You Spot the Foes!</div>
          <div className="outcome__body">
            The Foes have not surprised you. Do you <b>attack immediately</b> (PCs strike first), <b>wait to see their Reaction</b> ({foe.reactions}), or <b>attempt Stealth</b>?
          </div>
          <div className="outcome__actions">
            <button className="btn" onClick={() => combat.chooseAttackImmediately()}>
              <IconSword size={16} /> Attack Immediately
            </button>
            <button className="btn btn--moss" onClick={() => combat.chooseWaitForReaction(hcl)}>
              <IconDice size={16} /> Wait & Check Reaction
            </button>
            {!combat.wandering && (
              <>
                <button
                  className="btn btn--ghost"
                  onClick={() => setActionMsg(combat.chooseAttemptStealth('ambush').message)}
                >
                  <IconStealth size={16} /> Stealth Ambush (-1 Foe L)
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => setActionMsg(combat.chooseAttemptStealth('sneak-past').message)}
                >
                  <IconDoor size={16} /> Sneak Past Quietly
                </button>
              </>
            )}
            {dwarfInParty && !combat.goldSensePreview && (
              <button
                className="btn btn--ghost"
                onClick={() => setActionMsg(combat.useDwarfGoldSense(dwarfInParty.id).message)}
              >
                <IconEye size={16} /> {dwarfInParty.name}'s Gold Sense (Save vs L6)
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 1B: INTERACTIVE REACTION RESOLUTION */}
      {combat.active && foe && combat.phase === 'reaction-choice' && (
        <div className="outcome">
          <div className="outcome__title">Foe Reaction: {foe.reactionLabel}</div>
          <div className="outcome__body">
            Choose whether to satisfy their Reaction or fight (if you fight now, Foes attack first per Book p. 90).
          </div>
          <div className="outcome__actions">
            {/bribe/i.test(foe.reactionLabel) && (
              <button
                className="btn btn--moss"
                onClick={() => {
                  const isFood = /food|ration/i.test(foe.reactionLabel)
                  const res = isFood ? combat.payBribe(undefined, 4) : combat.payBribe()
                  setActionMsg(res.message)
                }}
              >
                <IconCoin size={16} /> Pay Bribe ({foe.reactionLabel})
              </button>
            )}
            {/blood offering/i.test(foe.reactionLabel) &&
              aliveParty.map((p) => (
                <button
                  key={p.id}
                  className="btn btn--moss"
                  onClick={() => setActionMsg(combat.payBloodOffering(p.id).message)}
                >
                  <IconHeart size={15} /> {p.name} Gives Blood (-2 Life)
                </button>
              ))}
            {/puzzle/i.test(foe.reactionLabel) &&
              aliveParty.map((p) => (
                <button
                  key={p.id}
                  className="btn btn--moss"
                  onClick={() => setActionMsg(combat.attemptPuzzleReaction(p.id).message)}
                >
                  <IconDice size={15} /> {p.name} Solves Puzzle
                </button>
              ))}
            {/magic challenge/i.test(foe.reactionLabel) &&
              aliveParty.map((p) => (
                <button
                  key={p.id}
                  className="btn btn--moss"
                  onClick={() => setActionMsg(combat.attemptMagicChallenge(p.id).message)}
                >
                  <IconArcane size={15} /> {p.name} Accepts Magic Duel
                </button>
              ))}
            {/peaceful|ignore|quest/i.test(foe.reactionLabel) && (
              <button className="btn btn--moss" onClick={() => combat.acceptPeacefulPass()}>
                <IconDoor size={15} /> Pass Peacefully
              </button>
            )}
            <button
              className="btn"
              onClick={() => combat.beginFoeTurnQueue(hcl)}
            >
              <IconSword size={15} /> Refuse & Fight (Foes Attack First)
            </button>
          </div>
        </div>
      )}

      {/* INTERACTIVE PLAYER-ROLLED DEFENSE PHASE (Book pp. 96–97) */}
      {combat.active && foe && combat.phase === 'foe-turn' && (
        <div className="defcard">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--amber-300)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconShield size={15} /> Foes' Turn — Roll Party Defense (Book p. 96)
              </span>
              <div style={{ fontSize: '0.82rem', color: 'var(--parch-200)', marginTop: 2 }}>
                Roll higher than <b>L{foe.level}</b> (need <b>{foe.level + 1}+</b>; a natural 1 always fails, 6 explodes!).
              </div>
            </div>
            {combat.pendingDefenses.some((d) => !d.resolved) && (
              <button
                className="chip chip--amber"
                onClick={() => {
                  for (const item of combat.pendingDefenses) {
                    if (!item.resolved) combat.rollSingleDefense(item.id)
                  }
                }}
              >
                <IconDice size={13} /> Roll All Remaining ({combat.pendingDefenses.filter((d) => !d.resolved).length})
              </button>
            )}
          </div>

          {combat.pendingDefenses.length === 0 ? (
            <button className="btn" onClick={() => combat.beginFoeTurnQueue(hcl)}>
              <IconShield size={16} /> Prepare Incoming Attacks
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {combat.pendingDefenses.map((defItem, idx) => {
                const defender = party.find((p) => p.id === defItem.targetPcId) ?? party[0]!
                const dmgReductionTraits = ['Shield Expert', 'Graceful Dodge', 'Tough Skinned', 'Brace for Impact', 'Armor Mastery', 'Fey Grace', 'Unyielding Form']
                const availableReductionTrait = defender.traits.find(
                  (t) =>
                    dmgReductionTraits.includes(t) &&
                    !defender.usedTraitsCombat.includes(t) &&
                    !defender.usedTraitsAdventure.includes(t),
                )
                const canCounter =
                  defItem.resolved &&
                  defItem.success &&
                  !defItem.counterUsed &&
                  !defender.usedTraitsCombat.includes('counter-attack') &&
                  (defender.traits.includes('Riposte') ||
                    defender.traits.includes('Opportunist') ||
                    defender.traits.includes('Shield Bash') ||
                    (defender.traits.includes('Lethal Dodge') && defItem.exploded))

                return (
                  <div
                    key={defItem.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(0,0,0,0.4)',
                      border: `1px solid ${
                        !defItem.resolved
                          ? 'rgba(232,180,92,0.35)'
                          : defItem.success
                            ? 'var(--moss-500)'
                            : 'var(--blood-500)'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--parch-100)' }}>
                        Attack #{idx + 1}: {defItem.foeName} (L{defItem.foeLevel}, {defItem.damage} dmg) →{' '}
                        <span style={{ color: 'var(--amber-200)' }}>
                          #{defender.marchingOrder} {defender.name} ({defender.life} HP)
                        </span>
                      </span>

                      {!defItem.resolved ? (
                        <button
                          className="btn"
                          style={{ minHeight: 34, padding: '0 12px', fontSize: '0.8rem' }}
                          onClick={() => combat.rollSingleDefense(defItem.id)}
                        >
                          <IconShield size={14} /> Roll Defense ({pcDefLabel(defender, defItem.firstOfCombat)})
                        </button>
                      ) : (
                        <span
                          className={`chip ${defItem.success ? '' : 'chip--blood'}`}
                          style={{ fontWeight: 700 }}
                        >
                          {defItem.success
                            ? `DEFENDED ([${defItem.rolls?.join('+')}]${fmt(defItem.mod ?? 0)} = ${defItem.total} > L${defItem.foeLevel})`
                            : `HIT -${defItem.damageTaken} HP ([${defItem.rolls?.join('+')}]${fmt(defItem.mod ?? 0)} = ${defItem.total} vs L${defItem.foeLevel})`}
                        </span>
                      )}
                    </div>

                    {/* Target Reassignment / Bulwark Intercept before rolling */}
                    {!defItem.resolved && aliveParty.length > 1 && (
                      <div className="chiprow" style={{ marginTop: 6 }}>
                        <span className="eyebrow" style={{ alignSelf: 'center', fontSize: '0.6rem' }}>
                          Assign Target:
                        </span>
                        {aliveParty.map((ally) => (
                          <button
                            key={ally.id}
                            className={`chip${ally.id === defItem.targetPcId ? ' chip--amber' : ''}`}
                            style={{ padding: '1px 6px', fontSize: '0.68rem' }}
                            onClick={() => combat.reassignDefenseTarget(defItem.id, ally.id)}
                          >
                            #{ally.marchingOrder} {ally.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Post-Roll Reactive Abilities (Rerolls, Damage Reduction, Counter-Attack) */}
                    {defItem.resolved && (!defItem.success || canCounter) && (
                      <div className="chiprow" style={{ marginTop: 6 }}>
                        {!defItem.success && halflingInParty && (
                          <button
                            className="chip chip--amber"
                            onClick={() =>
                              setActionMsg(combat.rerollFailedDefense(defItem.id, 'luck').message)
                            }
                          >
                            Spend Halfling Luck to Reroll Defense ({halflingInParty.resources.luck})
                          </button>
                        )}
                        {!defItem.success &&
                          defender.traits.includes('Stubborn Resolve') &&
                          !defender.usedTraitsAdventure.includes('Stubborn Resolve') && (
                            <button
                              className="chip chip--amber"
                              onClick={() =>
                                setActionMsg(
                                  combat.rerollFailedDefense(defItem.id, 'stubborn-resolve').message,
                                )
                              }
                            >
                              Stubborn Resolve: Reroll Defense (1/Adv)
                            </button>
                          )}
                        {!defItem.success &&
                          defender.traits.includes('Lucky Hat') &&
                          !defender.usedTraitsAdventure.includes('Lucky Hat') && (
                            <button
                              className="chip chip--amber"
                              onClick={() =>
                                setActionMsg(combat.rerollFailedDefense(defItem.id, 'lucky-hat').message)
                              }
                            >
                              Lucky Hat: Reroll Defense (1/Adv)
                            </button>
                          )}
                        {!defItem.success &&
                          (defItem.damageTaken ?? 0) > 0 &&
                          !defItem.damageReduced &&
                          availableReductionTrait && (
                            <button
                              className="chip chip--on"
                              onClick={() =>
                                setActionMsg(
                                  combat.reduceDefenseDamage(defItem.id, availableReductionTrait).message,
                                )
                              }
                            >
                              <IconShield size={12} /> Use {availableReductionTrait} (-1 Damage!)
                            </button>
                          )}
                        {canCounter && (
                          <button
                            className="chip chip--amber"
                            onClick={() =>
                              setActionMsg(combat.triggerCounterAttack(defItem.id, defender).message)
                            }
                          >
                            <IconSword size={12} /> Counter-Attack!
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {combat.pendingDefenses.every((d) => d.resolved) && (
                <button
                  className="btn btn--moss"
                  onClick={() => combat.finishFoeTurnQueue()}
                >
                  Begin Round {combat.round + 1} (Party Turn)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* MORALE CHECK PROMPT */}
      {underHalf && foe && (
        <div className="outcome">
          <div className="outcome__title">Foes Reduced to Half or Fewer!</div>
          <div className="outcome__body">
            Book p. 94: Roll 1d6 Morale for {foe.name} (1–3 they flee and leave their Treasure!).
          </div>
          <div className="outcome__actions">
            <button className="btn btn--moss" onClick={() => combat.tryMorale(foe.uid)}>
              <IconDice size={16} /> Roll Foe Morale (d6)
            </button>
          </div>
        </div>
      )}

      {/* TARGET PICKER TRAY IN COMBAT */}
      {targetPrompt && (
        <div className="target-tray">
          <div className="eyebrow" style={{ color: 'var(--amber-200)', marginBottom: 6 }}>
            {targetPrompt.label}
          </div>
          <div className="chiprow">
            {party.map((ally) => {
              const cap = maxLife(getClass(ally.classId), ally.level, ally.traits)
              return (
                <button
                  key={ally.id}
                  className="chip chip--on"
                  onClick={() => handleTargetedSelection(ally.id)}
                >
                  #{ally.marchingOrder} {ally.name} ({ally.life}/{cap} HP)
                </button>
              )
            })}
            <button className="chip" onClick={() => setTargetPrompt(null)}>
              Cancel
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
              const bonusDone = combat.pcsBonusActed.has(pc.id) || pc.status !== 'alive'
              const meleeCheck = combat.canPcMelee(pc)
              const spellCheck = canCastSpellsNow(pc)
              const uniquePrepared = Array.from(new Set(pc.preparedSpells))

              // Dual-wielding / Flurry of Blows check (Swashbuckler, Light Gladiator, Ranger w/ 2 blades, Mushroom Monk Tier>=2)
              const hasBonusAttack =
                pc.classId === 'swashbuckler' ||
                (pc.classId === 'light-gladiator' && pc.offHand === 'dagger') ||
                (pc.classId === 'ranger' && pc.offHand === 'sword') ||
                (pc.classId === 'mushroom-monk' && d.tier >= 2)

              return (
                <div
                  key={pc.id}
                  className={`pcact${done && (!hasBonusAttack || bonusDone) ? ' is-done' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="pcact__who">
                      <span className="pcact__name">
                        #{pc.marchingOrder} {pc.name}{' '}
                        <small style={{ fontSize: '0.75rem', color: 'var(--sepia-300)', fontWeight: 400 }}>
                          ({d.cls.name} L{pc.level})
                        </small>
                      </span>
                      <span className="eyebrow">
                        <IconHeart size={11} /> {pc.life}/{d.maxLife} · <IconShield size={11} /> Def{' '}
                        {pcDefLabel(pc)} · {d.weaponName}
                      </span>
                    </div>
                    {done && (!hasBonusAttack || bonusDone) && <span className="chip">Acted</span>}
                  </div>

                  {/* Primary Attack, Bonus Dual-Wield/Flurry, Spells & Class Skills */}
                  <div className="pcact__btns">
                    <button
                      className="btn"
                      disabled={done || !meleeCheck.ok}
                      title={meleeCheck.reason ?? `Attack with ${d.weaponName}`}
                      onClick={() => combat.attack(pc, foe.uid)}
                    >
                      <IconSword size={15} /> {pcRollLabel(pc) ?? d.attackRoll}
                    </button>

                    {/* Dual-Wield / Off-Hand / Flurry 2nd Attack */}
                    {hasBonusAttack && (
                      <button
                        className="btn btn--moss"
                        disabled={bonusDone || !meleeCheck.ok}
                        onClick={() =>
                          combat.attack(pc, foe.uid, undefined, false, { isBonusAttack: true })
                        }
                      >
                        <IconSword size={14} /> Off-Hand ({pcRollLabel(pc) ?? d.attackRoll})
                      </button>
                    )}

                    {/* Light Gladiator Parry Stance */}
                    {pc.classId === 'light-gladiator' && !bonusDone && (
                      <button
                        className="chip chip--amber"
                        onClick={() =>
                          setActionMsg(combat.useCombatAbility(pc, 'parry-stance', foe.uid).message)
                        }
                      >
                        <IconShield size={12} /> Parry (+1 Def)
                      </button>
                    )}

                    {/* Barbarian Rage & Berserk Fighting */}
                    {pc.classId === 'barbarian' && (pc.resources.rage ?? 0) > 0 && (
                      <button
                        className="btn btn--moss"
                        disabled={done || !meleeCheck.ok}
                        onClick={() => combat.attack(pc, foe.uid, undefined, false, { rage: true })}
                      >
                        <IconSword size={14} /> Rage ({pc.resources.rage})
                      </button>
                    )}
                    {pc.classId === 'barbarian' &&
                      pc.traits.includes('Berserk Fighting') &&
                      !pc.usedTraitsAdventure.includes('berserk-fighting') && (
                        <button
                          className="chip chip--amber"
                          onClick={() =>
                            setActionMsg(
                              combat.useCombatAbility(pc, 'berserk-fighting', foe.uid).message,
                            )
                          }
                        >
                          Berserk Fighting (+1 Dmg)
                        </button>
                      )}

                    {/* Paladin Divine Smite & Lay on Hands (Target Picker) */}
                    {pc.classId === 'paladin' && (pc.resources.smite ?? 0) > 0 && (
                      <button
                        className="btn btn--moss"
                        disabled={done || !meleeCheck.ok}
                        onClick={() => combat.attack(pc, foe.uid, undefined, false, { smite: true })}
                      >
                        <IconPrayer size={14} /> Smite (3 Dmg)
                      </button>
                    )}
                    {pc.classId === 'paladin' && (pc.resources.prayer ?? 0) > 0 && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() =>
                          setTargetPrompt({
                            actorId: pc.id,
                            kind: 'paladin-heal',
                            label: `Choose Target Hero for ${pc.name}'s Lay on Hands (+1 Life):`,
                          })
                        }
                      >
                        <IconPrayer size={12} /> Lay on Hands ({pc.resources.prayer})
                      </button>
                    )}

                    {/* Prepared Spell Picker Buttons (Protection/Barkskin/Blessing open Target Picker!) */}
                    {uniquePrepared.map((sid) => {
                      const sp = spells.find((s) => s.id === sid)
                      const count = pc.preparedSpells.filter((x) => x === sid).length
                      const needsTargetAlly = sid === 'protection' || sid === 'barkskin' || sid === 'blessing'
                      return (
                        <button
                          key={sid}
                          className="btn btn--moss"
                          disabled={done || !spellCheck.ok}
                          title={spellCheck.reason ?? sp?.text}
                          onClick={() => {
                            if (needsTargetAlly) {
                              setTargetPrompt({
                                actorId: pc.id,
                                kind: 'spell-buff',
                                spellId: sid,
                                label: `Choose Target Hero for ${sp?.name ?? sid}:`,
                              })
                            } else {
                              combat.castSpell(pc, foe.uid, undefined, sid)
                            }
                          }}
                        >
                          <IconArcane size={14} /> {sp?.name ?? sid} ({count})
                        </button>
                      )
                    })}

                    {uniquePrepared.length === 0 && (pc.resources.spellSlots ?? 0) > 0 && (
                      <button
                        className="btn btn--moss"
                        disabled={done}
                        onClick={() => combat.castSpell(pc, foe.uid)}
                      >
                        <IconArcane size={14} /> Cast ({pc.resources.spellSlots})
                      </button>
                    )}

                    {/* Assassin Hide in Shadows */}
                    {pc.classId === 'assassin' && !pc.activeEffects.includes('hide-in-shadows') && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() =>
                          setActionMsg(combat.useCombatAbility(pc, 'hide-in-shadows', foe.uid).message)
                        }
                      >
                        <IconStealth size={12} /> Hide in Shadows (3× Dmg)
                      </button>
                    )}

                    {/* Acrobat Tricks & Distracting Feint */}
                    {pc.classId === 'acrobat' && (pc.resources.tricks ?? 0) > 0 && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() => setActionMsg(combat.useCombatAbility(pc, 'distract', foe.uid).message)}
                      >
                        Trick: Distract (-{d.tier}L · {pc.resources.tricks})
                      </button>
                    )}
                    {pc.classId === 'acrobat' &&
                      pc.traits.includes('Distracting Feint') &&
                      !pc.usedTraitsCombat.includes('distracting-feint') && (
                        <button
                          className="chip chip--amber"
                          disabled={done}
                          onClick={() =>
                            setActionMsg(
                              combat.useCombatAbility(pc, 'distracting-feint', foe.uid).message,
                            )
                          }
                        >
                          Distracting Feint (Skip 1 Foe Atk)
                        </button>
                      )}

                    {/* Illusionist Distracting Lights & Illusionary Knife Throw */}
                    {pc.classId === 'illusionist' && (
                      <>
                        <button
                          className="chip chip--amber"
                          disabled={done}
                          onClick={() =>
                            setActionMsg(
                              combat.useCombatAbility(pc, 'distracting-lights', foe.uid).message,
                            )
                          }
                        >
                          <IconArcane size={12} /> Distracting Lights (-{d.tier}L)
                        </button>
                        {(pc.resources.spellSlots ?? 0) > 0 && (
                          <button
                            className="chip chip--amber"
                            disabled={done}
                            onClick={() =>
                              setActionMsg(
                                combat.useCombatAbility(pc, 'illusionary-knife', foe.uid).message,
                              )
                            }
                          >
                            <IconSword size={12} /> Illusionary Knife (+{pc.level + d.tier})
                          </button>
                        )}
                      </>
                    )}

                    {/* Mushroom Monk Spores */}
                    {pc.classId === 'mushroom-monk' && (pc.resources.spores ?? 0) > 0 && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() => setActionMsg(combat.useCombatAbility(pc, 'spores', foe.uid).message)}
                      >
                        Spores (-1L · {pc.resources.spores})
                      </button>
                    )}

                    {/* Druid Rootbind */}
                    {pc.classId === 'druid' &&
                      pc.traits.includes('Rootbind') &&
                      !pc.usedTraitsAdventure.includes('rootbind') && (
                        <button
                          className="chip chip--amber"
                          disabled={done}
                          onClick={() =>
                            setActionMsg(combat.useCombatAbility(pc, 'rootbind', foe.uid).message)
                          }
                        >
                          Rootbind (Skip Foe Turn)
                        </button>
                      )}

                    {/* Elf Bladesong & Elidra's Melody */}
                    {pc.classId === 'elf' &&
                      pc.traits.includes('Bladesong') &&
                      !pc.usedTraitsAdventure.includes('bladesong') && (
                        <button
                          className="chip chip--amber"
                          onClick={() =>
                            setActionMsg(combat.useCombatAbility(pc, 'bladesong', foe.uid).message)
                          }
                        >
                          Bladesong (+1 Atk)
                        </button>
                      )}
                    {pc.classId === 'elf' &&
                      pc.traits.includes("Elidra's Melody") &&
                      !pc.usedTraitsAdventure.includes('elidra-melody') && (
                        <button
                          className="chip chip--amber"
                          disabled={done}
                          onClick={() =>
                            setActionMsg(
                              combat.useCombatAbility(pc, 'elidra-melody', foe.uid).message,
                            )
                          }
                        >
                          Elidra's Melody (Calm Foe)
                        </button>
                      )}

                    {/* Kukla Hidden Blade & Hair Bind */}
                    {pc.classId === 'kukla' &&
                      pc.traits.includes('Hidden Blade') &&
                      !pc.usedTraitsCombat.includes('Hidden Blade') && (
                        <button
                          className="chip chip--amber"
                          onClick={() =>
                            setActionMsg(
                              combat.useCombatAbility(pc, 'hidden-blade', foe.uid).message,
                            )
                          }
                        >
                          Hidden Blade (Free Strike)
                        </button>
                      )}
                    {pc.classId === 'kukla' &&
                      pc.traits.includes('Hair Bind') &&
                      !pc.usedTraitsAdventure.includes('hair-bind') && (
                        <button
                          className="chip chip--amber"
                          disabled={done}
                          onClick={() =>
                            setActionMsg(combat.useCombatAbility(pc, 'hair-bind', foe.uid).message)
                          }
                        >
                          Hair Bind (-2 Foe L)
                        </button>
                      )}

                    {/* Swashbuckler Panache & Taunt */}
                    {pc.classId === 'swashbuckler' && (pc.resources.panache ?? 0) > 0 && (
                      <button
                        className="chip chip--amber"
                        onClick={() =>
                          setActionMsg(combat.useCombatAbility(pc, 'panache-atk', foe.uid).message)
                        }
                      >
                        Panache (+1 Atk · {pc.resources.panache})
                      </button>
                    )}
                    {pc.classId === 'swashbuckler' &&
                      pc.traits.includes('Taunt') &&
                      !pc.usedTraitsCombat.includes('taunt') && (
                        <button
                          className="chip chip--amber"
                          disabled={done}
                          onClick={() =>
                            setActionMsg(combat.useCombatAbility(pc, 'taunt', foe.uid).message)
                          }
                        >
                          Taunt (-{d.tier} Foe L)
                        </button>
                      )}

                    {/* Gnome Gadgets */}
                    {pc.classId === 'gnome' && (pc.resources.gadget ?? 0) > 0 && (
                      <>
                        {!pc.activeEffects.includes('gadget-weapon') && (
                          <button
                            className="chip chip--amber"
                            onClick={() =>
                              setActionMsg(
                                combat.useCombatAbility(pc, 'gadget-weapon', foe.uid).message,
                              )
                            }
                          >
                            Gadget Blade (+L Atk)
                          </button>
                        )}
                        {!pc.activeEffects.includes('clockwork-active') && (
                          <button
                            className="chip chip--amber"
                            onClick={() =>
                              setActionMsg(
                                combat.useCombatAbility(pc, 'clockwork-armor', foe.uid).message,
                              )
                            }
                          >
                            Clockwork Armor (+3 Def)
                          </button>
                        )}
                        {(pc.resources.gadget ?? 0) >= 3 && (
                          <button
                            className="chip chip--amber"
                            disabled={done}
                            onClick={() =>
                              setActionMsg(combat.useCombatAbility(pc, 'grenade', foe.uid).message)
                            }
                          >
                            Grenade (2 Dmg)
                          </button>
                        )}
                      </>
                    )}

                    {/* Cleric Healing Prayer (Opens Target Picker!) & Chant of Valor */}
                    {pc.classId === 'cleric' && (pc.resources.healing ?? 0) > 0 && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() =>
                          setTargetPrompt({
                            actorId: pc.id,
                            kind: 'cleric-heal',
                            label: `Choose Target Hero for ${pc.name}'s Healing Prayer (d6+${pc.level} Life):`,
                          })
                        }
                      >
                        <IconPrayer size={12} /> Heal Ally ({pc.resources.healing})
                      </button>
                    )}
                    {pc.classId === 'cleric' &&
                      pc.traits.includes('Chant of Valor') &&
                      !pc.usedTraitsAdventure.includes('Chant of Valor') && (
                        <button
                          className="chip chip--amber"
                          onClick={() =>
                            setActionMsg(
                              combat.useCombatAbility(pc, 'chant-of-valor', foe.uid).message,
                            )
                          }
                        >
                          Chant of Valor (Free +1 Party Atk)
                        </button>
                      )}

                    {/* Holy Water & Healing Potion */}
                    {pc.inventory.includes('holy-water') && (
                      <button
                        className="chip chip--amber"
                        disabled={done}
                        onClick={() => setActionMsg(combat.useCombatAbility(pc, 'holy-water', foe.uid).message)}
                      >
                        <IconPotion size={12} /> Throw Holy Water
                      </button>
                    )}
                    {!pc.potionUsed && pc.inventory.includes('healing-potion') && pc.life < d.maxLife && (
                      <button
                        className="chip"
                        onClick={() => setActionMsg(partySt.drinkHealingPotion(pc.id).message)}
                      >
                        <IconPotion size={12} /> Drink Potion (Free)
                      </button>
                    )}
                  </div>

                  {!meleeCheck.ok && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--amber-300)' }}>
                      {meleeCheck.reason}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => combat.beginFoeTurnQueue(hcl)}>
              <IconShield size={16} /> End Party Turn → Foe Attacks
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => combat.withdrawOrFlee('withdraw', hcl)}
            >
              <IconDoor size={15} /> Withdraw (+1 Def)
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => combat.withdrawOrFlee('flee', hcl)}
            >
              Flee
            </button>
            {halflingInParty && (
              <button
                className="btn btn--ghost"
                onClick={() =>
                  setActionMsg(combat.spendHalflingLuck(halflingInParty.id, 'flee', foe.uid).message)
                }
              >
                {halflingInParty.name} Luck Escape ({halflingInParty.resources.luck})
              </button>
            )}
          </div>
        </>
      )}

      {actionMsg && (
        <div style={{ fontSize: '0.8rem', color: 'var(--amber-200)' }}>
          {actionMsg}
        </div>
      )}

      {allDead && (
        <div className="outcome">
          <div className="outcome__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconCrown size={18} />
            {anyFoeRecord?.isFinalBoss ? 'FINAL BOSS DEFEATED!' : 'Victory!'}
          </div>
          <div className="outcome__body">
            {lootText ?? 'All Foes defeated — roll for Treasure and claim your XP.'}
          </div>
          <div className="outcome__actions">
            {combat.lootReady && (
              <button className="btn btn--moss" onClick={rollLootAndFinish}>
                <IconCoin size={16} /> Roll & Collect Treasure
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
              {dungeon.started ? 'Return to Dungeon Map' : 'Done'}
            </button>
          </div>
        </div>
      )}

      {!combat.active && lootText && (
        <div className="outcome">
          <div className="outcome__title">Encounter Spoils Collected</div>
          <div className="outcome__body">{lootText}</div>
          <div className="outcome__actions">
            <button
              className="btn btn--moss"
              onClick={() => {
                setLootText(null)
                if (dungeon.started) setTab('dungeon')
              }}
            >
              Return to Dungeon Map
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
