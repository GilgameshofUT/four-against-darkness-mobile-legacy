import type { RandTable } from './schema'

/* ============================================================
   Exploration & support random tables (transcribed from the book).
   Foe tables live in monsters.ts.
   ============================================================ */

export const tables: RandTable[] = [
  /* ---- Tile Content (p.152) ---- */
  {
    id: 'tile-content',
    name: 'Tile Content Table',
    dice: '2d6',
    entries: [
      { roll: '2', result: 'Treasure. Roll on the Treasure Table.' },
      { roll: '3', result: 'Treasure protected by a Trap. Roll on the Traps Table and then on the Treasure Table.' },
      { roll: '4', result: 'If this tile is a corridor, it is Empty and may be Searched. If it is a room, roll on the Special Events Table.' },
      { roll: '5', result: 'This tile is Empty and may be Searched. Roll on the Special Feature Table for your environment or, alternatively, find a Secret Passage.' },
      { roll: '6', result: 'Vermin encounter. Roll on the Vermin Table appropriate to your environment.' },
      { roll: '7', result: 'Minion encounter. Roll on the Minion Table appropriate to your environment.' },
      { roll: '8', result: 'If this is a corridor, it is Empty and may be Searched. If it is a room, roll on the Minions Table appropriate to your environment.' },
      { roll: '9', result: 'This tile is Empty and may be Searched; alternatively, spend 2 Clues to find a Secret Passage.' },
      { roll: '10', result: 'If this tile is a corridor, it is Empty and may be Searched. If it is a room, roll on the Weird Monsters Table appropriate to your environment.' },
      { roll: '11', result: 'Boss Encounter. Roll on the Boss Monster Table appropriate to your environment.' },
      { roll: '12', result: 'This tile is empty if it is a corridor. If it is a room, it is a dragon’s lair (Young dragon, Cave Dragon or Fungal Dragon as appropriate to your environment).' },
    ],
    note: 'Every time you roll a Major Foe, roll d6 and add +1 for each Major Foe encountered so far. On a 6+, you have found the Final Boss. When you find a Secret Passage, you may move to a different environment of your choice.',
  },

  /* ---- Special Features (Dungeon, p.153) ---- */
  {
    id: 'dungeon-special-feature',
    name: 'Dungeon Special Feature Table',
    dice: 'd6',
    environment: 'dungeon',
    entries: [
      { roll: '1', result: 'Fountain/Pool: fresh, clean water; all living PCs recover 1 Life the first time they encounter a fountain in an adventure. Further fountains have no effect; no effect on PCs who have not lost Life.' },
      { roll: '2', result: 'Blessed Temple/Shrine: a PC of your choice gains +1 to Attack rolls against undead or demons until they kill one.' },
      { roll: '3', result: 'Armory: all PCs may change weapons within their class limits; those who lost weapons may pick up a new one.' },
      { roll: '4', result: 'Cursed Altar: a random PC is cursed (-1 Defense). Break the curse by slaying a Major Foe alone, entering a Blessed Temple, or receiving a Blessing.' },
      { roll: '5', result: 'Statue: leave it or touch it. On a 1–3 it awakens and fights to the death (HCL+3 Artificial Boss, Tier+5 Life, Tier damage, immune to poison/disease/spells; 3d6x10gp inside). On a 4–6 it breaks (3d6x10gp, no XP). A living statue is a Major Foe, may be the Final Boss, gives 1 XP roll; if Final Boss, Treasure becomes 100gp.' },
      { roll: '6', result: 'Puzzle box: roll d6 for its L. Solve with a Save vs. its L; each failed attempt deals 1 damage. Wizards and rogues add +L. On success, roll on the Treasure Table.' },
    ],
  },

  /* ---- Special Events (Dungeon, p.154) ---- */
  {
    id: 'dungeon-special-events',
    name: 'Dungeon Special Events Table',
    dice: 'd6',
    environment: 'dungeon',
    entries: [
      { roll: '1', result: 'A ghost passes through the party. All PCs Save vs. L4 fear or lose 1 Life or gain 1 Madness (player’s choice). Paladins immune; clerics +L. A PC whose Madness surpasses their L runs away forever.' },
      { roll: '2', result: 'Wandering Monsters attack! Roll d6: 1–3 Vermin, 4 Minions, 5 Weird Monsters, 6 Boss Monster. Reroll dragons/never-WM foes. Major Foes met as Wandering Monsters cannot be the Final Boss.' },
      { roll: '3', result: 'A Lady in White asks you to complete a Quest (roll on the Quest Table). If you refuse she disappears. Complete it and return where you met her: gain 1 XP and 1 Epic Rewards roll.' },
      { roll: '4', result: 'Roll on the Traps Table.' },
      { roll: '5', result: 'A wandering healer heals PCs at 10gp per Life (once per adventure; reroll if met again).' },
      { roll: '6', result: 'A wandering alchemist: each PC may buy 1 potion of healing (50gp) and/or 1 dose of blade poison (30gp). Once per adventure; if rolled again, roll on the Traps Table instead.' },
    ],
  },

  /* ---- Special Events (Caverns, p.155) ---- */
  {
    id: 'caverns-special-events',
    name: 'Caverns Special Events Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      { roll: '1', result: 'A cave goblin scout: if you pay 10gp he warns you of danger — no surprise (including Wandering Monsters) and +1 to all Saves until you exit the caverns. If not paid, he walks away.' },
      { roll: '2', result: 'd6 cavemen explorers: give them 2 Food rations (whole group) or fight (HCL+3 Minions, clubs, standard Morale, 1 Life, no Treasure).' },
      { roll: '3', result: 'A morlock Spy: if you pay 5gp he betrays his companions — no surprise by morlocks until you leave. If not paid, he runs away.' },
      { roll: '4', result: 'Trap. Roll on the Cavern Trap Table.' },
      { roll: '5', result: 'With a dwarf, find a gem worth d6x10gp (risk a 1-in-6 Wandering Monsters to collect). No dwarf → ignore.' },
      { roll: '6', result: 'A dwarf miner: sell gems or buy up to d6 gems worth 25gp each. On any trade, he reveals the next tile’s contents in detail.' },
    ],
  },

  /* ---- Special Events (Fungal Grottoes, p.156) ---- */
  {
    id: 'fungal-special-events',
    name: 'Fungal Grottoes Special Events Table',
    dice: 'd6',
    environment: 'fungal',
    entries: [
      { roll: '1', result: 'A halfling scout: if you pay 10gp he warns you — no surprise (including Wandering Monsters) and +1 to all Saves until you exit. If not paid, he bids farewell.' },
      { roll: '2', result: 'd6+2 cavemen looking for mushrooms: give 4 Food rations or 1 rare mushroom or fight (HCL+3 Minions, clubs, standard Morale, 1 Life, no Treasure). If fed, they show a secret passage (next tile) from grottoes to caves.' },
      { roll: '3', result: 'Spore cloud: all living PCs except mushroom monks Save vs. HCL poison or lose 2 Life. Halflings and barbarians add +L.' },
      { roll: '4', result: 'Trap. Roll on the Fungal Grottoes Trap Table and then on the Fungal Grottoes Rare Item Table.' },
      { roll: '5', result: 'With a mushroom monk, sense danger via the mycelial network: automatically ignore the next Trap or Wandering Monsters in the grottoes. No monk → ignore.' },
      { roll: '6', result: 'A merchant: buy any Equipment-list item at 20% higher prices (round up); sell gems/rare mushrooms at full resale value. Unique — if rolled again, count as 4.' },
    ],
  },

  /* ---- Treasure (p.157) ---- */
  {
    id: 'treasure',
    name: 'Treasure Table',
    dice: 'd6',
    entries: [
      { roll: '0-', result: 'All environments: no treasure found.' },
      { roll: '1', result: 'All environments: d6gp.' },
      { roll: '2', result: 'Dungeon/Caverns: 2d6gp. Fungal grottoes: 2d6 Food rations or 1 roll on the Rare Mushroom Table.' },
      { roll: '3', result: 'Dungeon: a scroll with a random wizard spell. Fungal Grottoes: a piece of bark with a random druid spell or 1 Rare Mushroom roll. Cavern: a prism with a random illusionist spell.' },
      { roll: '4', result: 'Dungeon: a jewel worth 2d6x5gp. Fungal Grottoes: a gem worth 2d6x5gp or 2 Rare Mushroom rolls. Cavern: a gem worth 3d6x5gp.' },
      { roll: '5', result: 'Dungeon: a treasure chest with 3d6x10gp. Fungal Grottoes: a gem worth 2d6x10gp or 3 Rare Mushroom rolls. Cavern: a gem worth 3d6x10gp or a prism with a random illusionist spell.' },
      { roll: '6+', result: 'Dungeon: roll on the Dungeon Magic Treasure Table. Caverns: roll on the Caverns Special Item Table. Fungal Grottoes: Dungeon Magic Treasure or Fungal Grottoes Rare Item Table.' },
    ],
  },

  /* ---- Dungeon Magic Treasure (p.158) ---- */
  {
    id: 'dungeon-magic-treasure',
    name: 'Dungeon Magic Treasure Table',
    dice: 'd6',
    environment: 'dungeon',
    entries: [
      { roll: '1', result: 'Wand of Sleep, 3 charges (cast Sleep; wizards/illusionists/elves only; +L to spellcasting; resale 30gp/charge).' },
      { roll: '2', result: 'Ring of Teleportation: automatically pass a Defense roll, teleporting out of the room (rejoins after combat). One use. Resale 50gp unused / d6+1gp used.' },
      { roll: '3', result: 'Fools’ Gold: automatically satisfy the next Bribe. One use; resale 20gp.' },
      { roll: '4', result: 'Magic Weapon: +1 to Attack rolls (permanent). Roll d6 for type (crushing/slashing light/hand, slashing 2-handed, or bow with 12 arrows). Resale 100gp + 2x weapon cost.' },
      { roll: '5', result: 'Potion of Healing: heal all lost Life to a single PC (free action, once per adventure). Resale 100gp.' },
      { roll: '6', result: 'Dungeon/caverns: Fireball Staff, 2 charges (wizards only; +L to spellcasting; resale 60gp/charge). Fungal Grottoes: roll on the Rare Mushroom Table.' },
    ],
  },

  /* ---- Rare Mushroom (p.159) ---- */
  {
    id: 'rare-mushroom',
    name: 'Rare Mushroom Table',
    dice: 'd6',
    environment: 'fungal',
    entries: [
      { roll: '1', result: 'Slumber Amanita (10gp, one use): +Tier when casting Sleep (incl. from scroll/item).' },
      { roll: '2', result: 'Puffball smokebomb (5gp, one use): drop as a free action to flee combat without attacks (mushroom/artificial Foes unaffected).' },
      { roll: '3', result: 'Brown Cap Delight (15gp): counts as 1 Food ration when eaten, 3 Rations as a bribe.' },
      { roll: '4', result: 'Phoenix Mushroom (15gp): +1 to all Defense and Saves for 30 minutes (3 tiles), then lose 1 Life.' },
      { roll: '5', result: 'Purple Truffle: 3-in-6 chance it is a lesser look-alike (1d6gp). Real one sells for 6d6gp (halflings may reroll the 3-in-6).' },
      { roll: '6', result: 'Healer’s Chanterelle: eaten to heal all damage; loses power at the end of the adventure.' },
    ],
    note: 'Rare mushrooms are herbal remedies, not magic, usable by any PC. Ingested mushrooms: living PCs only; cannot be eaten during combat.',
  },

  /* ---- Caverns Special Item (p.160) ---- */
  {
    id: 'caverns-special-item',
    name: 'Caverns Special Item Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      { roll: '1', result: 'A small gemstone worth 3d6+3gp.' },
      { roll: '2', result: 'Glittering Crystal: glows like a lantern, worn on a leather string (frees a hand). Resale 25gp; not a magic item.' },
      { roll: '3', result: 'Map Fragment: once, roll the contents of the next tile before entering. No value outside the Caverns; worth 30gp as a Bribe there.' },
      { roll: '4', result: 'Adventurer’s Dead Body: a pouch with d6 gems (10gp each) plus 1 item of choice (Heavy Armor, Lantern, 2-handed Weapon, Bow, Crossbow, Blessing scroll, random scroll, or Jar of chicken blood).' },
      { roll: '5', result: 'Miners’ Ointment: once, ignore Wandering Monsters or invisible gremlins. Not magic; resale 20gp unused.' },
      { roll: '6', result: 'Miners’ Amulet: worn in position 1, ignore 1 Trap in the caverns (once per adventure; resale 30gp; no stacking).' },
    ],
  },

  /* ---- Fungal Grottoes Rare Item (p.161) ---- */
  {
    id: 'fungal-rare-item',
    name: 'Fungal Grottoes Rare Item Table',
    dice: 'd6',
    environment: 'fungal',
    entries: [
      { roll: '1', result: 'Choose: 1 small gemstone (2d6+2gp) or 1 suit of leafsteel armor (+2 Defense, light, non-magical; dries out after 3 adventures).' },
      { roll: '2', result: 'Xicthul’s Cap (60gp): thrown to inflict d3 automatic damage on a Foe (1 turn; user takes 1 damage when thrown).' },
      { roll: '3', result: 'Red Death: thrown at a living Foe to automatically inflict 1 damage or reduce its L by 1 (choose when found). No effect on unliving; 1 turn to throw.' },
      { roll: '4', result: 'Adventurer’s Dead Body: backpack with 1 rope, 2d6 Food rations and 2d6gp, plus 1 item of choice (Heavy Armor, Lantern, 2-handed Weapon, Bow, Crossbow, Blessing scroll, random scroll).' },
      { roll: '5', result: 'Mushroom Gatherer’s Basket: d6 white angel mushrooms — each eaten as a Food ration heals 2 Life (lose healing at adventure’s end; sell for 10gp each).' },
      { roll: '6', result: 'Morel Crusher: single use, cause a Morale roll at -1 in a Foe (never-Morale, fight-to-death, unliving and poison-immune unaffected). Resale 40gp.' },
    ],
  },

  /* ---- Quest (p.162) ---- */
  {
    id: 'quest',
    name: 'Quest Table',
    dice: 'd6',
    entries: [
      { roll: '1', result: 'Bring me its head! Kill a Boss Monster (choose the target from a Boss Table); bring its head to the Quest-giver’s tile to complete.' },
      { roll: '2', result: 'Bring me Gold! Bring d6 x 50gp of Treasure to the Quest-giver (double if already held). Caverns: gems; grottoes: rare mushrooms.' },
      { roll: '3', result: 'I want it alive! As 1, but subdue the Foe (subdual at -1 and/or Sleep) and bring it, bound with rope. Reroll vs. Foes immune to subdual.' },
      { roll: '4', result: 'Bring me that! Retrieve a rare item (roll any Items Table); 1-in-6 chance in each Major Foe’s loot. Bring it unused to the Quest-giver.' },
      { roll: '5', result: 'Let peace be your way! Complete at least 3 encounters non-violently (bribe, help, another quest, Sleep). No return needed.' },
      { roll: '6', result: 'Slay all the Foes! Complete the dungeon layout (fill the 20x28 grid) and slay all occupants except the Quest-giver. No return needed.' },
    ],
    note: 'The Quest-giver is the Foe with a Quest Reaction. On completion, roll on the Epic Rewards Table.',
  },

  /* ---- Epic Rewards (p.163) ---- */
  {
    id: 'epic-rewards',
    name: 'Epic Rewards Table',
    dice: 'd6',
    entries: [
      { roll: '1', result: 'The Book of Skalitos: counts as 1 scroll of each of the 6 basic wizard spells (distribute or assign; destroyed if the carrier is killed by dragon breath). Resale 650gp.' },
      { roll: '2', result: 'The Gold of Kerrak Dar: as soon as you Search a tile, spend 1 Clue to find a chest with 500gp.' },
      { roll: '3', result: 'Enchanted weapon: roll 2 dice for Attack rolls (best; both Explosions → roll both). Hits Foes hit only by magic. Lasts until end of adventure.' },
      { roll: '4', result: 'Shield of Warning: protection counts even if surprised, fleeing, or vs. shield-ignoring Foes. Permanent; resale 200gp.' },
      { roll: '5', result: 'Arrow of slaying: automatically inflicts 3 damage on a specific Foe (any Major Foe Table). Bow users only; breaks on use. Resale 3d6x15gp.' },
      { roll: '6', result: 'Holy symbol of healing: a cleric adds +2 to Life healed by the Healing prayer. If delivered with the cleric’s body to their temple, the church pays for a resurrection attempt (symbol stays with the church). Resale 700gp.' },
    ],
  },

  /* ---- Traps (Dungeon, p.164) ---- */
  {
    id: 'dungeon-traps',
    name: 'Dungeon Traps Table',
    dice: 'd6',
    environment: 'dungeon',
    entries: [
      { roll: '1', result: 'Dart! A random PC must Defense roll vs. HCL+1 or lose 1 Life (halflings may reroll).' },
      { roll: '2', result: 'Poison gas! All PCs Save vs. HCL+2 poison or lose 1 Life (barbarians and halflings +L).' },
      { roll: '3', result: 'Trapdoor (HCL+3) under the Marching Order leader: Save (-1 light armor, -2 heavy, +1 halfling/elf; rogues +L). Failure: lose 1 Life; needs help to climb out; alone → die.' },
      { roll: '4', result: 'Bear trap on the leader: Save vs. HCL+3 (halflings/elves +1, rogues +L). Failure: lose 1 Life, then Save at -2 vs. other traps/trapdoors and -1 Attack/Defense until recovered.' },
      { roll: '5', result: 'Spears from a wall attack 2 random PCs: Defense roll vs. HCL+4 or lose 1 Life.' },
      { roll: '6', result: 'A giant stone falls on position 4: Defense vs. HCL+4 or lose 2 Life (armor applies, shield does not).' },
    ],
    note: 'A rogue in position 1 or 2 may disarm first: Save vs. the Trap’s L at +L — success warns the party; failure sets it off.',
  },

  /* ---- Traps (Caverns, p.165) ---- */
  {
    id: 'caverns-traps',
    name: 'Caverns Traps Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      { roll: '1', result: 'Stalactite falls: a random PC Saves vs. HCL+2 or loses 1 Life (all Save at +1/2 L; rogues +L; halflings +1/2 and may reroll).' },
      { roll: '2', result: 'Rockslide: all PCs Save vs. HCL+2 or lose 1 Life (+1/2 L; rogues/gnomes/dwarves +L; halflings +1/2, may reroll).' },
      { roll: '3', result: 'Hidden Pit: the first PC Saves vs. HCL+1 or falls (lose 1 Life; +1/2 L, rogues +L, halflings +1/2 may reroll). Spend 1 Clue to find a Secret Passage at the bottom.' },
      { roll: '4', result: 'Swinging Log: all PCs Save in Marching Order vs. HCL (+1/2 L; rogues +L; halflings +1/2L may reroll) until one fails (lose 2 Life) or all succeed.' },
      { roll: '5', result: 'Toxic spores under a random PC: Save vs. HCL+1 poison or be -1 on all Saves for 6 rooms (+1/2 L; rogues/foresters +L; mushroom monks immune; halflings +1/2 may reroll; ignore if a mushroom PC leads).' },
      { roll: '6', result: 'Rolling Boulder (front or back): 1d3 PCs Save vs. HCL+1 or lose 2 Life each (+1/2 L; rogues +L; halflings +1/2 may reroll). Then it blocks one opening on the tile.' },
    ],
  },

  /* ---- Traps (Fungal Grottoes, p.166) ---- */
  {
    id: 'fungal-traps',
    name: 'Fungal Grottoes Traps Table',
    dice: 'd6',
    environment: 'fungal',
    entries: [
      { roll: '1', result: 'Sleep spores: a random PC Saves vs. HCL or releases spores putting to sleep all who fail vs. HCL poison (mushroom/artificial/undead/elemental PCs immune; halflings +L, others +1/2L). If all fall asleep, the party dies.' },
      { roll: '2', result: 'Spore Cloud: a random PC Saves vs. HCL+1 or steps on a puffball; then Save vs. HCL+3 poison or lose 1 Life and trigger a 1-in-6 Wandering Monsters (mushroom/artificial/undead/elemental immune; halflings/barbarians +L, others +1/2L).' },
      { roll: '3', result: 'Slime Patch: the leader Saves vs. HCL or falls (1-in-6 Wandering Monsters; if they come, the fallen PC skips 1 turn).' },
      { roll: '4', result: 'Mycelium Snare: a random PC Saves vs. HCL+3 or an object in hand (shield, weapon, lantern…) is snatched and lost forever.' },
      { roll: '5', result: 'Shrieking Mushroom: the leader has a 4-in-6 chance of disturbing a mushroom that summons Wandering Monsters (−2 if halfling/forester, −1 if rogue).' },
      { roll: '6', result: 'Cordyceps: a random PC Saves vs. HCL+3 poison or is mind-controlled to attack the ally with the fewest Life (that PC defends vs. the controller’s L; +1/2L vs. infection, halflings/barbarians +L). Wears off after 6 turns or with Blessing/Healing. A killed ally rises as an undead Boss (Tier+1 Life, L = the dead PC’s L).' },
    ],
  },

  /* ---- Search (p.107) ---- */
  {
    id: 'search',
    name: 'Search Table',
    dice: 'd6',
    entries: [
      { roll: '0-1', result: 'Wandering Monsters attack!' },
      { roll: '2-4', result: 'Tile is really empty. Nothing to see here.' },
      { roll: '5-6', result: 'You found something. Choose: 1) hidden treasure, 2) a secret door, 3) a secret passage, 4) 1 Clue.' },
    ],
    note: 'A tile may be searched only once (mark "S"). In corridors, roll at -1. A halfling may spend 1 Luck to reroll once.',
  },

  /* ---- Wandering Monsters (p.107) ---- */
  {
    id: 'wandering-monsters',
    name: 'Wandering Monsters Table',
    dice: 'd6',
    entries: [
      { roll: '1-2', result: 'Roll on the Vermin Table appropriate to your environment.' },
      { roll: '3-4', result: 'Roll on the Minions Table appropriate to your environment.' },
      { roll: '5', result: 'Roll on the Weird Monsters Table appropriate to your environment.' },
      { roll: '6', result: 'Roll on the Boss Monsters Table appropriate to your environment.' },
    ],
    note: 'Reroll Foes that are events or never encountered as Wandering Monsters. Wandering Monsters attack first; no shield bonus on the first Defense roll. In a corridor they attack the 2 rearmost PCs.',
  },

  /* ---- Hidden Treasure Complication (p.108) ---- */
  {
    id: 'hidden-treasure-complication',
    name: 'Hidden Treasure Complication Table',
    dice: 'd6',
    entries: [
      { roll: '1-2', result: 'An alarm goes off, attracting Wandering Monsters!' },
      { roll: '3-5', result: 'The loot is protected by a Trap (a rogue may disarm with a Save vs. HCL+1; otherwise a random PC Saves vs. HCL+1, losing 1 Life on failure and 2 on a roll of 1).' },
      { roll: '6', result: 'The treasure is protected by a ghost (a cleric may ban it with a Save vs. HCL; otherwise all PCs lose 1 Life, then the ghost disappears).' },
    ],
    note: 'Hidden treasure holds (2d6+HCL) x (2d6+HCL) gp. Halflings may spend 1 Luck to reroll.',
  },

  /* ---- Door (p.109) ---- */
  {
    id: 'door',
    name: 'Door Table',
    dice: '2d6',
    entries: [
      { roll: '2', result: 'Magically sealed: cannot be bashed; a spellcaster opens it with a spellcasting roll vs. the door’s L (one attempt; on a 1, 2 damage feedback or Wandering Monsters). +1 to Treasure behind it.' },
      { roll: '3', result: 'Iron door: L = HCL+d6. Cannot be bashed; lockpicky or destroyed by Lightning/Fireball. +1 to Treasure behind it.' },
      { roll: '4', result: 'Illusionary door: open by spending 3 Clues or an illusionist’s spellcasting roll vs. HCL (one attempt per illusionist).' },
      { roll: '5-6', result: 'Locked door, HCL+d6.' },
      { roll: '7-10', result: 'Unlocked door. No special rules.' },
      { roll: '11', result: 'Trap: unlocked, but opening triggers an HCL+d6 trap (a rogue may disarm; on failure, Save vs. the trap’s L or take 1 damage).' },
      { roll: '12', result: 'Lever door: cannot be bashed or lockpicked; open by spending 1 Clue or 1 gnome gadget point. Withdrawing through it means Foes cannot strike as you flee.' },
    ],
    note: 'Halflings may spend 1 Luck to reroll. Bashing: Save vs. the door’s L (barbarians/warriors +L); a 1 on any attempt attracts Wandering Monsters. Lockpicking: rogues/assassins/kuklas/gnomes Save vs. the door’s L.',
  },

  /* ---- Water Pool (Caverns, p.112) ---- */
  {
    id: 'water-pool',
    name: 'Water Pool Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      { roll: '1', result: 'Contaminated Water: -1 to all Saves until the end of the adventure or until Healing/Blessing (not cumulative).' },
      { roll: '2-4', result: 'No effect.' },
      { roll: '5-6', result: 'Water refreshes the PC and heals 1 Life (once per adventure per PC).' },
    ],
  },

  /* ---- Cavern Special Feature (p.112) ---- */
  {
    id: 'cavern-special-feature',
    name: 'Cavern Special Feature Table',
    dice: 'd6',
    environment: 'caverns',
    entries: [
      { roll: '1', result: 'Stalactites: an Explosive Attack with a 2-handed weapon has a 3-in-6 chance of causing one to fall (d6: 1-3 on a random PC, 4-6 on a random Foe). PC avoids with Defense vs. HCL (else 1 Life); vs. a Foe, Attack at +HCL for 1 damage.' },
      { roll: '2', result: 'Stalagmites: hinder movement; PCs can’t explode Attack rolls in the tile.' },
      { roll: '3', result: 'Boulders: +1 Defense vs. ranged, -1 ranged Attack, +1 Stealth; surprise chance +1.' },
      { roll: '4', result: 'Echo: -1 Stealth; 2-in-6 Wandering Monsters here; each spell/prayer cast has a 1-in-6 chance to echo (cast again free).' },
      { roll: '5-6', result: 'Water Pools: draw on the tile; roll on the Water Pool Table when a PC dips in.' },
    ],
  },

  /* ---- Random Spell (p.69) ---- */
  {
    id: 'random-spell',
    name: 'Random Spell Table',
    dice: 'd6',
    entries: [
      { roll: '1', result: 'Blessing' },
      { roll: '2', result: 'Escape' },
      { roll: '3', result: 'Lightning' },
      { roll: '4', result: 'Fireball' },
      { roll: '5', result: 'Protection' },
      { roll: '6', result: 'Sleep' },
    ],
    note: 'For a random basic spell (e.g. a scroll found as loot).',
  },

  /* ---- Fiendish Foes Treasure (p.185) ---- */
  {
    id: 'fiendish-treasure',
    name: 'Fiendish Foes Treasure Table',
    dice: 'd6',
    environment: 'fiendish',
    entries: [
      { roll: '0-', result: 'No Treasure found.' },
      { roll: '1', result: '2d6 x2gp.' },
      { roll: '2', result: '2d6 x5gp.' },
      { roll: '3', result: 'Choose: 1 scroll (scroll, bark or prism) with a random spell, or 1 non-magical weapon of your choice. 2-in-6 it is silvered (+20gp resale, or 40gp if two-handed).' },
      { roll: '4', result: '1 gem worth 2d6 x 10gp.' },
      { roll: '5', result: '1 item of jewelry worth 2d6 x 20gp.' },
      { roll: '6+', result: 'Roll on the Fiendish Foes Magic Treasure Table.' },
    ],
  },

  /* ---- Fiendish Foes Magic Treasure (p.186) ---- */
  {
    id: 'fiendish-magic-treasure',
    name: 'Fiendish Foes Magic Treasure Table',
    dice: 'd6',
    environment: 'fiendish',
    entries: [
      { roll: '1', result: 'Magic weapon: d6 → 1-4 +1 Attack, 5-6 +2. Roll d6 for type (slashing light, crushing hand, slashing hand ×2, crushing 2-handed, slashing 2-handed).' },
      { roll: '2', result: 'Magic armor: 1d6 → 1-4 +1 Defense, 5-6 +2 (permanent). Roll d6: 1-2 shield, 3 light armor, 4-5 heavy armor, 6 a ring of protection (any class except…).' },
      { roll: '3', result: '1d3+1 Vials (roll d6 each): 1-3 Healing potion (heal all Life, free action, one per adventure, not barbarians; 100gp); 4-5 Acid (thrown; d6: 1 splashes user for 1 damage, 2+ inflicts 1 on a Foe; no effect on undead/goblins; trolls don’t regenerate vs. acid; 15gp); 6 Holy water.' },
      { roll: '4', result: 'Wand of power (wizards only), 2d3 charges: each adds +1 to any spellcasting roll (decide charges before rolling; may stack). Resale 20gp/charge.' },
      { roll: '5', result: 'Enchanted paint: whatever is painted becomes real (a door, weapons, armor, up to 8 Food rations). Item must be non-magical and ≤15gp; no liquids. Each use: 1-in-6 it runs out. Resale 80gp.' },
      { roll: '6', result: 'Necklace with d6 prayer beads (each one use). A cleric may use 1 bead with a Prayer: d6 → 1-3 no effect (Prayer cast normally), 4-6 the Prayer works but isn’t spent. Bead destroyed each roll. Resale 15gp/bead.' },
    ],
  },
]
