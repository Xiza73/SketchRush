# SketchRush backend

Real-time server for the draw-and-guess game: NestJS 11 + Socket.IO, rooms in memory,
no database. The game rules and the scoring formula live in `../docs/context/`; the
socket contract is `src/shared/contract/index.ts` (owned here, mirrored byte for byte
by the frontend — `pnpm check-contract` from the repo root guards it).

## Run

```bash
pnpm install
pnpm start:dev                      # dev server with watch, http://localhost:3100
pnpm build && node dist/main.js     # production build
```

Checks:

```bash
pnpm typecheck                      # sources + tests
pnpm test                           # 146 unit tests
pnpm lint:check                     # eslint without --fix (includes layer boundaries)
```

`GET /health` returns `{ "status": "ok", "rooms": <count> }`.

## Environment

| Variable       | Default | Meaning                                                               |
| -------------- | ------- | --------------------------------------------------------------------- |
| `PORT`         | `3000`  | HTTP + Socket.IO port. Railway injects its own; `.env` uses `3100`.   |
| `FRONTEND_URL` | unset   | Comma-separated CORS allowlist. Unset allows every origin (dev only). |
| `NODE_ENV`     | unset   | Informational.                                                        |
| `MAX_ROOMS`    | `500`   | Rooms held at once. Past it `room:create` answers `server_full`.      |

See `.env.example`.

`MAX_ROOMS` exists because rooms live in this process: without a ceiling a burst
of creations ends in an out-of-memory restart, and a restart drops every game in
progress. The default is a starting point, not a measurement — `/health` reports
the live room count, so raise or lower it once this deployment has been watched.

## Deploy (Railway)

`railway.json` builds with Nixpacks and starts `node dist/main.js` with `/health` as the
healthcheck. Set `FRONTEND_URL` to the deployed frontend origin. The server listens on
`0.0.0.0:$PORT` and accepts both `websocket` and `polling` transports on the default
Socket.IO path. One process only: rooms are in memory.

## Layout

```
src/
  main.ts, app.module.ts
  shared/            contract, DomainException, Clock, RoomEventsBus, CORS adapter
  modules/
    words/           six categories per language (data/<lang>/*.json), normalisation, picker
    rooms/           Room / Player aggregates, lobby use cases, janitor
    game/            Turn / Game aggregates, the canvas buffer, guessing, scoring, ticker
    reactions/       emote broadcast with the burst pause
    gateway/         the Socket.IO gateway (presentation only), validation, error mapping
    health/          GET /health
```

`rooms` is the family layer — room, lobby, seats, host, sessions — and knows nothing
about drawing. `game` depends on `rooms`, never the other way round, so the half that
is not SketchRush stays liftable into the next game.

Use cases publish server -> client events on the `RoomEventsBus`; the gateway is its only
subscriber and turns them into Socket.IO emits. Timers live in `game` (250 ms turn ticker,
between-turns scheduler) and `rooms` (janitor), never in the gateway.

## The turn ticker

One `setInterval` drives every room in the process (`game/application/services/turn-ticker.service.ts`),
and the `try/catch` sits **inside** the per-room loop, not around it. `Map` iteration is
insertion order: a guard outside the loop lets one room that throws deterministically
starve every room created after it, silently, four times a second. Pinned by
`tick-turns.use-case.spec.ts`.

## Room lifecycle

`src/modules/rooms/domain/room-lifecycle.ts` holds every delay of
`docs/context/02-game-rules.md` -> "Disconnections and room lifetime": a lobby player
disconnected for 60 s loses their slot, a room nobody is connected to is deleted 10 minutes
after the last disconnection, and a finished room 5 minutes after its `game:end`. A room that
falls below `ROOM_LIMITS.minPlayers` ends its game: nobody is ever dealt a turn to draw for
an empty room.

## Contract note

Events that return no data (`room:leave`, `room:ready`, `room:start`, `turn:choose`,
`draw:*`, `reaction:send`) ack with the contract's `EmptyAck` (`{ ok: true }` or an error
payload). `room:create` / `room:join` / `room:rejoin` ack with a session, and `game:guess`
acks with the guesser's own verdict — the room is told *that* somebody got it and where
they placed, never what anybody typed.
