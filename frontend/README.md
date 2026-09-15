# SketchRush · frontend

React 19 + Vite + TypeScript + Tailwind v4 client for the real-time draw-and-guess game. Everything
is socket-driven (`socket.io-client`); there is no REST layer.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5174
pnpm build        # tsc -b && vite build → dist/
pnpm start        # serve -s dist (SPA fallback), used by Railway
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm format`.

## Environment

Copy `.env.example` to `.env`:

| Variable          | Meaning                                                           |
| ----------------- | ----------------------------------------------------------------- |
| `VITE_SOCKET_URL` | Socket.IO server URL. Empty → same origin as the page.            |

## Contract

`src/shared/contract/index.ts` is a byte-identical copy of the backend contract. Never edit it;
refresh it from the repo root with `node scripts/sync-contract.mjs`.

## Layout

```
src/
  core/session      socket singleton, stored session (localStorage), rejoin bootstrap
  features/lobby    home (create / join), waiting room
  features/game     the canvas, tools, word picker, turn clock, players, guessing
  features/reactions the sticker picker and the stickers the room throws
  features/results  turn breakdown, standings, final table
  shared            contract, i18n (es/en), UI primitives, layout, theme + toast stores
```

UI language (`sketchrush.lang`), theme (`dle.theme`) and the player's session
(`sketchrush.session`: room code, player id, token, name) persist in `localStorage`; the room's
word language is a separate room setting. The session survives closing the tab, so a player who
comes back while the game is still running is re-joined automatically; when the room is gone or
already finished the session is dropped and the home page explains it.

## Deploy (Railway)

`railway.json` builds with Nixpacks (`pnpm install --frozen-lockfile && pnpm build`) and starts
`pnpm start`. Set `VITE_SOCKET_URL` to the backend's public URL at build time.
