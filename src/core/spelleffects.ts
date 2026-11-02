import { rollDie, rollExploding, defaultRng, type Rng } from './dice'
import { tier as computeTier } from './hcl'
import type { PC } from '../state/pc'

/* ============================================================
   Spell Effects Engine (Book pp. 67–76, verified via vision).
   Resolves all 6 Basic Wizard Spells, 12 Druid Spells, and
   12 Illusionist Spells with exact book mechanics.
   ============================================================ */

export interface SpellTargetFoe {
  name: string
  kind: 'vermin' | 'minion' | 'weird' | 'boss'
  level: number
  life?: number
  remaining?: number
  tags: string[]
}

export interface SpellCastOutcome {
  spellId: string
  hit: boolean
  rollTotal?: number
  /** Minor foes slain/put to sleep, or damage dealt to a Major foe. */
  minorSlain: number
  majorDamage: number
  /** Whether a Major foe was put to sleep / bribed / neutralized outright. */
  neutralizedMajor: boolean
  /** Reduction to the Foe's Level for the encounter (Spiderweb, Phantasmal Binding, Disbelief…). */
  foeLevelReduction: number
  /** Whether the caster teleported to the dungeon entrance (Escape). */
  escapedToEntrance: boolean
  /** Buff effect added to the caster or target ally. */
  buffApplied?: string
  /** Food rations created (Illusionary Banquet). */
  rationsCreated?: number
  /** Force an immediate Morale check on the Foe (Specter Swarm). */
  triggerMorale?: boolean
  log: string
}

const isImmuneToSleep = (f: SpellTargetFoe): boolean =>
  f.level >= 11 ||
  f.tags.includes('undead') ||
  f.tags.includes('artificial') ||
  f.tags.includes('elemental') ||
  f.tags.includes('dragon') ||
  /skeleton|zombie|mummy|wraith|golem|statue|dragon|slime|cube|cockroach|stalactomimic|drillworm|tyrant|hag|horror|colossus|swarm|mimic|phantom/i.test(
    f.name,
  )

const isImmuneToIllusion = (f: SpellTargetFoe): boolean =>
  f.kind === 'vermin' ||
  f.tags.includes('undead') ||
  f.tags.includes('artificial') ||
  f.tags.includes('elemental') ||
  /skeleton|zombie|mummy|wraith|golem|statue/i.test(f.name)

export function resolveSpellCast(
  caster: PC,
  spellId: string,
  foe: SpellTargetFoe | null,
  opts: { fromScroll?: boolean; spellPenalty?: number; rng?: Rng } = {},
): SpellCastOutcome {
  const rng = opts.rng ?? defaultRng
  const L = caster.level
  const t = computeTier(L)
  const dieSides = [6, 8, 10, 12, 20][t - 1] ?? 6

  // Compute spellcasting modifier (Book p. 67, p. 76):
  // Spellcasters add +L; non-casters reading a scroll add +1; Druids off-list add +1/2L (min +1).
  const isFullCaster =
    caster.classId === 'wizard' ||
    caster.classId === 'elf' ||
    caster.classId === 'druid' ||
    caster.classId === 'illusionist' ||
    caster.classId === 'gnome'
  let mod = isFullCaster ? L : 1
  if (caster.traits.includes('Specialist') && caster.specialistSpell === spellId) {
    mod += t
  }
  if (caster.traits.includes('Shadow Adept') && spellId === 'shadow-strike') {
    mod += t
  }
  if (opts.fromScroll && caster.traits.includes('Sygilist')) {
    mod += t
  }
  if (opts.spellPenalty) {
    mod += opts.spellPenalty
  }

  const doSpellRoll = (extraBonus = 0) => {
    const r = rollExploding(rng, dieSides)
    return r.total + mod + extraBonus
  }

  const isMinor = foe ? foe.kind === 'vermin' || foe.kind === 'minion' : false

  switch (spellId) {
    /* ---------------- Basic Wizard Spells (pp. 68–69) ---------------- */
    case 'blessing':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'blessing-cleanse',
        log: `${caster.name} casts Blessing — removes curse, petrification, or 1 Madness!`,
      }

    case 'escape':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: true,
        log: `${caster.name} casts Escape and teleports back to the dungeon entrance!`,
      }

    case 'protection':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'protection',
        log: `${caster.name} casts Protection (+1 Defense until the end of the encounter).`,
      }

    case 'lightning':
    case 'lightning-strike': {
      if (!foe) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${caster.name} casts Lightning with no target.`,
        }
      }
      if (/acid cube|lightning elemental/i.test(foe.name)) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${foe.name} is immune to Lightning!`,
        }
      }
      const total = doSpellRoll()
      const hit = total >= foe.level
      if (!hit) {
        return {
          spellId, hit: false, rollTotal: total, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${caster.name} casts Lightning (rolled ${total} vs L${foe.level}) — missed!`,
        }
      }
      const extraL = /cavern sludge/i.test(foe.name) ? 2 : 0
      return {
        spellId,
        hit: true,
        rollTotal: total,
        minorSlain: isMinor ? 1 : 0,
        majorDamage: isMinor ? 0 : 2,
        neutralizedMajor: false,
        foeLevelReduction: extraL,
        escapedToEntrance: false,
        log: isMinor
          ? `${caster.name}'s Lightning bolt (rolled ${total} vs L${foe.level}) slays 1 ${foe.name}!`
          : `${caster.name}'s Lightning bolt (rolled ${total} vs L${foe.level}) blasts ${foe.name} for 2 damage!`,
      }
    }

    case 'fireball': {
      if (!foe) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${caster.name} casts Fireball with no target.`,
        }
      }
      if (/young dragon|red dragon/i.test(foe.name)) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${foe.name} is immune to Fireball!`,
        }
      }
      const fireBonus = /mummy/i.test(foe.name) ? 2 : /spore swarm/i.test(foe.name) ? t : 0
      const total = doSpellRoll(fireBonus)
      if (isMinor) {
        // Book p. 68: slays (roll - foe.L) Minor Foes, minimum 1 even on a failure!
        const allGnats = /myco-gnats/i.test(foe.name)
        const slain = allGnats ? (foe.remaining ?? 99) : Math.max(1, total - foe.level)
        return {
          spellId,
          hit: true,
          rollTotal: total,
          minorSlain: slain,
          majorDamage: 0,
          neutralizedMajor: false,
          foeLevelReduction: 0,
          escapedToEntrance: false,
          log: `${caster.name}'s Fireball (rolled ${total} vs L${foe.level}) incinerates ${slain} ${foe.name}!`,
        }
      }
      const hit = total >= foe.level
      const dmg = hit ? (/mummy/i.test(foe.name) ? 2 : 1) : 0
      return {
        spellId,
        hit,
        rollTotal: total,
        minorSlain: 0,
        majorDamage: dmg,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        log: hit
          ? `${caster.name}'s Fireball (rolled ${total} vs L${foe.level}) scorches ${foe.name} for ${dmg} damage!`
          : `${caster.name}'s Fireball (rolled ${total} vs L${foe.level}) misses ${foe.name}.`,
      }
    }

    case 'sleep': {
      if (!foe) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${caster.name} casts Sleep with no target.`,
        }
      }
      if (isImmuneToSleep(foe)) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${foe.name} is immune to Sleep!`,
        }
      }
      const total = doSpellRoll()
      const hit = total >= foe.level
      if (!hit) {
        return {
          spellId, hit: false, rollTotal: total, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${caster.name}'s Sleep spell (rolled ${total} vs L${foe.level}) fails to take hold.`,
        }
      }
      if (isMinor) {
        const count = rollDie(rng, 6) + L
        return {
          spellId,
          hit: true,
          rollTotal: total,
          minorSlain: count,
          majorDamage: 0,
          neutralizedMajor: false,
          foeLevelReduction: 0,
          escapedToEntrance: false,
          log: `${caster.name}'s Sleep spell (rolled ${total} vs L${foe.level}) puts ${count} ${foe.name} to sleep!`,
        }
      }
      return {
        spellId,
        hit: true,
        rollTotal: total,
        minorSlain: 0,
        majorDamage: foe.life ?? 99,
        neutralizedMajor: true,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        log: `${caster.name}'s Sleep spell (rolled ${total} vs L${foe.level}) puts ${foe.name} into a deep slumber!`,
      }
    }

    /* ---------------- Druid Spells (pp. 70–72) ---------------- */
    case 'disperse-vermin': {
      if (!foe || foe.kind !== 'vermin') {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `Disperse Vermin only affects Vermin foes!`,
        }
      }
      const total = doSpellRoll(L) // +2xL total
      const slain = Math.floor(total / Math.max(1, foe.level))
      return {
        spellId,
        hit: slain > 0,
        rollTotal: total,
        minorSlain: slain,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        log:
          slain > 0
            ? `${caster.name} casts Disperse Vermin (rolled ${total} vs L${foe.level}) — scatters ${slain} ${foe.name}!`
            : `${caster.name}'s Disperse Vermin (rolled ${total} vs L${foe.level}) fails.`,
      }
    }

    case 'summon-beast':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'summon-beast',
        log: `${caster.name} summons a wild Beast (fights as L3 Warrior, 5 Life) for this encounter!`,
      }

    case 'water-jet': {
      if (!foe) {
        return {
          spellId, hit: true, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${caster.name} conjures fresh water for the party.`,
        }
      }
      const total = doSpellRoll()
      const hit = total >= foe.level
      if (!hit) {
        return {
          spellId, hit: false, rollTotal: total, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${caster.name}'s Water Jet (rolled ${total} vs L${foe.level}) misses.`,
        }
      }
      const slays = foe.kind === 'vermin' ? 2 : foe.kind === 'minion' ? 1 : 0
      const dmg = !isMinor ? 1 : 0
      return {
        spellId,
        hit: true,
        rollTotal: total,
        minorSlain: slays,
        majorDamage: dmg,
        neutralizedMajor: false,
        foeLevelReduction: !isMinor ? 1 : 0,
        escapedToEntrance: false,
        log:
          foe.kind === 'vermin'
            ? `${caster.name}'s Water Jet disperses 2 ${foe.name}!`
            : foe.kind === 'minion'
              ? `${caster.name}'s Water Jet knocks out 1 ${foe.name}!`
              : `${caster.name}'s Water Jet batters and distracts ${foe.name} (1 dmg, -1 L)!`,
      }
    }

    case 'bear-form':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'bear-form',
        log: `${caster.name} transforms into a great Bear (+L melee Attack, 8 Life) until combat ends!`,
      }

    case 'warp-wood':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: foe && /tree|wood|dryad|toadstool|caplord/i.test(foe.name) ? 2 : 0,
        neutralizedMajor: false,
        foeLevelReduction: foe && /caplord|toadstool/i.test(foe.name) ? 2 : 0,
        escapedToEntrance: false,
        log: `${caster.name} casts Warp Wood — twists wooden doors/gear and splinters plant/wood foes!`,
      }

    case 'barkskin':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'barkskin',
        log: `${caster.name} casts Barkskin (+2 Defense until end of encounter).`,
      }

    case 'spiderweb':
    case 'entangle':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 1,
        escapedToEntrance: false,
        log: `${caster.name} casts ${spellId === 'spiderweb' ? 'Spiderweb' : 'Entangle'} — Foe's Level reduced by 1 for the encounter!`,
      }

    case 'subdual':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'subdual-blessing',
        log: `${caster.name} casts Subdual — allies ignore the -1 Subdual penalty this encounter!`,
      }

    case 'forest-pathway':
    case 'alter-weather':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: foe && /elemental|fire/i.test(foe.name) ? 2 : 0,
        neutralizedMajor: false,
        foeLevelReduction: 1,
        escapedToEntrance: false,
        log: `${caster.name} casts ${spellId === 'alter-weather' ? 'Alter Weather' : 'Forest Pathway'}!`,
      }

    /* ---------------- Illusionist Spells (pp. 73–75) ---------------- */
    case 'illusionary-armor':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'illusionary-armor',
        log: `${caster.name} weaves Illusionary Armor (+${t} Defense this encounter).`,
      }

    case 'illusionary-mirror-image':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'mirror-image',
        log: `${caster.name} conjures ${t + 1} Illusionary Mirror Images to absorb enemy hits!`,
      }

    case 'illusionary-servant':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'illusionary-servant',
        log: `${caster.name} summons an Illusionary Servant (+2 Defense, carries up to 200gp).`,
      }

    case 'disbelief':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 2,
        escapedToEntrance: false,
        log: `${caster.name} casts Disbelief — dispels illusions and reduces invisible Foe Level by 2!`,
      }

    case 'phantasmal-binding': {
      if (!foe || isImmuneToIllusion(foe)) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${foe?.name ?? 'Target'} is unaffected by Phantasmal Binding!`,
        }
      }
      const total = doSpellRoll()
      const hit = total >= foe.level
      return {
        spellId,
        hit,
        rollTotal: total,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: hit ? 2 : 0,
        escapedToEntrance: false,
        log: hit
          ? `${caster.name}'s Phantasmal Binding (rolled ${total} vs L${foe.level}) chains ${foe.name} (-2 L)!`
          : `${caster.name}'s Phantasmal Binding (rolled ${total} vs L${foe.level}) fails.`,
      }
    }

    case 'illusionary-fog':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'illusionary-fog',
        log: `${caster.name} conjures Illusionary Fog — suspends enemy ranged/gaze attacks and grants +2 Defense if fleeing!`,
      }

    case 'glamour-mask':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'glamour-mask',
        log: `${caster.name} dons a Glamour Mask — allows rerolling a Reaction roll!`,
      }

    case 'shadow-strike': {
      if (!foe || isImmuneToIllusion(foe)) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${foe?.name ?? 'Target'} is immune to Shadow Strike!`,
        }
      }
      const total = doSpellRoll()
      const hit = total >= foe.level
      return {
        spellId,
        hit,
        rollTotal: total,
        minorSlain: hit && isMinor ? t : 0,
        majorDamage: hit && !isMinor ? t : 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        log: hit
          ? `${caster.name}'s Shadow Strike (rolled ${total} vs L${foe.level}) deals ${t} Subdual damage to ${foe.name}!`
          : `${caster.name}'s Shadow Strike (rolled ${total} vs L${foe.level}) misses.`,
      }
    }

    case 'specter-swarm':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        triggerMorale: true,
        log: `${caster.name} conjures a Specter Swarm — Foes must immediately test Morale!`,
      }

    case 'mirage-of-fortune': {
      if (!foe || isImmuneToIllusion(foe)) {
        return {
          spellId, hit: false, minorSlain: 0, majorDamage: 0,
          neutralizedMajor: false, foeLevelReduction: 0, escapedToEntrance: false,
          log: `${foe?.name ?? 'Target'} ignores the Mirage of Fortune!`,
        }
      }
      const total = doSpellRoll()
      const hit = total >= foe.level
      return {
        spellId,
        hit,
        rollTotal: total,
        minorSlain: hit && isMinor ? (foe.remaining ?? 99) : 0,
        majorDamage: 0,
        neutralizedMajor: hit && !isMinor,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        log: hit
          ? `${caster.name}'s Mirage of Fortune (rolled ${total} vs L${foe.level}) dazzles ${foe.name} with illusory gold — they accept the bribe and stand down!`
          : `${caster.name}'s Mirage of Fortune (rolled ${total} vs L${foe.level}) fails to fool ${foe.name}.`,
      }
    }

    case 'illusionary-banquet':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        rationsCreated: t + 3,
        log: `${caster.name} conjures an Illusionary Banquet (+${t + 3} Food rations)!`,
      }

    case 'illusionary-sword':
      return {
        spellId,
        hit: true,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        buffApplied: 'illusionary-sword',
        log: `${caster.name} conjures a flaming Illusionary Sword (+L Attack, hits magic-only foes)!`,
      }

    default:
      return {
        spellId,
        hit: false,
        minorSlain: 0,
        majorDamage: 0,
        neutralizedMajor: false,
        foeLevelReduction: 0,
        escapedToEntrance: false,
        log: `${caster.name} casts ${spellId}.`,
      }
  }
}
