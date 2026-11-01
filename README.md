# Four Against Darkness — Mobile Companion

A mobile-first, **offline-capable PWA** that puts the complete *Four Against Darkness*
(Expanded) core book on your phone: every class, every random table, the full combat and
dungeon-generation rules, three environments, three scenarios — and a dice roller for all of it.

Built to be installed on a phone (Add to Home Screen) and run with no network.

> **Disclaimer:** Unofficial fan companion for *Four Against Darkness* by Andrea Sfiligoi
> (Ganesha Games). Not affiliated with or endorsed by the publisher. Please support the
> original game.

---

## Status

**Phase 1 of 11 — scaffold + PWA + theme.** The app shell runs with the bottom-tab layout
and the full visual identity; screens are placeholders until later phases fill them in.

See the project plan for the full roadmap.

---

## Quick start

```bash
npm install        # once
npm run dev        # dev server on http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build (http://localhost:4173)
npm run test       # run engine unit tests (vitest)
npm run lint       # oxlint
npm run icons      # regenerate PWA icons from assets-src/*.svg
```

### Serving over LAN (install on your phone)

The dev/preview servers bind to all interfaces, so your phone (same network) can reach the
machine. Start the server and use the **Network** URL it prints:

```bash
npm run dev
#  ➜  Network: http://192.168.x.x:5173/
```

Then on the Pixel:

1. Open that `http://…:5173/` URL in Chrome.
2. Menu (⋮) → **Add to Home screen** → **Install**.
3. Launch from the home screen — it runs full-screen and works offline (the service worker
   caches everything after the first load).

For a stable install, build once and serve `dist/` (`npm run build && npm run preview`) so
the service worker precaches the production assets.

---

## Tech stack

| Layer      | Choice                                   |
|------------|------------------------------------------|
| Build      | Vite 8 + React 19 + TypeScript 7         |
| PWA        | `vite-plugin-pwa` (Workbox) — installable + offline |
| State      | Zustand (persisted to device storage)    |
| Validation | Zod (for book data)                      |
| Tests      | Vitest                                   |
| Lint       | Oxlint                                   |

## Project structure

```
src/
  core/        # pure rules engine (dice, HCL, combat, dungeon, XP) — unit-tested, no UI
  data/        # book content as typed JSON (tables, classes, monsters, spells, scenarios)
  state/       # Zustand stores (ui, party, campaign, dungeon, combat)
  ui/
    components/  # TabBar, ScreenShell, icons, DiceRoller, TileMap, …
    screens/     # Party · Dungeon · Combat · Tables · More
    theme/       # design tokens (earthy Nordic palette)
  styles/       # global + shell CSS
assets-src/    # master SVGs for icons
scripts/       # icon generation
public/        # PWA icons + favicon
```

The rules engine in `src/core/` is deliberately UI-free so it can be unit-tested in isolation
and, if ever desired, ported.

---

## Roadmap

1. ✅ Scaffold + PWA + theme
2. Data extraction → typed JSON (all tables, classes, monsters, spells, equipment)
3. Rules engine (dice, HCL/tier/explosion, combat, reactions, dungeon gen, XP) + tests
4. Party & characters
5. Dungeon exploration (auto-mapping)
6. Combat flow
7. Tables & reference UI
8. Environments + magic
9. Scenarios
10. Campaign + XP + polish
11. Device QA + deploy

---

*Art direction: stylised, textured dark fantasy with a Nordic-folklore influence —
muted mossy greens, ink-black, parchment sepia; granular grain; chiaroscuro lighting.*
