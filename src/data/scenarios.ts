import type { Scenario } from './schema'

/* ============================================================
   Scenarios transcribed from the book:
   - The Witch's Cave (Milethia) — table-driven (pp.127–132)
   - The Purple Crystals / Abandoned Mines — scripted intro (pp.133–144)
   ============================================================ */

export const scenarios: Scenario[] = [
  /* ---------------- The Witch's Cave ---------------- */
  {
    id: 'witchs-cave',
    name: 'The Witch’s Cave',
    kind: 'table-driven',
    intro:
      'The witch Milethia has cursed Parkalon, a captain of the guards, who writhes upon his deathbed. Her blessings-of-clerics-proof curse will kill him. Milethia hides in a cave two days’ march from the city. Kill or capture the witch before the curse completes to save Parkalon and claim the 100gp reward.',
    tables: [
      {
        id: 'mc-content', name: 'Milethia’s Cave Content Table', dice: '2d6', environment: 'scenario',
        entries: [
          { roll: '2', result: 'Roll on the Treasure Table.' },
          { roll: '3', result: 'Roll on the Traps Table and then on the Treasure Table.' },
          { roll: '4', result: 'Roll on the Special Events Table.' },
          { roll: '5', result: 'This tile is Empty. You find 1 Clue. Roll on the Special Feature Table.' },
          { roll: '6', result: 'Roll on the Vermin Table.' },
          { roll: '7-8', result: 'Roll on the Minions Table.' },
          { roll: '9', result: 'This tile is Empty. You find 1 Clue.' },
          { roll: '10', result: 'Roll on the Weird Monsters Table.' },
          { roll: '11', result: 'Roll on the Boss Monsters Table.' },
          { roll: '12', result: 'This tile is Empty. You find 1 Clue.' },
        ],
        note: 'As soon as you obtain your second Clue, read Milethia’s Secret.',
      },
      {
        id: 'mc-features', name: 'Milethia’s Cave — Special Features Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '1-3', result: 'Fountain: the first time you encounter a fountain, all wounded PCs recover 1 Life. Additional fountains have no effect.' },
          { roll: '4-6', result: 'Cursed Altar: a random PC is cursed (-1 Defense). Break the curse by killing a Major Monster alone or receiving a Blessing.' },
        ],
      },
      {
        id: 'mc-events', name: 'Milethia’s Cave — Special Events Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '1-3', result: 'A ghost drifts through the party. All PCs Save vs. L4 magic (clerics +L) or lose 1 Life.' },
          { roll: '4-6', result: 'A wandering healer heals the party for 10gp per Life restored.' },
        ],
      },
      {
        id: 'mc-traps', name: 'Milethia’s Cave — Traps Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '1-3', result: 'Dart trap! A random PC makes an L2 Defense roll or loses 1 Life.' },
          { roll: '4-6', result: 'Poisonous gas! All PCs Save vs. L3 poison or lose 1 Life (halflings may reroll).' },
        ],
      },
      {
        id: 'mc-treasure', name: 'Milethia’s Cave — Treasure Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '0-', result: 'No Treasure found.' },
          { roll: '1-2', result: '1d6+4gp.' },
          { roll: '3', result: 'Choose one: 1 rope, 1 lantern, or 1 hand weapon (blunt or slashing).' },
          { roll: '4', result: 'A gemstone worth 2d6 × 5gp.' },
          { roll: '5', result: 'Disinfectant Paste (1 dose): restores 1 Life lost from failed infection/poison/disease Saves. Not in combat. Resale 7gp.' },
          { roll: '6', result: 'Lucky Horseshoe: the bearer may reroll a single die roll once, then it loses its magic. Barbarians cannot use it. Resale 10gp.' },
        ],
      },
    ],
    foeTables: [
      {
        id: 'mc-vermin', name: 'Milethia’s Cave — Vermin Table', dice: 'd6', environment: 'scenario',
        entries: [
          {
            roll: '1-3',
            foes: [{ name: 'Rats', count: '3d6', kind: 'vermin', level: 'L1', attacks: 1, treasure: 'none', morale: 'standard', reactions: '1-3 Flee, 4-6 Fight', tags: ['animal'], text: 'Each wounded PC rolls 1-in-6 to lose 1 Life to infection at the end (disinfectant paste prevents this).' }],
          },
          {
            roll: '4-6',
            foes: [{ name: 'Kobold Skeletons', count: '1d6', kind: 'vermin', level: 'L3', attacks: 1, treasure: 'none', morale: 'never', reactions: '1-3 Flee, 4-6 Fight', tags: ['undead'], text: 'Blunt weapons attack at +1, arrows at -1.' }],
          },
        ],
      },
      {
        id: 'mc-minions', name: 'Milethia’s Cave — Minions Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '1', foes: [{ name: 'Trained Bats', count: '1d6+4', kind: 'minion', level: 'L2', attacks: 1, treasure: 'none', morale: 'standard', reactions: '1-2 Flee, 3-6 Fight', tags: ['animal'], text: 'Trained to attack a chosen PC, who suffers -1 to Attack and Defense until the fight ends.' }] },
          { roll: '2', foes: [{ name: 'Kobold Scouts', count: '2d6+3', kind: 'minion', level: 'L2', attacks: 1, treasure: '-1', morale: '-1', reactions: '1 Flee, 2 Flee if outnumbered, 3 Peaceful, 4 Bribe (5gp each), 5-6 Fight', tags: [], text: 'Half (rounded down) carry javelins and throw them before the melee.' }] },
          { roll: '3', foes: [{ name: 'Milethia’s Zombies', count: '2d6', kind: 'minion', level: 'L3', attacks: 1, treasure: 'none', morale: 'never', reactions: 'always fight to the death', tags: ['undead'], text: 'Arrows attack at -1. Immune to Sleep and Poison.' }] },
          { roll: '4', foes: [{ name: 'Icy Shadows of the Depths', count: '1d6+2', kind: 'minion', level: 'L3', attacks: 1, treasure: '+1', morale: 'never', reactions: 'always fight to the death', tags: ['undead'], text: 'Hate light: extra attacks target the lantern-bearer (who has +1 to melee vs. them). A vial of holy water automatically kills 1.' }] },
          { roll: '5', foes: [{ name: 'Jackal-Men', count: '1d6+1', kind: 'minion', level: 'L4', attacks: 1, treasure: '+1', morale: '-1', reactions: '1-2 Bribe (all your Treasure), 3-6 Fight', tags: [], text: 'Whenever one dies, roll 1d6: on a 1, 1d3 more arrive next turn.' }] },
          { roll: '6', foes: [{ name: 'Deep Hags', count: '1d6', kind: 'minion', level: 'L5', attacks: 1, treasure: '+1', morale: 'standard', reactions: '1-2 Spend 50gp to buy 1 Clue (else fight), 3 Peaceful, 4-6 Fight', tags: [], text: 'At the start, roll 1d6: if ≤ the number of hags in play, a random PC is bewitched (-2 to Attack until the encounter ends or a Blessing).' }] },
        ],
        note: 'Surviving 10 Minion encounters grants 1 XP roll. Roll d6 for tile shapes (rotate/mirror/truncate freely).',
      },
      {
        id: 'mc-weird', name: 'Milethia’s Cave — Weird Monsters Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '1-3', foes: [{ name: 'Iron-Eater', kind: 'weird', level: 'L3', life: '4', attacks: 3, treasure: 'none', morale: 'standard', reactions: '1 Flee, 2-3 Bribe (1d6gp to distract), 4-6 Fight', tags: ['artificial'], text: 'Heavy armor gives no Defense (light/shield do). On a hit the PC takes no damage but loses Armor, Shield, Main weapon, then 3d6gp. Non-metallic items unaffected.' }] },
          { roll: '4-6', foes: [{ name: 'Giant Spider', kind: 'weird', level: 'L5', life: '3', attacks: 2, treasure: '2 rolls', morale: 'standard', reactions: 'always fight', tags: ['animal'], text: 'A wounded PC Save vs. L3 poison or lose 1 additional Life. The web prevents withdrawal; a Fireball burns it.' }] },
        ],
        note: 'Defeating any Major Foe grants 1 XP roll.',
      },
      {
        id: 'mc-boss', name: 'Milethia’s Cave — Boss Monsters Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '1-3', foes: [{ name: 'Mummy', kind: 'boss', level: 'L5', life: '4', attacks: 2, treasure: '+2', morale: 'never', reactions: 'always fight to the death', tags: ['undead'], text: 'A PC killed becomes a new mummy and must be fought. All fire-based spells hit at +2.' }] },
          { roll: '4-6', foes: [{ name: 'Ogre', kind: 'boss', level: 'L5', life: '6', attacks: 1, damage: '2', treasure: 'standard', morale: 'standard', reactions: '1 Bribe (30gp), 2-3 Fight, 4-6 Fight to the death', tags: [], text: 'Each hit deals 2 damage.' }] },
        ],
        note: 'Defeating any Major Foe grants 1 XP roll.',
      },
    ],
    notes: [
      'Generating tiles: roll 1d6 for tile shape (rotate, mirror or truncate freely — exact shape is not important).',
      'Encountering Milethia: after the 4th tile, each time you meet a Major Foe (including Wandering Monsters) roll 1d6 +1 per Major Foe so far; on 6+ you encounter Milethia. You meet her automatically in the 12th tile.',
      'Milethia the Witch — L5 Boss Monster, 1 attack, 6 Life, Never Tests Morale, Treasure: 3 rolls at +1. Each turn roll d6: 1–3 she stabs a PC with her dagger (an L4 attack dealing 1 damage); 4–6 she casts a Curse on the PC with the most Life (Save vs. L5 magic; clerics and wizards +L). On a failure that PC is Cursed and loses 1 Life on each of Milethia’s turns (she won’t target the same PC twice; the Curse ends when she is defeated; a Blessing stops the Life loss for 3 turns). Reaction: Always Fight to the death. Defeating her grants 2 XP rolls.',
      'Milethia’s Secret (read once you find 2 Clues): in a niche in her laboratory you find a letter from Parkalon admitting the child was theirs and that he had the son taken away to be raised religiously to protect his reputation.',
      'Alternate Ending: if you discovered Milethia’s Secret, you may spare her and reveal the truth to the authorities — you forfeit the 100gp bounty and her Treasure but gain 2 XP rolls, one per different PC.',
    ],
  },

  /* ---------------- The Purple Crystals / Abandoned Mines ---------------- */
  {
    id: 'purple-crystals',
    name: 'The Purple Crystals',
    kind: 'scripted',
    intro:
      'An introductory scripted scenario for beginning characters (core classes), playable in under an hour. The Alchemists’ Guild pays 20gp for a small shining purple crystal the adventurer Ghorl took from a goblin bandit near the old abandoned silver mines. Ghorl is missing — you go to the mines to find him and the crystals. You move across a map with numbered areas, reading the matching paragraph on entry (no random tables). Three opening choices: the Guild, the seedy part of town (asking after Ghorl), or straight to the mines.',
    tables: [
      {
        id: 'am-wandering', name: 'Wandering Monsters of the Abandoned Mines Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '1', result: '1d6+1 Goblins, L3 Minions, 1 attack, 1 Life, Morale -1, No Treasure. One carries a lantern; half (min. 1) have javelins and make 1 ranged attack before melee (usable as light thrown slashing weapons, -1; elves and dwarves refuse goblin weapons).' },
          { roll: '2', result: '1d3+1 Undead Goblins, L3 Undead Minions, never test Morale, No Treasure. Immune to poison and Sleep (clerics +L vs. undead).' },
          { roll: '3', result: '2d6 Bats of the Abandoned Mines, L2 Animal Vermin, Morale -1, No Treasure. If the lantern-bearer is hit, 1d6: on a 1 the bat dies and the lantern is destroyed (no damage).' },
          { roll: '4', result: 'Hungry Orc, L5 Boss Monster, 2 attacks, 5 Life, Standard Morale, No Treasure. If you have food and do not attack immediately, 2-in-6 to bribe him with food (else he attacks first).' },
          { roll: '5', result: 'Kelak, Goblin Elite Swordsman, L4 Unique Boss, 2 attacks, 4 Life, Treasure: see below. Wields a Masterwork scimitar giving -1 to your Defense. If defeated, take it (resale 100gp): explodes on 5–6, but breaks on a 1. Unique — treat further 5s as "1" (goblins).' },
          { roll: '6', result: 'Zurla, Goblin Shaman, L5 Unique Boss, 2 attacks, 4 Life, Treasure: see below. Each turn: strikes a random PC with his staff (1 damage) + an electric shock to the heaviest-armored PC (2 damage; armor/shield bonuses do not apply). Has a bag with 25gp and 1 random scroll (only if slain). Unique — treat further 6s as "2" (undead goblins).' },
        ],
      },
      {
        id: 'am-search', name: 'Abandoned Mines — Search Table', dice: 'd6', environment: 'scenario',
        entries: [
          { roll: '1', result: 'Wandering Monsters! Roll on the Wandering Monsters of the Abandoned Mines Table.' },
          { roll: '2-4', result: 'You find nothing.' },
          { roll: '5-6', result: 'You find a purple crystal. It radiates no magic and appears worthless (gain 1 Clue; at 3 Clues, read the reveal).' },
        ],
      },
    ],
    foeTables: [],
    notes: [
      'Scripted, paragraph-based: you move between numbered rooms (1–30) and read the matching paragraph — no random table rolls for content.',
      'Ghorl (if confronted): L3 Boss Monster, 3 Life, 1 attack per turn. To capture him, render him unconscious with a Sleep spell or Subduing attacks (-1). If he survives all PC attacks once, he escapes. Whether captured or killed you take his Treasure: a pouch with 6gp and 1d6+2 purple crystals (½ gp each).',
      'Goblin bandits: L3 Minions with -1 Morale; their crude scimitars count as light slashing weapons (-1) for PCs and sell for 4gp each.',
      'Concluding the adventure: return to town. If you bring Ghorl alive, the authorities reward you with 100gp or 2 Blessing scrolls (your choice), plus 5gp for each Foe slain. You keep any items found in the mines.',
      'Food: each PC who ate rolls 1d6 (halflings auto-succeed); on 1 they suffer food poisoning (-1 to all Attack rolls until a Blessing or a rest).',
    ],
  },
]
