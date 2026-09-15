---
paths:
  - 'backend/src/modules/**/presentation/**'
  - 'backend/src/modules/gateway/**'
---

# Gateways and controllers (presentation layer)

- Handlers are thin: validate the payload with a class-validator DTO → call
  one use case → return the ack object (socket) or `BaseResponse.ok(...)` (HTTP).
  No repository, room store or rule logic here.
- Socket events and payloads are the contract in
  `backend/src/shared/contract/index.ts`. Adding or renaming an event updates
  the contract, re-runs `pnpm sync-contract` from the repo root, and touches the
  frontend DTO in the same change.
- **The word is never in a payload anybody but the drawer receives.** The
  addressed `turn:start` carries `word` only in the drawer's copy; everybody else
  gets `masked`. A guess comes back in the guesser's own ack — the room hears
  `player:guessed` with a position, never the text. In a `chat` room the message
  is relayed only after the use case has checked it does not give the answer away.
- Everything time-related is computed in the `game` use cases and emitted as
  absolute epoch timestamps, never as a countdown. A gateway never runs a timer
  of its own: the one 250 ms interval lives in `TurnTickerService`.
- Every domain exception maps to `{ code, message }` through the shared filter —
  through the ack when the client sent one, otherwise the `error` event. Never
  `try/catch` and swallow inside a handler.
- The validation pipe runs with `whitelist` + `forbidNonWhitelisted`: a new
  field in a payload must be declared in its DTO or the client gets rejected.
  Canvas coordinates are normalised 0..1 and the DTO enforces it; the drawer
  clamps before sending.
- Rate limit floodable events (`room:create`, `draw:stroke`, `game:guess`) per
  socket. Game rules keyed by player — the emote burst pause, for one — belong in
  their use case, not here: a socket is not a player, and rejoining must not
  reset a limit.
