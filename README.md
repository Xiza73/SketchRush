# SketchRush

A real-time draw-and-guess party game for 2–10 players, in Spanish and English.
One person draws, everybody else types what they think it is, and the clock decides
how much it was worth.

The twist is how the drawer is paid: **the room's average**. Everyone who fails to
guess counts as a zero and drags it down, and the drawer picked the word out of
three — so a turn nobody guesses is worth zero, and that is theirs. Drawing clearly
is the only lever they have.

> Not deployed yet. Run it locally with the two commands below.

## Run it

Two independent services. Node 22+ and pnpm.

```bash
pnpm --dir backend install && pnpm --dir frontend install
```

Then, in one terminal:

```bash
pnpm dev:backend
```

and in another:

```bash
pnpm dev:frontend
```

The backend takes ~20 s to compile the first time. When it prints
`SketchRush server listening on 0.0.0.0:3100`, open **http://localhost:5174**.

### Playing locally with yourself

The session lives in `localStorage` under `sketchrush.session`, which is shared
between tabs of the same browser profile — so **two tabs will not work**, the second
takes the seat and the first says so. Use two different browsers, or one normal
window and one private window.

Create a room in the first, join with the 4-character code in the second, and press
*Start game*. Two players is the minimum.

### From a phone on the same network

```bash
pnpm --dir frontend dev --host
```

and point `frontend/.env.local` at your machine instead of localhost:
`VITE_SOCKET_URL=http://192.168.x.x:3100`.

## How it works

| | |
|---|---|
| `backend/` | NestJS 11 + Socket.IO. Rooms in memory, no database. Clean architecture with the layer boundaries enforced by eslint. |
| `frontend/` | React 19 + Vite + Tailwind v4 + Zustand. Entirely socket-driven; there is no REST layer. |
| `docs/context/` | The rules and the scoring, written down before they were coded. |
| `scripts/sync-contract.mjs` | Copies the socket contract from the backend to the frontend and checks it has not drifted. |

**The server owns time, state and score.** The client never holds the answer, and the
clock is an absolute deadline sent as an epoch timestamp — never a countdown, so two
numbers can never drift apart. It is a competitive game; a client that knows the word
is a client that cheats.

**The socket contract is the only shared artefact.** `backend/src/shared/contract/index.ts`
is the owner; the frontend keeps a byte-identical copy. `pnpm check-contract` fails the
build if they diverge.

## Checks

```bash
pnpm test:backend
```

```bash
pnpm --dir frontend test
```

```bash
pnpm check-contract
```

Each service also has `typecheck` and `lint` (`pnpm --dir backend lint:check`,
`pnpm --dir frontend lint`). The backend's lint includes the architecture boundaries:
`game` may depend on `rooms`, never the reverse.

All of it runs in CI on every push to `main` and every pull request —
`.github/workflows/ci.yml`, three jobs: the contract guard, the backend and the
frontend. The frontend job ends with `pnpm build` because that is what a deploy
runs, and a build that breaks here would have broken the deploy.

## Two layers

`rooms` — room, lobby, seats, host, ready, start, restart, sessions, rejoin — is the
**family layer**, shared in spirit with its sibling game and deliberately free of any
mention of drawing. `game` — turns, the canvas, guessing, the scoring formula, the word
bank — is the **game layer**, and is the reason this one exists.

Nothing has been extracted into a shared package. Two games is not yet a pattern.
