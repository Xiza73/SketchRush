# SketchRush

A real-time draw-and-guess party game for 2–10 players, in Spanish and English.
One person draws, everybody else types what they think it is, and the clock decides
how much it was worth.

The twist is how the drawer is paid: **the room's average**. Everyone who fails to
guess counts as a zero and drags it down, and the drawer picked the word out of
three — so a turn nobody guesses is worth zero, and that is theirs. Drawing clearly
is the only lever they have.

**Play it: [sketchrush.up.railway.app](https://sketchrush.up.railway.app)** — no account,
no downloads. Create a room, share the code.

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

### If the app behaves like code you already changed

Check that the dev server printed `http://localhost:5174`. If it says the port was
taken, an older server is still answering there with the module graph it had when it
started, and the browser is running code that no longer exists on disk. Kill it:

```bash
npx kill-port 5174 5175 3100
```

`strictPort` is on for exactly this reason, so a second `pnpm dev:frontend` now fails
loudly instead of quietly moving to 5175.

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
| `scripts/build-og.mjs` | Draws the social cards. `pnpm build:og <domain>` — Chrome rasterises them, so there is nothing to install, and the domain it stamps has to match the deploy. |

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

## Deploy on Railway

It is live:

| Service | URL |
|---|---|
| frontend | https://sketchrush.up.railway.app |
| backend | https://sketchrush-api.up.railway.app (health check at `/health`) |

One Railway project (`SketchRush`) with **two services**, the same shape as the sibling
game. The frontend domain is stamped on the social cards, so changing it means re-running
`pnpm build:og <domain>` and the three meta tags it prints.

Shipping a change is:

```bash
pnpm deploy
```

`scripts/railway-deploy.mjs` uploads **what is committed**, not what is on disk: it
exports each folder with `git archive` to a temp dir first. That is also the workaround
for the CLI failing with `prefix not found` on a subfolder of a git repo. Commit before
you deploy, or you will ship the last commit and wonder why.

### How it was set up, in case it has to be done again

Needs `railway login` once. Then, from this directory:

```bash
railway init --name SketchRush          # creates the project and links this folder
railway add --service backend
railway add --service frontend
```

Generate a domain for each in the UI (Settings → Networking) and rename the subdomain to
the family's shape: `sketchrush` and `sketchrush-api`. The dialog asks for a port —
**8080**, because that is what these variables pin:

| Service | Variable | Read |
|---|---|---|
| both | `PORT=8080` | at runtime |
| backend | `FRONTEND_URL` = the frontend's URL | at runtime, for CORS |
| frontend | `VITE_SOCKET_URL` = the backend's URL | **at build time** |

`PORT` is pinned rather than left to Railway on purpose: both services fall back to a
port of their own if it is missing (3000 and 4173), and the number in the domain dialog
has to be the one the container actually listens on. Pinning it makes those the same
number by construction instead of by luck.

`VITE_SOCKET_URL` is the one that catches people out. Vite bakes it into the bundle, so
it has to be set **before** the first build and changing it later needs a redeploy, not a
restart. Because both domains exist before either service is deployed, both variables can
be set up front and the whole thing is one round of deploys rather than three.

There is no GitHub connection: `railway up` uploads a tarball, so the source of a deploy
is whatever `git archive HEAD` produces. Connecting the repo instead (same repo on both
services, Root Directory `backend` / `frontend`) would deploy on every push to `main` and
make `scripts/railway-deploy.mjs` unnecessary.

If nothing connects, the browser console says which half is wrong: a CORS error means
`FRONTEND_URL` does not match the frontend origin exactly — `https://`, no trailing
slash. A socket that never opens means `VITE_SOCKET_URL` was wrong when the bundle was
built.

## Two layers

`rooms` — room, lobby, seats, host, ready, start, restart, sessions, rejoin — is the
**family layer**, shared in spirit with its sibling game and deliberately free of any
mention of drawing. `game` — turns, the canvas, guessing, the scoring formula, the word
bank — is the **game layer**, and is the reason this one exists.

Nothing has been extracted into a shared package. Two games is not yet a pattern.
