/* ============================================================
   Reactions — roll d6 on a Foe's Reaction Table (book pp.100–102).
   Reaction strings look like "1-3 Flee, 4-6 Fight" or "Always Fight".
   ============================================================ */

export interface ReactionRange {
  min: number
  max: number
  label: string
}

/**
 * Parse a reactions string into ranges.
 * Splits on commas that begin a new range (comma + optional space + digit),
 * so commas inside a label (e.g. "if not, they fight") are preserved.
 * Returns null for fixed reactions ("Always Fight").
 */
export function parseReactions(str: string): ReactionRange[] | null {
  const s = str.trim()
  if (!s) return null
  // Fixed reaction (no leading range)?
  if (!/^\d/.test(s)) return null

  const segments = s.split(/,(?=\s*\d)/)
  const ranges: ReactionRange[] = []
  for (const seg of segments) {
    const m = /^(\d+)\s*(?:[-–—]\s*(\d+))?\s*[\):]?\s*(.+)$/.exec(seg.trim())
    if (!m) continue
    const min = parseInt(m[1] ?? '0', 10)
    const max = m[2] !== undefined ? parseInt(m[2], 10) : min
    ranges.push({ min, max, label: (m[3] ?? '').trim() })
  }
  return ranges.length > 0 ? ranges : null
}

/**
 * Roll a reaction for a given d6 result.
 * Fixed reactions return themselves; ranged tables return the matching label.
 * Out-of-range rolls fall back to the highest matching range.
 */
export function rollReaction(reactions: string, d6: number): string {
  const ranges = parseReactions(reactions)
  if (!ranges) return reactions.trim()
  for (const r of ranges) {
    if (d6 >= r.min && d6 <= r.max) return r.label
  }
  // Out of range: pick the range whose min is closest to the roll.
  const first = ranges[0]
  if (!first) return reactions.trim()
  let best = first
  for (const r of ranges) {
    if (Math.abs(r.min - d6) < Math.abs(best.min - d6)) best = r
  }
  return best.label
}

/** Convenience: true if a reaction label means the Foes attack. */
export function isAggressive(label: string): boolean {
  const l = label.toLowerCase()
  return l.includes('fight') && !l.includes('flee')
}
