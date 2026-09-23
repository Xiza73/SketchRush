# 03 · Scoring

Two numbers configure the whole thing. They live in one place, the `SCORING`
constant of the socket contract, and nowhere else.

```ts
SCORING = {
  positionBonus: [20, 15, 10],  // 1st / 2nd / 3rd to guess — same as WordRush
  allGuessedBonus: 15,          // to the drawer, when nobody was left behind
};
```

## Every variable that reaches a score

Nothing below is configurable except the first row. Everything else is derived,
and this is the whole list — if a number is not here, it does not move anybody's
points.

| Variable | Where it comes from | Range | What it feeds |
|---|---|---|---|
| `drawSeconds` | Room setting, the host picks it | 40 / 60 / 80 / 100 | The denominator of `timePercent` |
| `startedAt` | Server clock, the moment **drawing** begins — not the moment the turn opens | epoch ms | `deadlineAt`, `secondsUsed` |
| `deadlineAt` | `startedAt + drawSeconds × 1000` | epoch ms | `secondsLeft` |
| `secondsLeft` | `max(0, (deadlineAt − now) / 1000)` | 0 … `drawSeconds` | `timePercent` |
| `timePercent` | `max(0, round(secondsLeft ÷ drawSeconds × 100))` | 0 – 100 | A guesser's points, and every term of the drawer's average |
| `position` | `guesses.length + 1` when the guess lands | 1 … `couldGuess` | `positionBonus` |
| `positionBonus` | `SCORING.positionBonus[position − 1] ?? 0` | 20 / 15 / 10 / 0 | A guesser's points |
| `couldGuess` | `players − 1`, read from the seats **at the moment the turn ends** | ≥ 0 | The drawer's divisor |
| `everybodyGuessed` | `couldGuess > 0 && guesses == couldGuess` | true / false | `allGuessedBonus` |
| `allGuessedBonus` | `SCORING.allGuessedBonus` when the above holds | 15 / 0 | The drawer's points |
| `secondsUsed` | `max(0, round((now − startedAt) ÷ 1000))` | 0 … `drawSeconds` | **A standings tie-break only.** Never points. |

Two of those repay a second look.

**`startedAt` is when drawing begins**, so the ten seconds the drawer spends
choosing are not charged to anybody. The clock a guesser races is the one they
can actually see.

**`couldGuess` is read at the end of the turn**, from whoever is still seated. A
player who leaves mid-turn stops being a zero in the drawer's average — they are
not in `room.players` any more, so the divisor shrinks with them. This is
deliberate: the drawer should not be punished for somebody closing a tab.

### What does *not* feed a score

Written down because each one is a thing people reasonably expect to count:

- **Hints.** Revealed letters cost the guessers nothing. They do not need to —
  a hint only lands once the clock has already eaten the score.
- **A near miss, and a regional variant.** `close` and `synonym` pay zero, the
  same as `wrong`. They are told to the player, never charged to them, and they
  do not spend the attempt. See `02-game-rules.md`.
- **The word.** Its length, its category and how hard it was are worth nothing
  by themselves. They only ever show up through how fast people guessed it.
- **The round number.** A turn in round 5 pays exactly what the same turn pays
  in round 1.
- **How much was drawn.** Strokes, shapes, colours, undos: none of it is
  measured. Only whether it was understood.

## Guessing

```
timePercent   = round(secondsLeft when you guessed / drawTime × 100)
positionBonus = positionBonus[place − 1], or 0 from fourth on
points        = timePercent + positionBonus
```

**There is no floor.** Guessing at the last second is worth almost nothing, and
that is the point: it is the same rule WordRush runs on, so a player who knows
one game already knows how this one scores. The only clamp anywhere is a
`max(0, …)` on the clock, which stops a guess that lands a few milliseconds past
the deadline from paying a negative number. It is a guard, not a floor.

Not guessing is zero. There is no consolation here — in WordRush a green letter
is real progress you can show, and in a drawing game there is no equivalent.

### Both halves matter, and the clock matters more

It is **not** a placing ladder. The clock is the larger term and it moves
continuously; the place bonus is a small, discrete top-up for the first three.

| | Range | Moves |
|---|---|---|
| `timePercent` | 0 – 100 | Every second, for everybody |
| `positionBonus` | 20 / 15 / 10 / 0 | Once, and only for the first three |

The gap between first and second place is **5 points**, which is five percent of
one turn's clock — about three seconds of a 60 s turn. So somebody who works it
out a few seconds earlier beats somebody who merely pressed enter first, and from
fourth place on the clock is the only thing left. Order alone never decides it.

A fourth-place guess with 90 % of the clock left (90) beats a first-place guess
with 50 % left (70). That is the intended shape.

### Seeing it while it is still in play

The game screen carries a live preview of what the turn pays if it ended now:
the clock and the place bonus for a guesser, the room's average so far for the
drawer. It is `frontend/src/features/game/models/score-preview.model.ts`, it
mirrors the formulas above, and its tests are what keep the two in step. The
server still scores the turn; the card only shows the working.

## Drawing

```
points = round( Σ timePercent of everybody who guessed / (players − 1) )
       + allGuessedBonus, if every other player guessed
```

The divisor is **everyone who could have guessed**, not everyone who did. A
player who never gets it counts as a zero and drags the drawer's average down.

That is the whole design: the drawer is paid the room's average, so the only way
to score while drawing is to be understood, quickly, by as many people as
possible. A clever word nobody can draw is not a clever word.

### Why there is no floor for the drawer

Because the drawer **picked** the word, out of three. A turn where nobody guesses
is worth zero and that is fair — the choice was theirs. This is the one place
where a mechanic exists to justify a scoring rule: take word choice away and the
zero becomes a punishment for bad luck, and a floor would have to come back.

## A turn, end to end

Room of five, draw time 60 s. Dani never gets it.

| Player | Guessed at | timePercent | Place | Bonus | Points |
|---|---|---|---|---|---|
| Ana | 48 s left | 80 | 1st | +20 | **100** |
| Bruno | 36 s left | 60 | 2nd | +15 | **75** |
| Carla | 12 s left | 20 | 3rd | +10 | **30** |
| Dani | — | 0 | — | 0 | **0** |
| **Elena** (drawing) | | | | | **40** |

Elena's 40 is `(80 + 60 + 20) / 4 = 40`, with no `allGuessedBonus` because Dani
never got there.

Two extremes, to show the shape:

| Turn | Drawer earns |
|---|---|
| Nobody guesses | `0 / 4 = 0` |
| Everybody guesses immediately (100 each) | `400 / 4 = 100`, `+15` → **115** |

So a perfect turn leaves the drawer **level with the second-fastest guesser**
(115 each) and just under the fastest (120). Drawing well is worth about as much
as guessing first, which is where it should sit: it is the harder job, and it
only comes round once per rotation.

That tie is not a rounding accident, it is the ceiling the two constants set
together, and `scoring.spec.ts` pins it. If a rebalance moves either number,
that test is what says so.

## End of game

Every turn is summed. The table sorts on four keys, in order:

| # | Key | Direction | Why |
|---|---|---|---|
| 1 | `total` | Highest first | The score. |
| 2 | `guessedTurns` | Most first | Two players on the same total: the one who got there more often did more. |
| 3 | `secondsUsed` | Fewest first | Same total and same count: the faster one. |
| 4 | `name` | Alphabetical | Not a tie-break — a **stable order**, so a genuine tie renders the same way every time instead of shuffling on each render. |

Only the first three decide a **rank**. Ranks are competition style — two players
level on all three share a rank and the next one skips (1, 1, 3) — so the name
key orders the rows without ever claiming one player beat another.

The first three are accumulated per turn as the game runs; nothing is
recomputed at the end.

## The turns that pay nothing

| Situation | What happens |
|---|---|
| A guesser never gets it | 0 for them, and a zero in the drawer's average |
| Nobody gets it | 0 for everybody, the drawer included |
| The drawer leaves **before picking a word** | The turn is dropped, not scored. There is no word to reveal and no canvas to judge. |
| The drawer leaves **mid-drawing** | The turn ends at once. Whoever had already guessed keeps what they earned. |
| One player left in the room (`couldGuess == 0`) | The drawer scores 0. There is no average of nobody, and the code returns 0 rather than dividing by zero. |

## Where each piece lives

| Piece | File |
|---|---|
| The two constants | `backend/src/shared/contract/index.ts` → `SCORING` |
| `timePercent`, `position`, `secondsUsed` | `backend/.../domain/entities/turn.entity.ts` |
| The turn table and the standings | `backend/.../domain/services/scoring.ts` |
| Who is seated when the turn is scored | `backend/.../application/services/turn-lifecycle.service.ts` |
| The live preview on the game screen | `frontend/src/features/game/models/score-preview.model.ts` |

The server is the only thing that scores. The preview mirrors these formulas so
a player can see the working while the turn is still running, and its tests are
what keep the two in step — but nothing the client computes is ever sent back.

## Changing any of this

First here, with the date and the reason in `04-decisions-and-pending.md`, and
only then in the code. The numbers live in `SCORING`; the tests assert against
that constant and not against literals, so a rebalance flows through and only a
real divergence fails.
