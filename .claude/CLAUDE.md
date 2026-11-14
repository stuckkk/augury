# CLAUDE.md

## Project

Augury: a multiplayer web version of the trick-taking game Wizard (original name and art).
See `README.md` for running it, `GAME_LOGIC.md` for the rules (source of truth) and
`CONTEXT.md` for the vocabulary.

- `src/engine/` is the pure rules engine, shared by server and client. Never import React or
  Node APIs there. `applyAction` never mutates its input; it returns `{ok, state}` or `{ok:false, error}`.
- Hidden information is filtered only in `src/engine/view.ts` (`viewFor`). Anything a client
  receives must come from there. Bots (`bot.ts`) also only get a view, never the full state.
- The server (`server/src/`) keeps rooms in memory; `roomManager.ts` owns the protocol.
- UI strings live in `src/i18n/en.json` and `de.json`; both must have the same keys (tested).

## Working rules

- Be particularly thorough about asking exactly what the user wants before changing game
  logic or how a rule is interpreted. Record rule decisions in `GAME_LOGIC.md` first.
- Keep changes small and match the existing style. Run `npm test`, `npm run lint` and
  `npm run build` before calling something done.
