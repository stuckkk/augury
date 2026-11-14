# Augury

A multiplayer web version of the trick-taking card game **Wizard**, with its own look: a
night-sky observatory, four celestial suits (Sun, Moon, Star, Comet), Archmages and Fools.
3–6 players, in a browser, on a server you host. Bots can fill empty seats.

- Rules: see [GAME_LOGIC.md](GAME_LOGIC.md) (also in the app under "Rules").
- House rules, set by the host per table: bids can't even out (optionally only from round X),
  hidden bids, blind first round, shorter game.
- English and German, switchable at any time.

## Run it

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm start            # http://localhost:8080
```

On startup the server prints its addresses on your network; friends on the same network
open that address. In the lobby, the invite link already uses it.

### Docker

```sh
docker compose up -d --build     # or: podman compose up -d --build
```

The compose file maps port 8080 and keeps a snapshot of running games in a volume, so a
restart (e.g. an update) does not end games in progress.

### Playing over the internet

Put the server behind a reverse proxy with HTTPS that forwards WebSocket upgrades on `/ws`.
Caddy, for example:

```
augury.example.com {
    reverse_proxy localhost:8080
}
```

(Caddy proxies WebSockets automatically. With nginx add `proxy_http_version 1.1;` and the
`Upgrade`/`Connection` headers.) Set `TRUST_PROXY=1` so rate limits see the real client address.

### Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 8080 | HTTP and WebSocket port |
| `SNAPSHOT_FILE` | – | Save running games here on shutdown, restore them on start |
| `TRUST_PROXY` | 0 | 1: take the client address from `X-Forwarded-For` |
| `BOT_DELAY_MS` | 900 | Pause before each bot move |
| `TRICK_PAUSE_MS` | 1600 | Pause after a completed trick, so everyone sees who took it |
| `MAX_ROOMS` | 200 | Tables open at the same time |
| `ROOM_IDLE_MS` | 7200000 | Remove a table after this long with nobody connected |

A health check answers on `GET /healthz`.

## Develop

```sh
npm run dev:server   # game server on :8080 (restarts on change)
npm run dev          # Vite on :5173 with hot reload, proxies /ws to :8080
npm test             # rules engine, bot simulations, server integration, translations
npm run lint
```

### Layout

| Path | What |
|---|---|
| `src/engine/` | Pure rules engine shared by server and client: `engine.ts` (actions), `trick.ts`, `rules.ts` (house rules), `view.ts` (what each seat may see), `bot.ts` |
| `server/src/` | HTTP + WebSocket server, `roomManager.ts` (tables, seats, reconnects, bots), snapshots |
| `src/network/` | Wire protocol and the client `useSession` hook (auto-reconnect, seat restore) |
| `src/components/` | React UI (CSS modules): the orrery table, hand, bid dial, prophecy orbs, star chart |
| `src/i18n/` | English and German texts |

### How it fits together

The server is authoritative. Clients send actions (`bid`, `play`, …); the server validates
them with the engine and sends every seat its own filtered **view** after each change, so a
browser never receives other players' cards, the deck or the shuffle state. Each seat has a
token stored in the browser; reloading or reconnecting puts you back in your seat. If someone
drops out mid-game, the host can hand their seat to a bot.
