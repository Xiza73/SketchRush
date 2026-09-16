# 03 · Scoring

Two numbers configure the whole thing. They live in one place, the `SCORING`
constant of the socket contract, and nowhere else.

```ts
SCORING = {
  positionBonus: [20, 15, 10],  // 1st / 2nd / 3rd to guess — same as WordRush
  allGuessedBonus: 15,          // to the drawer, when nobody was left behind
};
```

## Guessing

```
timePercent   = round(secondsLeft when you guessed / drawTime × 100)
positionBonus = positionBonus[place − 1], or 0 from fourth on
points        = timePercent + positionBonus
```

Nothing is clamped and nothing is floored. Guessing at the last second is worth
almost nothing, and that is the point: it is the same rule WordRush runs on, so a
player who knows one game already knows how this one scores.

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

Every turn is summed. Tie-breaks, in order:

1. More turns guessed.
2. Fewer total seconds spent guessing.

Both are already tracked per turn; neither needs anything new.

## Changing any of this

First here, with the date and the reason in `04-decisions-and-pending.md`, and
only then in the code. The numbers live in `SCORING`; the tests assert against
that constant and not against literals, so a rebalance flows through and only a
real divergence fails.
