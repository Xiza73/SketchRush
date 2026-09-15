---
paths:
  - 'frontend/src/**/api/**'
  - 'frontend/src/**/stores/**'
---

# Adapters (api/) and stores

- One folder per event: `<verb>-<thing>/` holding `use<Verb><Thing>.ts`, plus a
  `<verb>-<thing>.dto.ts` when the payload needs a mapper. Mappers live in the
  DTO file, never in a separate one, and hooks return domain models.
- **Socket emits with ack** are wrapped in a promise inside the hook, through
  `request()` — which never rejects and returns a `Result`. The component never
  touches `socket` directly. The instance is imported only from
  `@/core/session/lib/socket`, and only from `api/` or `stores/`.
- **Pushed events** (`lobby:update`, `turn:start`, `turn:choices`, `turn:hint`,
  `turn:end`, `draw:stroke`, `draw:fill`, `draw:undo`, `draw:clear`,
  `player:guessed`, `chat:message`, `player:left`, `game:end`, `reaction:show`)
  are store-driven: subscribe once in the store's `bind()` action, guarded by a
  module-level flag so StrictMode's double-invoke cannot double-subscribe.
- The event table and payloads are owned by the backend:
  `backend/src/shared/contract/index.ts`, mirrored byte for byte into
  `frontend/src/shared/contract/index.ts`. Never edit the copy and never invent
  a field — run `pnpm sync-contract` from the repo root.
- **The client never holds the answer.** `TurnState.word` is non-null only in the
  drawer's own copy; everybody else gets `masked`. A guess verdict arrives in the
  guesser's ack alone — the room is told *that* somebody got it and where they
  placed, never what anybody typed.
- **The drawer ignores its own `draw:*` echoes.** Operations are applied locally
  first so the line follows the hand, and the server broadcasts to the whole room
  including the sender; replaying that would double every stroke. Since only the
  drawer can draw, `turn.drawerId === myId` is the whole test.
- Clock: the server sends an **absolute epoch deadline**, never a countdown.
  Stores keep the timestamp; rendering derives the seconds left with `useNow`.
  Never set a local timeout that ends a turn.
