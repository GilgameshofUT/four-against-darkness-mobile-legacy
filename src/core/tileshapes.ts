import type { TileSpec } from './tiles'

/* ============================================================
   The42 tile shapes, transcribed from the book's d66 plates
   (pp.149–151). Cells: ' '=void, '.'=floor, N/E/S/W=door.
   Corridors are1-wide (marked C). Footprints match the roll
   table; exact artistic diagonals are squared to the grid
   (the manual allows this: "exact shape… not very important").
   ============================================================ */

const T = (key: number, corridor: boolean, ...raw: string[]): TileSpec => ({ key, corridor, raw })

export const STARTING_TILES: TileSpec[] = [
  //1: wide hall, three north doors + a south exit
  T(1, false, 'N.N.N.', '...S..'),
  //2: cross — north stub, east door, south exit
  T(2, false, '..N..', '..r..', 'rrrrr', '.rSr.'),
  //3: chalice / U — two north arms joined at the base, south exit
  T(3, false, 'N...N', 'r...r', 'r...r', 'r.S.r', '..S..'),
  //4: four-armed star (X approximated as a plus)
  T(4, false, '..N..', '..r..', 'WrrrE', '..r..', '..S..'),
  //5: funnel — wide north rim narrowing to a stem
  T(5, false, 'N.N.N', 'rrrrr', '.rrr.', '..r..', '..S..'),
  //6: T — west door along the top bar, stem to a south exit
  T(6, false, 'WrrE.', '..r..', '..r..', '..S..'),
]

export const D66_TILES: TileSpec[] = [
  /* ---- row11–16 ---- */
  T(11, true, 'WrrE.', '..r..'),
  T(12, true, 'WrrrE'),
  T(13, true, 'Wrr..', '..r..', '..r..', '..rE.'),
  T(14, true, 'Wr.rE', '..r..', '..r..', 'Wr.rE'),
  T(15, false, 'Wrr..', '..rr.', '...r.', '...rE', '....S'),
  T(16, false, 'Wrr..', '..rr.', '...rr', '...rE', '....S'),

  /* ---- row21–26 ---- */
  T(21, false, 'N...N', 'r...r', 'r.S.r', '..S..'),
  T(22, false, 'Wrrr.', '..rE.', '..r..', '..S..'),
  T(23, false, 'Wrrr.', '...r.', '...rr', '....r', '....E'),
  T(24, false, '..N..', 'WrrrE', '..r..', '..S..'),
  T(25, false, 'Wrrrr', '..rrr', '....r', '....E'),
  T(26, true, 'WrrE.', '..r..'),

  /* ---- row31–36 ---- */
  T(31, false, 'Wrrr.', '...rr', '....r', '...rE', '..S..'),
  T(32, true, 'Wr.rE', '..r..', '..r..', 'Wr.rE'),
  T(33, true, 'WrrrE'),
  T(34, false, 'WrrrE', '..r..'),
  T(35, false, 'Wrrr.', '...rr', '....r', '..rE.'),
  T(36, false, 'Wrr..', '..rr.', '...rE', '..S..'),

  /* ---- row41–46 ---- */
  T(41, false, 'Wrrr.', '...rE', '..r..', '..S..'),
  T(42, true, '..rE.', '..r..', 'Wrr..'),
  T(43, false, 'Wrrr.', '...rE', '..r..', '..S..'),
  T(44, false, 'Wrr..', '..rE.', '..r..', '..S..'),
  T(45, true, '...N.', 'WrrrE', '...S.'),
  T(46, false, 'Wrrr.', '...rE', '..r..', '..S..'),

  /* ---- row51–56 ---- */
  T(51, true, 'N.r.N', 'r.r.r', '.rSr.', '..S..'),
  T(52, false, '..N..', 'WrrrE', '..r..', '..S..'),
  T(53, true, 'WrrrE', '..r..'),
  T(54, false, 'Wrrr.', '...rE', '..r..', '..S..'),
  T(55, true, 'Wrrr.', '...rE'),
  T(56, false, 'Wrr..', '..rr.', '...rE', '..S..'),

  /* ---- row61–66 ---- */
  T(61, false, 'NrrrN', 'r...r', 'W...E', '.rSr.', '..S..'),
  T(62, true, '...N.', 'WrrrE', '...S.'),
  T(63, true, 'WrrrE'),
  T(64, false, 'Wrrr.', '...rE', '..r..', '..S..'),
  T(65, true, 'Wrr..', '..rE.', '...r.'),
  T(66, false, 'Wrrr.', '...rE', '..r..', '..S..'),
]

export const ALL_TILE_SPECS: TileSpec[] = [...STARTING_TILES, ...D66_TILES]
