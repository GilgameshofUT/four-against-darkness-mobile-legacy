import type { Equipment } from './schema'

/* ============================================================
   Equipment transcribed from the book (pp.81–88).
   attackMod / defenseMod carry the numeric modifiers the engine needs;
   `text` preserves the full rules wording.
   ============================================================ */

export const equipment: Equipment[] = [
  /* ---- Weapons ---- */
  { id: 'bow', name: 'Bow', price: 15, category: 'weapon', hands: 2, damageType: 'slashing', attackMod: 0,
    text: 'Slashing ranged weapon (2 hands). May shoot once BEFORE the melee; a ranger or elf with a bow can shoot twice outdoors if not surprised. Comes with enough arrows for the adventure.' },
  { id: 'hand-weapon', name: 'Hand Weapon', price: 6, category: 'weapon', hands: 1, attackMod: 0,
    text: 'Melee weapon (1 hand), no Attack modifier. Choose slashing (sword, axe, scimitar) or crushing (flail, hammer, mace).' },
  { id: 'light-weapon', name: 'Light Weapon', price: 5, category: 'weapon', hands: 1, attackMod: -1,
    text: 'Melee weapon (1 hand) at -1 to Attack. Choose slashing (dagger, knife) or crushing (stick, club). The -1 is ignored in narrow corridors.' },
  { id: 'sling', name: 'Sling', price: 4, category: 'weapon', hands: 2, damageType: 'crushing', attackMod: -1,
    text: 'Crushing ranged weapon (2 hands) at -1. May shoot once BEFORE the melee; twice in open plains/deserts if not surprised. Enough slingstones for the adventure.' },
  { id: 'crossbow', name: 'Crossbow', price: 15, category: 'weapon', hands: 2, damageType: 'slashing', attackMod: +1,
    text: 'Slashing ranged weapon (2 hands) at +1. May shoot once BEFORE the melee. After each shot, spend 1 turn to reload. Enough bolts for the adventure.' },
  { id: 'two-handed-weapon', name: 'Two-Handed Weapon', price: 15, category: 'weapon', hands: 2, attackMod: +1,
    text: 'Melee weapon (2 hands) at +1. Slashing (2-handed sword, halberd) or crushing (maul, war-hammer). In narrow corridors it attacks at a net -1.' },
  { id: 'handgun', name: 'Handgun', price: 30, category: 'weapon', damageType: 'slashing', attackMod: +2,
    text: 'Ranged slashing weapon at +2. On a roll of 1 it explodes: 1 damage to the user and unusable until a gnome repairs it (1 gadget point). Reload 2 turns. After each firearm combat, increase the next Wandering Monsters roll by 1.' },
  { id: 'black-powder-rifle', name: 'Black Powder Rifle', price: 90, category: 'weapon', damageType: 'slashing', attackMod: +3,
    text: 'Ranged slashing weapon at +3. On a roll of 1 it explodes: 1 damage to the user and unusable until a gnome repairs it (2 gadget points). Reload 2 turns. After each firearm combat, increase the next Wandering Monsters roll by 1.' },
  { id: 'throwing-star', name: 'Throwing Star', price: 2, category: 'weapon', damageType: 'slashing', attackMod: -1,
    text: 'Light ranged slashing weapon at -1. Never inflicts more than 1 damage even if the Attack explodes. Two stars per turn (2 attacks, same or different targets).' },
  { id: 'stake', name: 'Stake', price: 6, category: 'weapon', hands: 1, damageType: 'slashing', attackMod: -1,
    text: 'A non-metallic light weapon (-1). Against vampires it counts as a hand weapon (no modifier). Usable by any PC. Dipped in holy water: all attacks hitting a vampire deal +1 damage (uses a vial).' },
  { id: 'crowbar', name: 'Crowbar', price: 10, category: 'weapon', hands: 1, damageType: 'crushing', attackMod: -1,
    text: 'Crushing light weapon (-1). Gives +1 to all attempts to bash doors.' },

  /* ---- Armor ---- */
  { id: 'shield', name: 'Shield', price: 5, category: 'armor', hands: 1, defenseMod: +1,
    text: 'Requires one hand. +1 to Defense rolls; -1 to Stealth Saves. May break in combat (carry a replacement). Equipping takes 1 turn.' },
  { id: 'light-armor', name: 'Light Armor', price: 10, category: 'armor', defenseMod: +1,
    text: 'Non-metallic. +1 to Defense rolls, no Stealth modifier, -1 to Swimming Saves.' },
  { id: 'heavy-armor', name: 'Heavy Armor', price: 30, category: 'armor', defenseMod: +2,
    text: 'Metallic. +2 to Defense rolls, -1 to Stealth Saves, -2 to Swimming and Climbing Saves.' },

  /* ---- Light sources ---- */
  { id: 'lantern', name: 'Lantern', price: 4, category: 'light',
    text: 'Light source requiring a hand or a lantern hook. Enough oil for the adventure. Without light: -2 on Attack/Defense/Saves, no ranged weapons or Searches.' },
  { id: 'torch', name: 'Torch', price: 1, priceNote: 'per dozen', category: 'light', hands: 1,
    text: 'Light source requiring a hand; usable as a light crushing weapon (-1; on a 1 it is extinguished). Lasts 6 rooms/1 hour. +2 vs. flammable targets like mummies.' },
  { id: 'lantern-hook', name: 'Lantern Hook', price: 2, category: 'item',
    text: 'Hang a lantern on a shield, freeing a hand (1 action to detach). If the shield is destroyed, 3-in-6 the lantern is too; otherwise it drops.' },

  /* ---- Consumables ---- */
  { id: 'holy-water', name: 'Holy Water', price: 30, priceNote: 'per vial', category: 'consumable',
    text: 'Thrown as an action (no Attack roll, no free hand needed); automatic damage to undead and demons. The vial is used up. Max 1 vial per PC per adventure.' },
  { id: 'bandage', name: 'Bandage', price: 5, category: 'consumable',
    text: 'Heals 1 Life. Max 1 per PC per adventure; not in combat; cumulative with other healing.' },
  { id: 'healing-potion', name: 'Healing Potion', price: 100, category: 'consumable',
    text: 'Heals all lost Life to a single PC. Free action, usable during combat. Max 1 per PC per adventure.' },
  { id: 'food-ration', name: 'Food Ration', price: 1, category: 'consumable',
    text: 'One person for one day. Max 10 per PC. A PC loses 1 Life per day without food. Handy for bribes.' },
  { id: 'flask-of-oil', name: 'Flask of Flammable Oil', price: 10, category: 'consumable',
    text: 'Max 1 per PC. Spend 1 turn to throw at a Foe, making it Flammable: torches and fire spells hit at +2; scrolls in its loot burn if it takes fire damage.' },
  { id: 'herbal-tonic', name: 'Herbal Tonic', price: 20, category: 'consumable',
    text: 'Removes paralysis (e.g. from ghouls). 1 turn to administer, usable during combat; works immediately.' },
  { id: 'berserkers-mushroom', name: 'Berserker’s Mushroom', price: 15, category: 'consumable',
    text: 'Swallow as a free action: +1 to melee Attack rolls until the end of the encounter. Lose 1 Life at the end of the encounter.' },
  { id: 'wolfsbane', name: 'Wolfsbane', price: 10, priceNote: 'per bunch', category: 'consumable',
    text: 'Thrown at a werecreature to force it to roll Morale (1 turn, no Attack roll; may retry; thrown bunches are lost).' },
  { id: 'gremlin-repellant', name: 'Gremlin Repellant', price: 5, priceNote: 'per dose', category: 'consumable',
    text: 'Smeared on an item before the adventure; invisible gremlins will not steal it (1 item per dose). Wears off at the end of the adventure.' },

  /* ---- Items ---- */
  { id: 'rope', name: 'Rope', price: 4, category: 'item',
    text: '+1 to Climbing Saves; may be used to bind subdued Foes.' },
  { id: 'scroll-of-blessing', name: 'Scroll of Blessing', price: 100, category: 'item',
    text: 'Reading takes 1 turn; allows the PC to cast 1 Blessing.' },
  { id: 'bag-of-nails', name: 'Bag of Nails', price: 4, category: 'consumable',
    text: 'One use. Allows you to secure a door while Resting.' },
  { id: 'amulet', name: 'Amulet', price: 15, category: 'item',
    text: 'Magic item (1 per PC): grants 1 Luck point like the halfling’s Luck. The point is consumed on use and the amulet is discarded.' },
  { id: 'talisman', name: 'Talisman', price: 10, category: 'item',
    text: 'Magic item (1 per PC): +1 to a single Save (choose before rolling). The bonus is consumed on use and the talisman is discarded.' },
  { id: 'scroll-tube', name: 'Scroll Tube', price: 4, category: 'item',
    text: 'Leather case protecting a scroll from any event that would destroy it. One tube per scroll.' },
  { id: 'good-lockpicks', name: 'Good Lockpicks', price: 25, category: 'item',
    text: '+1 to all Saves to open locked doors.' },

  /* ---- Services ---- */
  { id: 'resurrection-ritual', name: 'Resurrection Ritual', price: 1000, priceNote: 'service', category: 'service',
    text: 'At a local temple between adventures: bring the body and pay 1000gp. Roll d6 — if ≤ the PC’s L the PC returns with full health (all afflictions removed); on failure the PC is lost forever. L6+ PCs are automatic. Some deaths (disintegrated, dissolved, devoured) prevent it.' },
  { id: 'silvering', name: 'Silvering', price: 20, priceNote: '20gp light/hand/quiver, 40gp two-handed', category: 'service',
    text: 'Silver-coat a metallic slashing weapon between adventures: it attacks werecreatures at +1.' },
  { id: 'gilding', name: 'Gilding', price: 50, priceNote: 'service', category: 'service',
    text: 'Gold-coat a metallic weapon: gilded weapons attack elementals at +2.' },
]
