# AGENTS — 03-asteroids

## What this repo is

A classic Arcade Asteroids clone in **pure HTML5 Canvas**, JavaScript (ES6+), no frameworks, no bundler, no dependencies. Single entry point: `index.html` opened in browser (or served via `npx serve .`).

## Repo-specific commands

| Command | What it does |
|---------|-------------|
| `npx serve .` | Starts a local dev server at `http://localhost:3000` |
| `open index.html` | Opens the game directly in the default browser |
| `git status` | Check current work-tree state |
| `git diff` | View uncommitted changes |

## Architecture quirks

- **Toroidal wrap-around**: asteroids and bullets wrap from left→right, top→bottom (modular arithmetic in `wrap()`).
- **Invincibility timer**: ship flashes and is invincible for 3s after respawn (`invincible` counter in `game.js:133`).
- **Particle explosion**: on asteroid split, `count = size * 5` particles are emitted (`game.js:331`).
- **No external storage**: score/lives are in-memory only; refresh the page to reset.

## Setup / gotchas

- The README is in Spanish; all code comments and AGENTS.md are in English.
- `game.js` uses `'use strict'` at top — respect this when adding code.
- `justPressed` / `keys` input tracking: check `pressed(code)` once per frame; it auto-resets. Do not mix with `keys(code)` which is a toggle.
- Canvas is 800×600 (`W` / `H` constants, `game.js:5-6`).
- New asteroids are spawned at least `SAFE_DIST = 130` px from the ship center (`game.js:245-251`).

## Existing instruction constraints

- The `.atl/skill-registry.md` indexes available skills; do not modify `.atl/` files.
- No build / test / lint pipeline exists — this is a static file repo.
- `mem_save` should be called after any bug fix or architecture decision (Engram protocol).

## Next steps for agents

1. Read `game.js` to understand the game loop, classes, and collision logic.
2. If adding features, preserve the no-dependency, no-bundler constraint.
3. Run `npx serve .` and open `http://localhost:3000` to verify changes.
4. After any fix/decision, call `mem_save` with project `opencode-asteroids`.