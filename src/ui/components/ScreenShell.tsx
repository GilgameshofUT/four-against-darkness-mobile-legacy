import type { ReactNode } from 'react'

interface ScreenShellProps {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Standard screen frame: a fixed chiaroscuro header over a scrollable body.
 * Every tab renders through this so headers, gutters and scroll stay uniform.
 */
export function ScreenShell({ eyebrow, title, subtitle, actions, children }: ScreenShellProps) {
  return (
    <div className="screen">
      <header className="screen__header">
        <div className="screen__heading">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="display screen__title">{title}</h1>
          {subtitle && <p className="screen__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="screen__actions">{actions}</div>}
      </header>
      <div className="divider" />
      <main className="screen__body">{children}</main>
    </div>
  )
}
