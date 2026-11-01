/* ============================================================
   Icon set — hand-drawn inline SVG, 24px grid, stroke = currentColor.
   Keep icons minimal + consistent so they read at small sizes.
   ============================================================ */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
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
    <path d="M3 21V8l9-5 9 5v13" />
    <path d="M9 21v-6a3 3 0 013-3 3 3 0 013 3v6" />
    <path d="M3 21h18" />
  </Svg>
)

export const IconCombat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 3.5l7 7M19.5 3.5l-7 7" />
    <path d="M12 12l-4 4M12 12l4 4" />
    <path d="M4 20l3-3M20 20l-3-3" />
    <circle cx="12" cy="12" r="1" />
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

/* ---- Game concepts ---- */
export const IconSword = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 4l-9.5 9.5M20 4l-1 4-3-3zM4 20l3-3M20 20l-3-3" />
    <path d="M6.5 14.5l3 3" />
  </Svg>
)

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v6c0 5-3 7-7 9-4-2-7-4-7-9V6z" />
  </Svg>
)

export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0112 8a3.5 3.5 0 017 2.5C19 15.5 12 20 12 20z" />
  </Svg>
)

export const IconSpark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.7 4.8L18.5 9l-4.8 1.7L12 15l-1.7-4.3L5.5 9l4.8-1.2z" />
    <path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </Svg>
)

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </Svg>
)

export const IconTorch = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3c2 2.5 1 4-1 5.5S9 12 9 13a3 3 0 006 0c0-1-1-2-1-3 2 1 3 2.5 3 4.5a5 5 0 01-10 0C7 11 12 9 12 3z" />
    <path d="M12 21v-2" />
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

export const IconDice = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2l8 5v10l-8 5-8-5V7z" />
    <path d="M12 22V12M12 12l8-5M12 12L4 7" />
  </Svg>
)

export const IconCoin = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v8M9.5 10a2.5 2 0 015 0M14.5 14a2.5 2 0 01-5 0" />
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
