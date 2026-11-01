import type { Spell } from './schema'

/* ============================================================
   Spells transcribed from the book (pp.68–75).
   Wizard basics roll on a d6 Random Spell Table; druid and
   illusionist spells roll on a d12 (bark / prism).
   ============================================================ */

export const spells: Spell[] = [
  /* ---------------- Basic Wizard Spells (p.68) — d6 ---------------- */
  {
    id: 'blessing', name: 'Blessing', school: 'wizard', roll: 1, requiresRoll: false,
    text: 'Removes a curse or an effect such as being turned to stone. Works automatically. Elves cannot use this spell (a divine law). Also a prayer used by clerics.',
  },
  {
    id: 'escape', name: 'Escape', school: 'wizard', roll: 2, requiresRoll: false,
    text: 'Defensive teleportation: the caster disappears and reappears in the first tile/area of the adventure. May be cast in lieu of a Defense roll, during the Foes’ turn, or on the caster’s turn. Works automatically.',
  },
  {
    id: 'lightning', name: 'Lightning', school: 'wizard', roll: 3, requiresRoll: true,
    text: 'A lightning bolt strikes a target the caster can point at (spellcasting roll vs. the target’s L). Against Minor Foes it slays only one; against a Major Foe it inflicts 2 damage. Foes immune to electricity take no damage.',
  },
  {
    id: 'fireball', name: 'Fireball', school: 'wizard', roll: 4, requiresRoll: true,
    text: 'Works like a ranged Attack roll (+L). Against a Major Foe it inflicts 1 damage; against Minor Foes it slays a number equal to the roll minus the Foes’ L (minimum 1 even on a failure). No effect on fire-breathing dragons (affects undead dragons).',
  },
  {
    id: 'protection', name: 'Protection', school: 'wizard', roll: 5, requiresRoll: false,
    text: 'An invisible barrier around the caster or an ally gives +1 to Defense rolls until the end of the encounter. Almost invisible, automatic, and usable on allies who distrust magic.',
  },
  {
    id: 'sleep', name: 'Sleep', school: 'wizard', roll: 6, requiresRoll: true,
    text: 'Requires a spellcasting roll. Knocks out one Major Foe or a number of Minor Foes equal to d6 + caster’s L. Does not work on most dragons, Unliving targets, or Foes of L11+; many Foes are immune (noted in their description).',
  },

  /* ---------------- Druid Spells (p.70) — d12 ---------------- */
  {
    id: 'disperse-vermin', name: 'Disperse Vermin', school: 'druid', roll: 1, requiresRoll: true,
    text: 'A melee attack vs. Vermin with +2xL to the spellcasting roll. Not vs. undead/mechanical Vermin or animated objects. Dispersed Foes are not killed: no harvesting and no Treasure.',
  },
  {
    id: 'summon-beast', name: 'Summon Beast', school: 'druid', roll: 2, requiresRoll: false,
    text: 'Summons a large natural animal (boar, large cat, bear) that fights from the druid’s next turn like a L3 warrior with 5 Life and 1 damage. Disappears at the end of the encounter, when slain, or if the druid is knocked out/petrified/killed. Occupies a Marching Order slot (2 in a corridor; may guard the rearguard).',
  },
  {
    id: 'water-jet', name: 'Water Jet', school: 'druid', roll: 3, requiresRoll: true,
    text: 'A stream of water (spellcasting roll vs. the target’s L) with one effect: 2 damage to a fire creature, disperse 2 Vermin, knock out 1 Minion, or distract a Major Foe so the party can flee. Also generates a day’s water. +1 near water, -2 in a desert, no modifier in dungeons.',
  },
  {
    id: 'bear-form', name: 'Bear Form', school: 'druid', roll: 4, requiresRoll: false,
    text: 'Turn into a bear until the end of combat (no spells in bear form). Fights like a warrior of the druid’s L (min. L3) with 8 Life or the druid’s current Life, whichever is better. On reverting, half the damage suffered (rounded down) is applied to the druid.',
  },
  {
    id: 'warp-wood', name: 'Warp Wood', school: 'druid', roll: 5, requiresRoll: false,
    text: 'Destroys a wooden door, chest, bridge or stockade. Automatically inflicts 2 damage on wood golems, living trees, treemen, dryads, wood elementals and any Foe described as a tree/plant or made of wood.',
  },
  {
    id: 'barkskin', name: 'Barkskin', school: 'druid', roll: 6, requiresRoll: false,
    text: 'Skin turns to bark: +2 to Defense until the end of the encounter, but -2 on agility Saves (climbing, traps) and -2 vs. fire. May also be cast on a Foe: its L +1, but fire attacks on it are at +3 for a minimum of 2 damage.',
  },
  {
    id: 'lightning-strike', name: 'Lightning Strike', school: 'druid', roll: 7, requiresRoll: true,
    text: 'Like the wizard Lightning, but cannot be used indoors. Lightning strikes from the sky; a spellcasting roll is required to hit.',
  },
  {
    id: 'spiderweb', name: 'Spiderweb', school: 'druid', roll: 8, requiresRoll: false,
    text: 'Automatically entangles one Major Foe or d6 Minor Foes (fire-creatures, spiders and elementals unaffected). Entangled targets are at -1L attacking/defending for the encounter; a fire spell burns the web and removes it. Webbed Foes failing Morale surrender.',
  },
  {
    id: 'entangle', name: 'Entangle', school: 'druid', roll: 9, requiresRoll: false,
    text: 'Like Spiderweb but only in forest/swamp/jungle (not underground/indoors). Fire-creatures CAN be affected but break free after 2 turns; fire spells do not free them. Spiders can be affected.',
  },
  {
    id: 'subdual', name: 'Subdual', school: 'druid', roll: 10, requiresRoll: false,
    text: 'Cast on all allies, automatically. Until the end of the encounter, allies ignore the -1 modifier on Subdual attacks.',
  },
  {
    id: 'forest-pathway', name: 'Forest Pathway', school: 'druid', roll: 11, requiresRoll: false,
    text: 'Vegetation moves aside for 10 minutes x the druid’s L, letting the party walk through woodland ignoring all trees (druid must be in position 1 or 2). Trees are not cut; they return after the party passes.',
  },
  {
    id: 'alter-weather', name: 'Alter Weather', school: 'druid', roll: 12, requiresRoll: false,
    text: 'Outside only. Summon bad weather for 10 minutes: -1 to all non-magical ranged attacks and +1 to druid Lightning Strike. Also 2 automatic damage to fire/air elementals, douse natural fire, or stop a storm.',
  },

  /* ---------------- Illusionist Spells (p.73) — d12 ---------------- */
  {
    id: 'illusionary-armor', name: 'Illusionary Armor', school: 'illusionist', roll: 1, requiresRoll: false,
    text: 'A shining suit of armor grants +Tier to Defense until the end of the encounter. Does not apply vs. Foes unaffected by illusions (vermin, undead, artificial, elemental).',
  },
  {
    id: 'illusionary-mirror-image', name: 'Illusionary Mirror Image', school: 'illusionist', roll: 2, requiresRoll: false,
    text: 'Creates Tier+1 copies of the illusionist. Each has 1 Life and absorbs one attack (any damage), vanishing when hit (auto-hit, no Defense). Disappear on Disbelief, if the caster flees, or if an area attack hits the party.',
  },
  {
    id: 'illusionary-servant', name: 'Illusionary Servant', school: 'illusionist', roll: 3, requiresRoll: false,
    text: 'A servant carries up to 200gp, 4 weapons, armor, 2 shields and 10 Food. Life = the illusionist’s Tier, +2 Defense, no Attack; vanishes on a Trap or at 0 Life (items drop). Only one at a time; not intelligent.',
  },
  {
    id: 'disbelief', name: 'Disbelief', school: 'illusionist', roll: 4, requiresRoll: false,
    text: 'Dispels all illusion spells affecting party and Foes. Invisible gremlins become visible (d6+1 L3 Minions that steal only on a failed Defense; -1 Morale, 1 attack, 1 Treasure). Other invisible Foes lose invisibility; if none described, L -2 (min. 1).',
  },
  {
    id: 'phantasmal-binding', name: 'Phantasmal Binding', school: 'illusionist', roll: 5, requiresRoll: true,
    text: 'Spectral chains bind a target (spellcasting roll vs. its L) for Tier turns. Not vs. Foes immune to illusions. Held Foes are attacked at +2 and all damage may be Subdual; a held Foe failing Morale surrenders.',
  },
  {
    id: 'illusionary-fog', name: 'Illusionary Fog', school: 'illusionist', roll: 6, requiresRoll: false,
    text: 'A mist around the party suspends all ranged and gaze attacks and blocks Searches while it persists; fleeing PCs add +2 to Defense. Ends if the illusionist leaves the tile or dies. May be cast as a free action before ranged/gaze attacks hit.',
  },
  {
    id: 'glamour-mask', name: 'Glamour Mask', school: 'illusionist', roll: 7, requiresRoll: false,
    text: 'Changes the appearance of the caster or an ally to resemble another creature of similar size for Tier hours. May reroll a Reaction or a failed Wooing/Seduction Save, or impersonate an authority figure to pass guards.',
  },
  {
    id: 'shadow-strike', name: 'Shadow Strike', school: 'illusionist', roll: 8, requiresRoll: true,
    text: 'Shadowy blades strike a Major Foe or group of Minor Foes from different directions; on a successful spellcasting roll the target takes Tier Subdual damage. Cannot harm Foes immune to illusions.',
  },
  {
    id: 'specter-swarm', name: 'Specter Swarm', school: 'illusionist', roll: 9, requiresRoll: false,
    text: 'Illusory specters swarm around the illusionist. Foes must roll Morale or be unable to attack the illusionist until the end of the encounter. Foes immune to illusions or that never test Morale are unaffected.',
  },
  {
    id: 'mirage-of-fortune', name: 'Mirage of Fortune', school: 'illusionist', roll: 10, requiresRoll: true,
    text: 'A tempting pile of gold/jewels in sight of enemies (spellcasting roll vs. the Foes’ L) counts as an immediate successful Bribe Reaction. Foes without a Bribe Reaction or immune to illusions are unaffected. Usable during combat.',
  },
  {
    id: 'illusionary-banquet', name: 'Illusionary Banquet', school: 'illusionist', roll: 11, requiresRoll: false,
    text: 'A sumptuous meal equal to Tier+3 Food rations that sustains living beings as real food for a maximum of 7 days. After that, uneaten-rations deficit deals 1 damage per ration eaten.',
  },
  {
    id: 'illusionary-sword', name: 'Illusionary Sword', school: 'illusionist', roll: 12, requiresRoll: false,
    text: 'A flaming sword for Tier+3 turns: +L to Attack rolls and hits Foes affected only by magic weapons. All damage it inflicts is Subdual.',
  },
]
