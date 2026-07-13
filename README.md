# Workout Tracker

A personal, offline first workout tracker built as a mobile usable PWA. Log sets in the gym with minimal taps, follow a fixed split (e.g. Push/Pull/Legs), and get deterministic, rule based suggestions for progressive overload and exercise substitution.

Single user by design — no accounts, no cloud, no social features. All data lives on your device.

## Features

- **Onboarding** — first launch collects your name, age, sex, fitness goal, and experience level. Editable later under Settings.
- **Split editor** — define ordered, named days (Push, Pull, Legs, …) with exercises and target set × rep schemes.
- **Session pre-load** — starting a workout suggests the next day in your split and pre-fills each exercise with your last session's numbers.
- **Fast set logging** — log a repeat set in a few taps; edit or delete any set in the current session.
- **Progressive overload suggestions** — hit the top of your rep range on all sets and the app suggests a weight increase (2.5 kg upper / 5 kg lower by default, per exercise editable); miss it and the app shows the rep gap to close. Fully deterministic and unit tested.
- **Exercise substitution** — one tap lists catalog exercises sharing a primary muscle group, grouped by equipment, fully offline. Swaps affect the current session only unless you explicitly replace in the template.
- **Form demos** — every catalog exercise bundles a looping demonstration GIF and written form cues, viewable offline in under a second.
- **Backup** — export your full history as JSON from Settings and re-import it losslessly. Browser storage can be evicted by the OS, so export regularly.

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite (PWA via `vite-plugin-pwa`) |
| Routing | React Router (hash routing) |
| Storage | IndexedDB via Dexie (+ `dexie-react-hooks` for live queries) |
| Testing | Vitest |
| Linting | Oxlint |

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run lint       # oxlint
npx vitest run     # unit tests
```

## Project structure

```
public/exercises/           # bundled demo GIFs (+ ATTRIBUTIONS.json)
scripts/
  fetch-exercise-media.mjs  # one-time build script that fetches exercise media
src/
  pages/                    # Onboarding, Today, ActiveWorkout, SplitEditor, Settings
  data/                     # exercise catalog + first-run seed
  db/                       # Dexie schema and queries
  logic/                    # progression, substitution, media, profile helpers
  types/                    # shared TypeScript types
```

## Data and privacy

- Workout history is stored in IndexedDB on the device; the user profile from onboarding is stored in `localStorage`.
- Nothing is sent to any server. A lost device means lost history — the JSON export in Settings is the backup mechanism.
- Bundled exercise media is sourced from permissively licensed datasets; per asset attribution is recorded in `public/exercises/ATTRIBUTIONS.json`.

## Background

This is a learning project: the goal is shipping a usable MVP quickly and learning the stack (PWA, offline storage, deterministic suggestion logic), not feature completeness. Rest timers, cloud sync, and wearable integration are deliberately out of scope.
