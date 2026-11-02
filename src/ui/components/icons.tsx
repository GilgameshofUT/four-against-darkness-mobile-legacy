/* ============================================================
   Nordic dark-fantasy SVG icon set — 24px grid, stroke = currentColor.
   Replaces all system emojis with cohesive pen-and-ink glyphs.
   ============================================================ */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: '-0.18em' }}
      {...rest}
    >
      {children}
    </svg>
  )
}

/* ---- Navigation ---- */
export const IconParty = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v6c0 5-3 7-7 9-4-2-7-4-7-9V6z" />
    <path d="M9.5 12l1.8 1.8L15 10" />
  </Svg>
)

export const IconDungeon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 21V9a8 8 0 0116 0v12" />
    <path d="M9 21v-7a3 3 0 016 0v7" />
    <path d="M2 21h20" />
  </Svg>
)

export const IconCombat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 3.5l7 7M19.5 3.5l-7 7" />
    <path d="M12 12l-4 4M12 12l4 4" />
    <path d="M4 20l3-3M20 20l-3-3" />
    <circle cx="12" cy="12" r="1.2" />
  </Svg>
)

export const IconTables = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M15 4v4h4" />
    <path d="M8 12h8M8 16h5" />
  </Svg>
)

export const IconMore = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5L17 7M7 17l-1.5 1.5" />
  </Svg>
)

/* ---- Core Play Sheet & Gameplay Icons ---- */
export const IconSword = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6" />
    <path d="M16 16l4 4" />
    <path d="M19 21l2-2" />
  </Svg>
)

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v6c0 5-3 7-7 9-4-2-7-4-7-9V6z" />
    <path d="M12 3v18" />
  </Svg>
)

export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0112 8a3.5 3.5 0 017 2.5C19 15.5 12 20 12 20z" />
  </Svg>
)

/** Arcane rune / pentacle for spells & magic (matching Book p. 3 Magic icon). */
export const IconArcane = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3l2.6 6.2L21 9.8l-5 4.2 1.6 6.4L12 16.8 6.4 20.4 8 14 3 9.8l6.4-.6z" />
  </Svg>
)

export const IconSpark = IconArcane

/** Sunburst / divine radiance for Cleric & Paladin prayers. */
export const IconPrayer = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" />
  </Svg>
)

/** Hanging iron lantern (Book p. 83). */
export const IconLantern = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3h6M12 3v3" />
    <path d="M7 6h10l-1 12H8L7 6z" />
    <path d="M6 18h12M9 21h6" />
    <path d="M12 10c1.2 1.5.8 3 0 4-.8-1-1.2-2.5 0-4z" />
  </Svg>
)

export const IconTorch = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3c2 2.5 1 4-1 5.5S9 12 9 13a3 3 0 006 0c0-1-1-2-1-3 2 1 3 2.5 3 4.5a5 5 0 01-10 0C7 11 12 9 12 3z" />
    <path d="M12 21v-3" />
  </Svg>
)

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </Svg>
)

export const IconSkull = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 13a6 6 0 1112 0v3l-2 1v2H8v-2l-2-1z" />
    <circle cx="9.5" cy="12" r="1.3" />
    <circle cx="14.5" cy="12" r="1.3" />
    <path d="M12 15v2" />
  </Svg>
)

export const IconCrown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 18h18l-2-11-5 4-2-6-2 6-5-4z" />
    <path d="M3 21h18" />
  </Svg>
)

export const IconDice = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2l8 5v10l-8 5-8-5V7z" />
    <path d="M12 22V12M12 12l8-5M12 12L4 7" />
  </Svg>
)

export const IconCoin = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7v10M9.5 9.5a2.5 2 0 015 0c0 2-5 1.5-5 4a2.5 2 0 005 0" />
  </Svg>
)

export const IconDoor = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 21V6a6 6 0 0112 0v15" />
    <path d="M3 21h18" />
    <circle cx="15" cy="13" r="1" />
  </Svg>
)

export const IconTrap = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.2 2.2M16.8 16.8L19 19M19 5l-2.2 2.2M7.2 16.8L5 19" />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.2-4.2" />
  </Svg>
)

export const IconCamp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 20L12 4l9 16H3z" />
    <path d="M12 12l-4 8h8l-4-8z" />
  </Svg>
)

export const IconPotion = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3h4M10 3v4l-4 6a5 5 0 004 8h4a5 5 0 004-8l-4-6V3" />
    <path d="M7.5 14h9" />
  </Svg>
)

export const IconRation = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4a7 7 0 00-7 7c0 4 3 8 7 8s7-4 7-8a7 7 0 00-7-7z" />
    <path d="M12 4V2M9 11h6" />
  </Svg>
)

export const IconStealth = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12c3-5 15-5 18 0-3 5-15 5-18 0z" />
    <path d="M4 4l16 16" />
  </Svg>
)

export const IconMap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </Svg>
)

export const IconChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)
