import type { FoeTable } from './schema'

/* ============================================================
   Foe tables (monsters) — transcribed from the book.
   Dungeon (p.167–170), Caverns (p.171–174), Fungal Grottoes
   (p.175–178) and Fiendish Foes (p.181–184).
   Level is relative to HCL; maxLevel caps it. Life uses Tier/HCL.
   ============================================================ */

export const foeTables: FoeTable[] = [
  /* ==================== DUNGEON ==================== */
  {
    id: 'dungeon-vermin',
    name: 'Dungeon Vermin Table',
    dice: 'd6',
    environment: 'dungeon',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Rats', count: '3d6', kind: 'vermin', level: 'HCL', maxLevel: 4,
          treasure: 'none', morale: 'standard', reactions: '1-3 Flee, 4-6 Fight', tags: ['animal'],
          text: 'Every PC wounded by a rat must roll 1-in-6 to lose 1 Life to infection. Goblins, trolls, orcs, lizardmen and ogres eat rats (1 Food ration each).',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Vampire Bats', count: '3d6', kind: 'vermin', level: 'HCL', maxLevel: 3,
          treasure: 'none', morale: 'standard', reactions: '1-3 Flee, 4-6 Fight', tags: ['animal'],
          text: 'Spellcasting rolls at -1 due to their shrieking. Animals, not undead.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Goblin Swarmlings', count: '2d6', kind: 'vermin', level: 'HCL+1', maxLevel: 4,
          treasure: '-1', morale: '-1', reactions: '1 Flee, 2-3 Flee if outnumbered, 4 Bribe (5gp each), 5-6 Fight', tags: [],
          text: 'Dwarves attack goblin swarmlings at +1 to Attack rolls.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Giant Centipedes', count: 'd6', kind: 'vermin', level: 'HCL+1', maxLevel: 3,
          treasure: 'none', morale: 'standard', reactions: '1 Flee, 2-3 Flee if outnumbered, 4-6 Fight', tags: ['animal'],
          text: 'All living PCs hit must Save vs. L2 poison or lose 1 additional Life.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Vampire Frogs', count: 'd6', kind: 'vermin', level: 'HCL+3', maxLevel: 5,
          treasure: '-1', morale: 'standard', reactions: '1 Flee, 2-3 Blood offering, 4 Fight, 5-6 Fight to the death', tags: ['animal'],
          text: 'Amphibian blood-suckers; animals, not undead.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Skeletal Rats', count: '2d6', kind: 'vermin', level: 'HCL+2', maxLevel: 5,
          treasure: 'none', morale: 'standard', reactions: '1-2 Flee, 3-6 Fight', tags: ['undead'],
          text: 'Immune to Sleep, disease and poison. Unaffected by ranged weapons (except firearms). Crushing weapons attack at +1. A vial of holy water automatically destroys 2.',
        }],
      },
    ],
  },
  {
    id: 'dungeon-minions',
    name: 'Dungeon Minions Table',
    dice: 'd6',
    environment: 'dungeon',
    entries: [
      {
        roll: '1',
        subRoll: 'Roll d6: 1–3 = Skeletons, 4–6 = Zombies',
        text: 'HCL+2 Undead Minions, no treasure, never test Morale. Immune to Sleep, poison, disease. A vial of holy water automatically destroys 1. Crushing weapons attack skeletons at +1. Arrows/crossbow bolts at -1 vs. skeletons and zombies.',
        foes: [
          { name: 'Skeletons', count: 'd6+2', kind: 'minion', level: 'HCL+2', treasure: 'none', morale: 'never', reactions: 'always fight to the death', tags: ['undead'] },
          { name: 'Zombies', count: 'd6', kind: 'minion', level: 'HCL+2', maxLevel: 6, treasure: 'none', morale: 'never', reactions: 'always fight to the death', tags: ['undead'] },
        ],
      },
      {
        roll: '2',
        foes: [{
          name: 'Goblins', count: 'd6+3', kind: 'minion', level: 'HCL+2', maxLevel: 6,
          treasure: '-1', morale: 'standard', reactions: '1 Flee if outnumbered, 2-3 Bribe (5gp each), 4-6 Fight', tags: [],
          text: 'Dwarves attack goblins at +1. Goblins have a 1-in-6 chance of surprising the party; roll Reactions if they do, even as Wandering Monsters.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Hobgoblins', count: 'd6', kind: 'minion', level: 'HCL+3',
          treasure: '+1', morale: 'standard', reactions: '1 Flee if outnumbered, 2-3 Bribe (10gp each), 4-5 Fight, 6 Fight to the death', tags: [],
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Orcs', count: 'd6+1', kind: 'minion', level: 'HCL+3', maxLevel: 10,
          treasure: 'standard', morale: 'standard', reactions: '1-2 Bribe (10gp each), 3-5 Fight, 6 Fight to the death', tags: [],
          text: 'Elves attack orcs at +1. Orcs fear magic and roll Morale every turn 1+ are defeated by a spell (-1 if halved). Never have magic items (count as d6xd6gp).',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Trolls', count: 'd3', kind: 'minion', level: 'HCL+4', maxLevel: 7,
          treasure: 'standard', morale: 'standard', reactions: '1-2 Fight, 3-6 Fight to the death (always fight to the death if dwarves present)', tags: [],
          text: 'Halflings add +L to Defense vs. trolls. Regenerate unless slain by magic, fire or acid, or hacked apart with a slashing weapon (1 turn); each slain troll has a 2-in-6 chance of returning to life next turn.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Mushroom Men', count: '2d6', kind: 'minion', level: 'HCL+2', maxLevel: 10,
          treasure: 'standard', morale: 'standard', reactions: '1-2 Bribe (6gp each), 3-6 Fight', tags: ['mushroom'],
          text: 'Living PCs hit must Save vs. L3 poison or lose 1 additional Life. Halflings Save at +L. Mushroom PCs are immune.',
        }],
      },
    ],
  },
  {
    id: 'dungeon-weird',
    name: 'Dungeon Weird Monsters Table',
    dice: 'd6',
    environment: 'dungeon',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Minotaur', kind: 'weird', level: 'HCL+4', life: 'Tier+3', attacks: 2,
          treasure: 'standard', morale: 'standard', reactions: '1-2 Bribe (60gp), 3-5 Fight, 6 Fight to the death', tags: [],
          text: 'Due to its charge, the first Defense roll vs. a minotaur’s attack is at -1. Halflings can’t use Luck in minotaur encounters.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Iron Eater', kind: 'weird', level: 'HCL+2', life: 'Tier+3', attacks: 3,
          treasure: 'none', morale: 'standard', reactions: '1 Flee, 2-3 Bribe (d6gp to distract; can’t use Fools’ Gold), 4-6 Fight', tags: ['artificial'],
          text: 'Attacks inflict no damage but destroy metal items (magic included): first armor, then shield, then main weapon, then 3d6gp. Light armor/shield give Defense; heavy doesn’t unless non-metallic.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Chimaera', kind: 'weird', level: 'HCL+4', life: 'Tier+5', attacks: 3,
          treasure: 'standard', morale: 'standard', reactions: '1 Bribe (50gp), 2-6 Fight', tags: ['chaos'],
          text: 'Chaos Weird Monster. 2-in-6 each turn it breathes fire instead of its 3 attacks: all PCs Save vs. L4 fire or lose 1 Life.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Catoblepas', kind: 'weird', level: 'HCL+3', life: 'Tier+3', attacks: 1,
          treasure: '+1', morale: 'standard', reactions: '1 Flee, 2-6 Fight', tags: [],
          text: 'At the beginning of the encounter, all PCs must Save vs. L4 gaze or lose 1 Life.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Giant Spider', kind: 'weird', level: 'HCL+4', life: 'Tier+2', attacks: 2,
          treasure: '2 rolls', morale: 'standard', reactions: 'always fight', tags: ['animal'],
          text: 'A living PC hit must Save vs. L3 poison or lose 1 Life. Because of the web, PCs may not flee until a Fireball is cast or a torch burns it.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Invisible Gremlins', kind: 'event', level: '', treasure: 'none', morale: 'never', reactions: 'n/a', tags: ['artificial'],
          text: 'No stats — an event, not a Foe, and cannot be the Final Boss. They steal d6+3 items (magic items, scrolls, potions, weapons, gems, gold 10gp at a time). Gremlin-repelled items are safe. If they steal ALL equipment they leave a thank-you note counting as 1 Clue.',
        }],
      },
    ],
  },
  {
    id: 'dungeon-boss',
    name: 'Dungeon Boss Monsters Table',
    dice: 'd6',
    environment: 'dungeon',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Mummy', kind: 'boss', level: 'HCL+4', life: 'Tier+3', attacks: 2,
          treasure: '+2', morale: 'never', reactions: 'always fight to the death', tags: ['undead'],
          text: 'Immune to Sleep and poison. A PC slain becomes a mummy one turn later and attacks the party. Flammable: fire/torches +2, a flask of oil +2 more.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Orc Brute', kind: 'boss', level: 'HCL+4', life: 'Tier+4', attacks: 2,
          treasure: '+1', morale: 'standard', reactions: '1 Bribe (50gp), 2-5 Fight, 6 Fight to the death', tags: [],
          text: 'Elves attack him at +1. Never has magic items (count as d6xd6gp).',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Ogre', kind: 'boss', level: 'HCL+4', life: 'Tier+4', attacks: 1, damage: 'Tier+1',
          treasure: 'standard', morale: 'standard', reactions: '1 Bribe (30gp), 2-3 Fight, 4-6 Fight to the death', tags: [],
          text: 'Its attacks inflict Tier+1 damage.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Medusa', kind: 'boss', level: 'HCL+3', life: 'Tier+3', attacks: 1,
          treasure: '+1', morale: 'standard', reactions: '1 Bribe (6d6gp), 2 Quest, 3-5 Fight, 6 Fight to the death', tags: [],
          text: 'At the beginning of the encounter (before ranged attacks), all PCs Save vs. L4 gaze or be turned to stone. Rogues add +1/2L. A Blessing restores 1 PC.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Chaos Lord', kind: 'boss', level: 'HCL+5', life: 'Tier+3', attacks: 3,
          treasure: '2 rolls at +1', morale: 'standard', reactions: '1 Flee if outnumbered, 2 Fight, 3-6 Fight to the death', tags: ['chaos'],
          text: 'Chaos Boss. 2-in-6 chance of 1 Clue. Roll d6 powers: 1-3 none, 4 evil eye (Save vs. L4 magic or -1 Defense until slain), 5 energy drain (Save vs. L4 magic or lose 1 L; Blessing restores), 6 hellfire blast (Save vs. L6 magic or lose 2 Life; clerics +1/2L).',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Young Dragon', kind: 'boss', level: 'HCL+5', life: 'Tier+4', attacks: 2,
          treasure: '3 rolls at +1', morale: 'standard', reactions: '1 Sleep (all PCs +2 to first Attack), 2-3 Bribe (all gp, min 100gp or 1 magic item), 4 Quest, 5-6 Fight', tags: ['dragon'],
          text: 'Immune to Sleep. Each turn roll d6: 1-2 breathes fire (all Save vs. L6 breath or lose 2 Life; all +1/2L); 3-6 attacks 2 random targets (1 damage). Never encountered as a Wandering Monster.',
        }],
      },
    ],
  },

  /* ==================== CAVERNS ==================== */
  {
    id: 'caverns-vermin',
    name: 'Caverns Vermin Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Echo Bats', count: '2d6', kind: 'vermin', level: 'HCL+1', maxLevel: 4,
          treasure: 'none', morale: '+1', reactions: '1 Flee, 2 Ignore, 3-5 Blood Offering, 6 Fight', tags: ['animal'],
          text: 'In tiles with the Echo rule, increase their L by 1.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Mud Centipede', count: '2d6+1', kind: 'vermin', level: 'HCL', maxLevel: 4,
          treasure: 'none', morale: 'standard', reactions: 'Ignore, or Fight if the pool is inspected (protect their eggs)', tags: ['animal'],
          text: 'Always ignore the PCs unless encountered in a tile with a water pool that the PCs inspect — then they always Fight.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Vengeance Cockroaches', count: '3d6', kind: 'vermin', level: 'HCL+1', maxLevel: 3,
          treasure: 'none', morale: 'standard', reactions: '1-2 Flee, 3 Bribe (4 Food rations), 4-6 Fight', tags: ['animal'],
          text: 'Immune to Sleep. If some flee, note how many; the next encounter this adventure adds the escaped ones.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Stalactomimics', count: 'd6+1', kind: 'vermin', level: 'HCL+2',
          treasure: 'none', morale: 'standard', reactions: '1-3 Ignore, 4-6 Fight', tags: ['elemental'],
          text: 'Small rock elementals that look like stalactites. Immune to Sleep and Poison. Each attacks only once, always surprising the PCs.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Screaming Toads', count: 'd6+2', kind: 'vermin', level: 'HCL+3',
          treasure: 'none', morale: '+1', reactions: '1-2 Flee, 3 Bribe (4 Food), 4-6 Fight', tags: ['animal'],
          text: 'Deafening croaking gives -1 to all spellcasting rolls. If not slain within a single turn, 2-in-6 chance Wandering Monsters arrive at the end.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Red Cave Spiders', count: 'd6', kind: 'vermin', level: 'HCL+2',
          treasure: 'standard', morale: '-1', reactions: '1-2 Flee, 3-4 Fight, 5-6 Fight to the death', tags: ['animal'],
          text: 'Immune to Poison. A living PC taking 2+ damage has a paralyzed limb (d6: 1-3 arm, 4-6 leg) until Healing/Blessing. Ogres, trolls and goblins consider them a delicacy (1 Food).',
        }],
      },
    ],
  },
  {
    id: 'caverns-minions',
    name: 'Caverns Minions Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Morlocks', count: 'd6+1', kind: 'minion', level: 'HCL+3',
          treasure: 'standard', morale: '-1', reactions: '1-2 Bribe (15gp or 5 Food for the group), 3 Offer information (Morlock Spy), 4-6 Fight', tags: [],
          text: 'Pale, cowardly humanoids that dislike light. A PC with a light source has +2 to Defense against them.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Cave Goblins', count: 'd6+1', kind: 'minion', level: 'HCL+2', maxLevel: 5,
          treasure: '-1', morale: '-1', reactions: '1 Flee, 2-3 Bribe (5gp each), 4-6 Fight', tags: [],
          text: '2-in-6 chance of surprise. Armed with poor-quality clubs: PCs in Heavy Armor get +1 to Defense.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Cave Skeletons', count: '2d6', kind: 'minion', level: 'HCL+2',
          treasure: 'none', morale: 'never', reactions: 'always fight to the death', tags: ['undead'],
          text: 'Animated miner bones covered in mud; 1-in-6 chance of surprise. Armed with pickaxes. Crushing weapons +1. A vial of holy water destroys 2.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Rat Men of the Deep', count: 'd6+1', kind: 'minion', level: 'HCL+2',
          treasure: 'standard', morale: 'standard', reactions: '1-3 Bribe (1 Ration or 5gp or 1 Mushroom each), 4-6 Fight', tags: [],
          text: 'Before melee, each performs an HCL+3 ranged crossbow attack. In melee they use flails: PCs ignore shield Defense bonuses.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Cave Orcs', count: 'd6+1', kind: 'minion', level: 'HCL+3',
          treasure: 'standard', morale: 'standard', reactions: '1-3 Buy Weapons (full price, but not if dwarves/elves present), 4-6 Fight', tags: [],
          text: 'Due to their charge, PCs have -1 Defense on the first turn. From turn 2, Heavy Armor gives +1 Defense (poor clubs).',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Cavemen', count: 'd6+3', kind: 'minion', level: 'HCL+2', maxLevel: 5,
          treasure: 'none', morale: 'standard', reactions: '1 Flee, 2-3 Bribe (1 Food per caveman or 1 gem of any value), 4-6 Fight', tags: [],
          text: 'Armed with two-handed clubs. Must roll Morale if one is killed by a fire-based attack (once per encounter).',
        }],
      },
    ],
  },
  {
    id: 'caverns-weird',
    name: 'Caverns Weird Monsters Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Drillworm', kind: 'weird', level: 'HCL+4', life: 'HCL+3', attacks: 1, damage: 'Tier',
          treasure: '2 rolls', morale: 'standard', reactions: 'always fight to the death', tags: [],
          text: 'Immune to Sleep. Roll d6: 1-3 enters from an opening; 4-6 from underground (3-in-6 surprise). Drill inflicts Tier damage. A PC rolling 1 on Defense loses 1 item (shield/weapon/lantern/scroll/potion/all Food); non-magic destroyed, magic recovered after combat.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Cavern Wraith', kind: 'weird', level: 'HCL+3', life: 'HCL+2 (min. 4)', attacks: 1,
          treasure: '2 rolls', morale: 'never', reactions: '1 Ignore, 2-3 Blood Offering, 4-6 Fight to the death', tags: ['undead'],
          text: 'Immune to Sleep and poison. Takes 2 damage from holy water. If not hit by the end of the PCs’ turn, all PCs automatically lose 1 Life.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Cavern Sludge', kind: 'weird', level: 'HCL+2', life: 'Tier+3', attacks: 1,
          treasure: '1 roll', morale: 'never', reactions: 'always fight to the death', tags: ['slime'],
          text: 'Immune to Sleep and poison. 4-in-6 surprise. All characters (incl. animals/hirelings) receive 1 attack per turn. Lightning: loses 2L plus damage; at L0 it is destroyed.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Minosaur', kind: 'weird', level: 'HCL+4', life: 'HCL+4', attacks: 3,
          treasure: 'standard', morale: 'standard', reactions: 'always fight', tags: [],
          text: 'Lizardman/minotaur cross with a two-handed weapon. L increases by 1 on its first turn (not if hit by ranged attacks before melee). A PC rolling 1 on Defense is knocked down (1 turn to rise).',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Cornucopia of Chaos', kind: 'weird', level: 'HCL+6', life: 'Tier+2', attacks: 0,
          treasure: '2 rolls', morale: 'never', reactions: 'always fight to the death', tags: ['chaos', 'artificial'],
          text: 'Chaos construct that does not attack but generates d6 Azure Gremlins (L2 Vermin, no Morale, no Treasure) per turn; guarded by d6+1 gremlins. May not be attacked while gremlins are in play (spells OK). If destroyed, gremlins become coal worth 1gp each.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Cave Dragon', kind: 'weird', level: 'HCL+5', life: 'HCL+4', attacks: 2,
          treasure: '3 rolls', morale: '-1', reactions: '1 Flees, 2-3 Quest, 4 Bribe (50gp gem), 5-6 Fight', tags: ['dragon'],
          text: 'Begins by spitting tar (Defense vs. HCL+3 or be tarred; a 1 blinds until wiped, -1 all rolls). Other turns: 2 claws (1 damage) + fire breath (Save vs. HCL+3 Fire or lose 1 Life; +L; tarred PCs add nothing; halflings reroll). Water Jet removes tar.',
        }],
      },
    ],
  },
  {
    id: 'caverns-boss',
    name: 'Caverns Boss Monsters Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Manataur', kind: 'boss', level: 'HCL+4', life: 'HCL+3', attacks: 3,
          treasure: '+1', morale: 'standard', reactions: '1-4 Bribe (2 scrolls or potions), 5-6 Fight', tags: ['chaos'],
          text: 'Mutant minotaur with a two-handed axe that feeds on magic: every spell/prayer cast in its presence adds +1 to its Life.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Caveman Champion', kind: 'boss', level: 'HCL+4', life: 'HCL+3', attacks: 4,
          treasure: 'standard', morale: '+1', reactions: '1-2 Challenge of Champions, 3 Bribe (50gp gem or 2-handed weapon), 4-6 Fight', tags: [],
          text: 'Armed with a two-handed club.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Hoary Ogre of the Caverns', kind: 'boss', level: 'HCL+4', life: 'HCL+3', attacks: 4,
          treasure: '+1', morale: 'standard', reactions: 'always fight', tags: [],
          text: 'Battle cry at the start: all PCs Save vs. L4 Fear or lose the ability to explode Attack rolls for the encounter. Paladins immune. Halflings +L to Defense vs. ogres.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Cavern Werebear', kind: 'boss', level: 'HCL+3', life: 'HCL+4', attacks: 1,
          treasure: 'standard', morale: '+1', reactions: '1-2 Flee, 3-5 Fight, 6 Fight to the death', tags: ['were', 'animal'],
          text: 'Regenerates 1 Life every 3 turns. Silver weapons hit at +Tier. Its bite is not contagious.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Land Siren', kind: 'boss', level: 'HCL+5', life: 'HCL (min. 3)', attacks: 1,
          treasure: '2 rolls', morale: 'standard', reactions: '1-4 Quest, 5-6 Fight', tags: [],
          text: 'All living PCs Save vs. HCL+2 magic or fall asleep (+1/2L; halflings reroll). She gains 1 Attack per PC asleep and fights with claws (glands sell for d6x5gp). Awake PCs spend 1 turn waking a companion (revived fight at -1). Sleeping PCs are automatically hit.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Fire Bear', kind: 'boss', level: 'HCL+2', life: 'HCL+4', attacks: 2,
          treasure: '2 rolls', morale: 'never', reactions: 'always fight to the death', tags: ['animal'],
          text: 'Six-legged bear. Begins by breathing fire: all Defense vs. HCL+3 or lose 2 Life. Breathes fire again after any turn a PC uses a fire attack; otherwise 2 claw attacks (1 damage).',
        }],
      },
    ],
  },

  /* ==================== FUNGAL GROTOES ==================== */
  {
    id: 'fungal-vermin',
    name: 'Fungal Grottoes Vermin Table',
    dice: 'd6',
    environment: 'fungal',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Spore Mites', count: '2d6', kind: 'vermin', level: 'HCL', maxLevel: 3,
          treasure: 'none', morale: 'standard', reactions: '1-2 Flee, 3-6 Fight', tags: ['mushroom'],
          text: 'PCs hit must Save vs. L2 poison or suffer coughing fits: -1 to Attack rolls (non-cumulative) until the end of the encounter.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Glowmaggots', count: 'd6', kind: 'vermin', level: 'HCL', maxLevel: 2,
          treasure: 'none', morale: 'standard', reactions: '1-3 Ignore, 4-6 Fight', tags: ['mushroom'],
          text: 'Their glow lights the tile (no lantern needed). Each eaten counts as 1 Food but needs Save vs. L1 poison (1 Life on failure). Slain maggots light for 30 min/3 rooms.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Fungus Leeches', count: 'd6+1', kind: 'vermin', level: 'HCL+1', maxLevel: 4,
          treasure: 'none', morale: 'standard', reactions: '1-3 Flee, 4-6 Fight', tags: ['mushroom'],
          text: 'Immune to poison. PCs hit Save vs. L4 poison or lose 1 additional Life (halflings/barbarians +L). A bag of salt (2gp) kills 2 automatically.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Myco-Gnats', count: '3d6', kind: 'vermin', level: 'HCL', maxLevel: 4,
          treasure: 'none', morale: 'standard', reactions: '1-4 Flee, 5-6 Fight', tags: ['mushroom'],
          text: 'Distract PCs: -1 to all spellcasting rolls and ranged attacks. A Fireball kills them all.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Spore Toads', count: 'd6', kind: 'vermin', level: 'HCL+2', maxLevel: 4,
          treasure: '-1', morale: 'standard', reactions: '1-3 Flee, 4-6 Fight', tags: ['mushroom'],
          text: 'Each turn, 1-in-6 one belches hallucinogenic spores: all PCs Save vs. L2 magic or -1 Defense until end of encounter.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Boneworms', count: '2d6', kind: 'vermin', level: 'HCL+2', maxLevel: 5,
          treasure: '1 roll', morale: 'standard', reactions: 'always fight', tags: ['mushroom'],
          text: 'Pale bone-crunching worms. A PC slain by them cannot be resurrected. Not undead; holy water deals no damage but they must roll Morale.',
        }],
      },
    ],
  },
  {
    id: 'fungal-minions',
    name: 'Fungal Grottoes Minions Table',
    dice: 'd6',
    environment: 'fungal',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Spore Men', count: 'd6+2', kind: 'minion', level: 'HCL+2', maxLevel: 8,
          treasure: '-1', morale: 'standard', reactions: '1-2 Bribe (5gp each), 3-6 Fight', tags: ['mushroom'],
          text: 'Immune to poison. Living PCs hit must Save vs. L3 poison or lose 1 Life. Mushroom PCs immune; halflings reroll failed Saves.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Halfling Mushroom Pickers', count: 'd6+1', kind: 'minion', level: 'HCL+1', maxLevel: 5,
          treasure: 'their goods', morale: 'standard', reactions: '1 Flee, 2-3 Offer Food and Rest, 4-5 Trade, 6 Fight', tags: [],
          text: 'Armed with knives and slings. On Trade, offer d6 random rare mushrooms and 2d6 Food rations at standard prices (-10% if any halflings in party).',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Moldspawn', count: 'd6', kind: 'minion', level: 'HCL+3',
          treasure: 'none', morale: 'standard', reactions: '1-3 Bribe (1 Food each), 4-6 Fight', tags: ['mushroom'],
          text: 'Dripping green-mold humanoids. Immune to poison. PCs hit Save vs. L2 disease or lose 1 Life at the end of the encounter (1 per encounter, not per hit).',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Myceliarchs', count: 'd6+1', kind: 'minion', level: 'HCL+3',
          treasure: '+1', morale: '+1', reactions: '1 Flee, 2-4 Blood offering, 5-6 Fight', tags: ['mushroom'],
          text: 'Fungus priests, immune to poison. At combat start one casts a sleep-spore cloud: all Save vs. L3 magic or miss their next turn.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Cave Locusts', count: '2d6+2', kind: 'minion', level: 'HCL', maxLevel: 5,
          treasure: 'standard', morale: 'standard', reactions: '1-2 Ignore, 3-6 Fight', tags: ['animal'],
          text: 'Swarming insects. Armor Defense is doubled (light +2, heavy +4). They consume food: lose d6 Food rations at end of combat.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Toadstool Knights', count: 'd6', kind: 'minion', level: 'HCL+4',
          treasure: 'standard', morale: '+1', reactions: '1 Ignore, 2 Bribe (20gp each), 3-6 Fight', tags: ['mushroom'],
          text: 'Immune to poison. Fungus warriors with shield-caps; the first hit against each breaks its shield but it survives. Warp Wood destroys all caps.',
        }],
      },
    ],
  },
  {
    id: 'fungal-weird',
    name: 'Fungal Grottoes Weird Monsters Table',
    dice: 'd6',
    environment: 'fungal',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Shroom Colossus', kind: 'weird', level: 'HCL+5', life: 'Tier+5', attacks: 3, damage: 'Tier',
          treasure: 'none', morale: 'standard', reactions: 'always fight', tags: ['mushroom'],
          text: 'Not in corridors (reroll). PCs reduced to 0 Life are digested into spores and cannot be resurrected. Immune to Sleep and poison.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Spore Swarm', kind: 'weird', level: 'HCL+3', life: 'Tier+3', attacks: 1,
          treasure: 'none', morale: 'standard', reactions: 'always fight to the death', tags: ['mushroom'],
          text: 'Immune to Sleep and poison. Fire-based attacks add +Tier against it.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Myco-Mimic', kind: 'weird', level: 'HCL+4', life: 'Tier+2', attacks: 1,
          treasure: '2 rolls', morale: 'standard', reactions: 'always fight to the death', tags: ['mushroom'],
          text: 'Appears as a mushroom or mushroom-covered chest; automatic surprise; attacks d3+1 times (roll first attack). PCs hit Save vs. L3 poison or paralyzed 1 turn (halflings reroll). Immune to Sleep and poison.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Hallucinogenic Horror', kind: 'weird', level: 'HCL+3', life: 'Tier+4', attacks: 1,
          treasure: '+1', morale: 'never', reactions: 'always fight to the death', tags: ['mushroom'],
          text: 'Immune to Sleep and poison. Each turn, 1 random PC must Save vs. L3 magic or attack an ally instead.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Fungus-infected Hydra', kind: 'weird', level: 'HCL+4', life: 'Tier+4', attacks: 1,
          treasure: '2 rolls', morale: 'standard', reactions: '1 Flee, 2-3 Blood offering, 4-6 Fight', tags: ['dragon', 'mushroom'],
          text: 'Loses 1 attack per Life point lost; each head regrows in 2 turns (fire prevents regrowth). Always a minimum of 1 Attack per turn.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Spore Phantom', kind: 'weird', level: 'HCL+3', life: 'Tier+3', attacks: 2,
          treasure: '+1', morale: 'never', reactions: 'always fight to the death', tags: ['undead', 'mushroom'],
          text: 'Undead mushroom spirit; immune to Sleep and poison. Takes 2 damage from holy water. PCs hit Save vs. L3 magic or lose 1 Life at end of turn. Druids attack at +L.',
        }],
      },
    ],
  },
  {
    id: 'fungal-boss',
    name: 'Fungal Grottoes Boss Monsters Table',
    dice: 'd6',
    environment: 'fungal',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Myco-Tyrant', kind: 'boss', level: 'HCL+4', life: 'Tier+3', attacks: 3,
          treasure: '1 roll', morale: '+1', reactions: 'always fight', tags: ['mushroom'],
          text: 'Immune to Sleep and poison. At combat start, all PCs Save vs. L4 poison or lose 1 Life (mushroom PCs and halflings immune).',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Fungus Hag', kind: 'boss', level: 'HCL+3', life: 'Tier+2', attacks: 2, damage: 'Tier',
          treasure: '+1', morale: 'standard', reactions: '1 Blood offering, 2-3 Quest, 4-6 Fight', tags: ['mushroom'],
          text: 'Immune to Sleep/poison. PCs hit by her claws take Tier damage and must Save vs. L3 magic or suffer -1 to Attack (non-cumulative) until end of combat.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Spore Lord', kind: 'boss', level: 'HCL+5', life: 'Tier+3', attacks: 3,
          treasure: '2 rolls', morale: 'standard', reactions: '1 Flee, 2-3 Bribe (100gp), 4-6 Fight', tags: ['mushroom'],
          text: 'First turn releases a spore storm: all Save vs. L5 poison (+1/2L; halflings reroll) or blinded (-1 Attack/Defense) until end of encounter.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Rot Ogre', kind: 'boss', level: 'HCL+4', life: 'Tier+4', attacks: 2,
          treasure: '2 rolls', morale: 'standard', reactions: 'always fight to the death', tags: [],
          text: 'Fists spread decay: each hit requires Save vs. L3 disease (halflings/barbarians +L); failures lose 1 Life at end of combat. Halflings +L Defense vs. it.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Caplord Knight', kind: 'boss', level: 'HCL+4', life: 'Tier+4', attacks: 4,
          treasure: 'armor and weapon', morale: 'standard', reactions: '1-3 Trial of champions, 4-6 Fight', tags: ['mushroom'],
          text: 'Immune to Sleep and poison. Wears hardened-fungus armor and a sporeblade; hit PCs Save vs. L3 poison or lose 1 Life (halflings reroll). Non-magical attacks have 2-in-6 to bounce off. Warp Wood destroys armor and sporeblade (L-2).',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Fungal Dragon', kind: 'boss', level: 'HCL+5', life: 'Tier+3', attacks: 4,
          treasure: '+2', morale: 'standard', reactions: '1-3 Quest, 4-6 Fight', tags: ['dragon', 'mushroom'],
          text: 'Each turn roll d6: on 1-2 it exhales a spore breath instead of attacking (all Save vs. L5 poison or lose 1 Life; +1/2L; halflings reroll). Immune to Sleep and poison.',
        }],
      },
    ],
  },

  /* ==================== FIENDISH FOES ==================== */
  {
    id: 'fiendish-vermin',
    name: 'Fiendish Foes Vermin Table',
    dice: 'd6',
    environment: 'fiendish',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Fiendish Spiders', count: '3d6+3', kind: 'vermin', level: 'HCL',
          treasure: '-1', morale: 'standard', reactions: 'always fight', tags: ['animal'],
          text: 'Webs prevent withdrawal unless a Fireball burns them. All PCs hit Save vs. HCL+2 poison at end of combat or lose 1 Life. Crushing weapons +1.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Stirges', count: '2d6+2', kind: 'vermin', level: 'HCL+3',
          treasure: 'none', morale: 'standard', reactions: '1-3 Blood offering, 4-6 Fight', tags: ['animal'],
          text: 'A living PC hit automatically loses 1 Life every turn (on the stirges’ turn) until all are slain.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Giant Snakes', count: 'd6+4', kind: 'vermin', level: 'HCL+2',
          treasure: '1 roll', morale: 'standard', reactions: '1-2 Ignore, 3-6 Fight', tags: ['animal'],
          text: 'Living PCs hit Save vs. HCL+1 poison or lose 1 additional Life (halflings reroll).',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Giant Toads', count: 'd6+4', kind: 'vermin', level: 'HCL+2',
          treasure: 'none', morale: 'standard', reactions: '1-3 Ignore, 4-6 Fight', tags: ['animal'],
          text: 'When a toad is slain its boils burst: the PC killing it Saves vs. HCL poison or lose 1 Life, unless a ranged attack or spell was used.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Armored Skeletons', count: '2d3+4', kind: 'vermin', level: 'HCL+3',
          treasure: '-1', morale: 'never', reactions: 'always fight to the death', tags: ['undead'],
          text: 'Crushing weapons get no bonus; arrows hit at -1. Immune to Sleep and poison.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Goatmen', count: '2d3+1', kind: 'vermin', level: 'HCL+3',
          treasure: '1 roll', morale: '+2', reactions: '1 Bribe (30gp each), 2-5 Fight, 6 Fight to the death', tags: ['chaos'],
          text: 'Fanatically charge; treat them as HCL+5 on the first turn of combat.',
        }],
      },
    ],
  },
  {
    id: 'fiendish-minions',
    name: 'Fiendish Foes Minions Table',
    dice: 'd6',
    environment: 'fiendish',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Orc Looters', count: 'd6+6', kind: 'minion', level: 'HCL+2',
          treasure: '3 rolls -1', morale: 'standard', reactions: '1 Bribe (40gp each), 2 Fight, 3-6 Fight to the death', tags: [],
          text: 'Test Morale each time one or more is defeated by a spell (-1 if the spell drops them below 50%).',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Cockatrices', count: 'd3+4', kind: 'minion', level: 'HCL+3',
          treasure: '1 roll', morale: 'never', reactions: 'always fight to the death', tags: [],
          text: 'Every PC hit must Save vs. L2 petrification or be turned to stone (a Blessing reverses it).',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Possessed Dwarves', count: 'd6+3', kind: 'minion', level: 'HCL+3',
          treasure: '1 roll', morale: 'standard', reactions: '1-2 Bribe (30gp each), 3-5 Fight, 6 Fight to the death', tags: ['undead'],
          text: 'Demon-possessed zombie dwarves with scythes. If killed, roll d6: on a 3+ it attacks again next turn; if slain again it stays dead.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Gnolls', count: '2d3+4', kind: 'minion', level: 'HCL+3',
          treasure: '1 roll', morale: '+1', reactions: '1-2 Bribe (20gp each), 3-4 Fight, 5-6 Fight to the death', tags: [],
          text: 'When fighting a wounded PC they frenzy and gain +1 L when attacking.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Hobgoblin Blademasters', count: '2d3+2', kind: 'minion', level: 'HCL+3',
          treasure: '1 roll +1', morale: 'standard', reactions: '1-3 Bribe (30gp each), 4-5 Fight, 6 Fight to the death', tags: [],
          text: 'Each has 1 hand weapon (yatagan). A PC rolling 1 when attacking them in melee (not ranged/spells) suffers an immediate out-of-sequence attack.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Chaos Slavers', count: '2d3+2', kind: 'minion', level: 'HCL+4',
          treasure: '2 rolls', morale: '+1', reactions: '1-3 Bribe (40gp each), 4-6 Fight', tags: ['chaos'],
          text: 'They have set a Trap: before the encounter resolve an L4 bear trap (rogues can spot it). If met as Wandering Monsters they set no Trap.',
        }],
      },
    ],
  },
  {
    id: 'fiendish-weird',
    name: 'Fiendish Foes Weird Monsters Table',
    dice: 'd6',
    environment: 'fiendish',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Doppelganger', kind: 'weird', level: 'HCL+2', life: '5', attacks: 1,
          treasure: '1 roll', morale: 'standard', reactions: 'always fight', tags: [],
          text: 'Before combat it takes the form of a random PC. Each turn the other PCs Save vs. L4 confusion or can’t attack (confused about who is real). It attacks the mimicked PC; if that PC dies it flees.',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Scimitar Monster', kind: 'weird', level: 'HCL+5', life: '12', attacks: 2,
          treasure: '2 rolls +1', morale: 'standard', reactions: '1-2 Bribe (250gp), 3-4 Fight, 5-6 Fight to the death', tags: [],
          text: 'Reptilian with two scimitar-like appendages. If a dwarf is in the party it fights to the death. Immune to Sleep.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Green Slime', kind: 'weird', level: 'HCL+3', life: '8', attacks: 3,
          treasure: 'none', morale: 'never', reactions: 'always fight to the death', tags: ['slime'],
          text: 'On a hit it does no damage but the PC Saves vs. L4 disease (halflings +1/2L); infected PCs lose 1 extra Life whenever they lose 1. Cured by Blessing. A PC dying while infected becomes a green slime and attacks the party.',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Acid Cube', kind: 'weird', level: 'HCL+3', life: '6', attacks: 1,
          treasure: '3 rolls', morale: 'never', reactions: 'always fight to the death', tags: ['slime'],
          text: 'Transparent; 3-in-6 surprise. Does no damage but each PC Saves vs. L2 engulf each turn (L4 if it attacked with melee last turn); engulfed PCs cannot attack and are freed if the cube is slain. Immune to Sleep and Lightning.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Flesh Golem', kind: 'weird', level: 'HCL+4', life: '8', attacks: 2,
          treasure: '1 roll', morale: '+2', reactions: '1-2 Ignore, 3-6 Fight', tags: ['artificial'],
          text: 'Immune to crushing weapons and all spells except fire. Its fists inflict 2 damage if you roll 1 on a Defense roll.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Lurking Mantlebeast', kind: 'weird', level: 'HCL+3', life: '5', attacks: 0,
          treasure: 'none', morale: 'never', reactions: 'always fight to the death', tags: ['animal'],
          text: 'Manta-like ceiling lurker; not a Wandering Monster. 2-in-6 to spot (4-in-6 with a rogue). If unspotted it drops: all Save vs. L3 (-1 heavy armor, +1 elf/rogue); failures cannot attack/flee but may cast spells, losing 1 Life per turn until it dies. Successes attack freely.',
        }],
      },
    ],
  },
  {
    id: 'fiendish-boss',
    name: 'Fiendish Foes Boss Monsters Table',
    dice: 'd6',
    environment: 'fiendish',
    entries: [
      {
        roll: '1',
        foes: [{
          name: 'Chaos Lord', kind: 'boss', level: 'HCL+3', life: '7', attacks: 3,
          treasure: '3 rolls', morale: 'standard', reactions: '1-2 Bribe (200gp), 3-6 Fight to the death', tags: ['chaos'],
          text: 'Roll d6 powers: 1-4 evil eye (Save vs. L4 magic or -1 Defense until slain), 5 energy drain (Save vs. L4 magic or lose 1 level), 6 hellfire blast (Save vs. L5 magic or lose 2 Life; clerics +1/2L). Freeing his captured slaves gains 1 Clue (then roll Wandering Monsters).',
        }],
      },
      {
        roll: '2',
        foes: [{
          name: 'Skeletal Demon', kind: 'boss', level: 'HCL+4', life: '8', attacks: 2,
          treasure: '3 rolls', morale: '+1', reactions: '1-2 Magic challenge, 3-5 Fight, 6 Quest', tags: ['undead'],
          text: 'For every damage inflicted on PCs, 1 armored skeleton from the Fiendish Vermin Table joins the fray.',
        }],
      },
      {
        roll: '3',
        foes: [{
          name: 'Hobgoblin Leader', kind: 'boss', level: 'HCL+4', life: '8', attacks: 2,
          treasure: '2 rolls', morale: 'standard', reactions: '1-3 Bribe (400gp), 4-6 Fight to the death', tags: [],
          text: 'Uses a noisy rattleblade; each time he attacks, 3-in-6 chance hobgoblin blademasters arrive (once).',
        }],
      },
      {
        roll: '4',
        foes: [{
          name: 'Wraith', kind: 'boss', level: 'HCL+4', life: '6', attacks: 1,
          treasure: '2 rolls', morale: 'standard', reactions: '1-2 Bribe (1 magic item), 3 Quest, 4-6 Fight', tags: ['undead'],
          text: 'Before the fight, 2-in-6 all lanterns are extinguished. PCs hit Save vs. L4 magic or lose 1 level. Only hit by magic/silvered weapons, spells, holy water (1 damage/vial), or attacks inflicting 2+ damage in one blow.',
        }],
      },
      {
        roll: '5',
        foes: [{
          name: 'Large Troll', kind: 'boss', level: 'HCL+5', life: '7', attacks: 2,
          treasure: '4 rolls', morale: 'standard', reactions: '1-4 Bribe (250gp), 5-6 Fight to the death', tags: [],
          text: 'Crushing attacks at -1. Regenerates 1 Life on its own attack turn; not after fire/acid damage, or if chopped with a slashing melee weapon at 0 Life.',
        }],
      },
      {
        roll: '6',
        foes: [{
          name: 'Young Red Dragon', kind: 'boss', level: 'HCL+6', life: '8', attacks: 2,
          treasure: '4 rolls at +1', morale: 'standard', reactions: '1 Sleeping (all PCs +2 first attack), 2-3 Bribe (300gp), 4-5 Fight, 6 Quest', tags: ['dragon'],
          text: 'First turn breathes fire: all Save vs. L7 dragon breath (+1/2L) or take d3 damage. Thereafter 2 attacks. Never met as a Wandering Monster.',
        }],
      },
    ],
  },
]
