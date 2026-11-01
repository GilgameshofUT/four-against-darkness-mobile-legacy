import { ScreenShell } from '../components/ScreenShell'

export function MoreScreen() {
  return (
    <ScreenShell eyebrow="Codex" title="More" subtitle="Rules, campaigns and settings.">
      <div className="scaffold-note">
        <b>Phase 10</b> adds XP systems, level-ups, secrets, milestones, save / load and JSON export.
      </div>

      <div className="scaffold-grid">
        <div className="scaffold-tile">
          <div className="scaffold-tile__label">Offline</div>
          <div className="scaffold-tile__value">
            Ready <small>— PWA</small>
          </div>
        </div>
        <div className="scaffold-tile">
          <div className="scaffold-tile__label">Version</div>
          <div className="scaffold-tile__value">0.1</div>
        </div>
      </div>

      <div className="divider" />
      <p className="screen__subtitle">
        Four Against Darkness by Andrea Sfiligoi · Ganesha Games. Unofficial fan companion; not
        affiliated with or endorsed by the publisher.
      </p>
    </ScreenShell>
  )
}
