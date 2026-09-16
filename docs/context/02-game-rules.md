# 02 · Game rules

## Room

Whoever creates the room sets every parameter below, and can change them from the
lobby until the game starts (host only, `not_host` / `game_in_progress`), exactly
as WordRush does.

| Setting | Options | Note |
|---|---|---|
| Language | ES / EN | Chooses the word bank. Independent of the interface language. |
| Draw time | 40 / 60 / 80 / 100 s | Per turn. |
| Rounds | 1 / 2 / 3 / 5 | A round is one full rotation: **everybody draws once**. |
| Capacity | 2 – 10 | More people is better here than in WordRush. |
| Guess channel | **box** / **chat** | See below. This is the setting that makes the room. |
| Hints | on / off | On, letters come out through the turn. How many and when is derived from the word and the room, not configured — see below. |

**The lobby shows the length this adds up to** — `rounds × players × (drawTime +
reveal)` — because 5 rounds of 10 players at 100 s is over an hour and nobody
reads that off four separate dropdowns.

You get in with a room code. There is a waiting room with the player list, a
"Listo" button, and the host can start with at least 2 connected players.

### Guess channel

The one place this family bends its own rule. WordRush decided "no text chat,
only emotes" to keep the noise down; a guessing game needs people to type. So the
decision moves into the room:

- **box** (default) — you type a guess and submit it. Only you see what you
  typed. The room's feed shows `Ana lo adivinó` and, for a near miss, only you
  see `casi`. Emotes stay the social channel.
- **chat** — everything typed is visible to the whole room, Pinturillo style.
  The banter is part of the game; so is having to moderate it.

Everything else in this document is identical in both modes.

## Turn

1. **The drawer** is the next player in the rotation. The seats are fixed when
   the game starts, and the order **shifts one seat every round**: seats A, B, C
   draw A B C, then B C A, then C A B. Everybody still draws exactly once per
   round — what moves around is who opens a round and who gets the last word of
   the game, neither of which should belong to the same player every time. The
   cost is that the gap between a player's own turns stops being constant. A
   player who leaves mid-game is skipped and their seat is not refilled.
2. **Word choice.** The drawer is offered **three words, each from a different
   category**, and has 10 s to pick. No pick, and the first is taken
   automatically. Nobody else sees the options — or the categories.
3. **Drawing.** The drawer has the room's draw time. Everyone else sees the
   strokes appear as they are made, and the word as blanks: `_ _ _ _ _`.
4. **Guessing.** A guesser who gets it is locked in: they see the word, keep
   watching, and cannot guess again. Their score is fixed at that moment.
5. **The turn ends** when everybody has guessed or the clock runs out.
6. **Reveal.** The word is shown, the turn's points are shown, and the next
   drawer starts after a short pause.

## Drawing

Tools, all of them on the drawer's screen only:

- **Brush** in four sizes.
- **A colour palette**, the same swatches for everyone.
- **Eraser.**
- **Fill** (bucket).
- **Undo**, one stroke at a time.
- **Clear**, the whole canvas.

Strokes travel as points, batched every ~50 ms, not as a finished stroke on
mouse-up: waiting for the pen to lift makes a drawing game feel broken. The
server keeps the turn's strokes so a player who reloads or reconnects gets the
canvas as it stands, not a blank sheet.

Only the drawer can draw. The server refuses a stroke from anybody else
(`not_drawer`), and refuses one from the drawer outside the drawing phase.

## Guessing

- Accents **and `ñ`** are ignored: `araña`, `arana` and `ARAÑA` are the same
  guess. This is deliberately looser than WordRush, which keeps `ñ` as a letter
  of its own — there you pick letters off an on-screen keyboard, so the
  distinction is a mechanic. Here you type free text against a clock, and making
  somebody find `ñ` or an accent costs them the turn for no gain. The bank still
  stores the natural spelling, because the reveal shows it.
- **A near miss is told to the guesser.** One letter off from the answer
  (edit distance 1) answers `casi` — in **box** mode only that player sees it, in
  **chat** mode the room sees the guess like any other message.
- **The drawer cannot guess**, and cannot type the word: a guess containing the
  answer is dropped from a chat-mode room rather than broadcast.
- Guessing is rate limited per socket, like every other floodable event.

## Hints

Hints are a switch, not a number. **How many** and **when** are derived from the
turn itself, because one setting cannot serve both `sol` and `refrigerador` —
a letter is most of the first and nothing at all of the second.

- **How many**: a third of the word's letters, rounded down. `sol` and `gato`
  get one, `castillo` two, `refrigerador` four. Spaces are already visible and
  earn nothing. Past a third it stops being a hint and starts being the answer.
- **When**: spread evenly, never at the very end — one hint at half time, two at
  a third and two thirds. A hint with four seconds left is a formality.
- **How the room moves it**: every pending hint comes forward in proportion to
  how many of the guessers already have the word. Half the room home halves the
  remaining wait; everybody but one home makes it almost immediate. Hints are for
  whoever is still stuck, and the more the board fills in around them, the less
  the original timetable was ever about them.

Revealed letters are never the same position twice, and the room sees the same
hint at the same moment. Hints cost the guessers nothing directly — they do not
need to, because a hint only lands once the clock has already eaten the score.

## Near misses

A guess that is not the word can still come back as **close**. The player is told
only that, never how far off they were: the wording is deliberately vague,
because "one letter off" is itself a hint the room never agreed to give.

What earns it, measured against the actual bank:

| Answer | Tolerance | Why |
|---|---|---|
| Under 5 letters | none | `gato`/`pato`, `run`/`nun`/`bun`/`sun`. 328 of the 459 English bank pairs that sit one edit apart involve a short word — calling those close hands over the answer. |
| 5–8 letters | 1 edit | `castilo` for `castillo` is a slip, not a different guess. |
| 9+ letters | 2 edits | Among the 247 ES and 181 EN answers this long, only 10 and 1 pair respectively sit within two edits. |
| Any length | a plural | `gatos` for `gato` is not a guess at a different animal. This is the near miss players actually hit, and the length rule throws it away on exactly the short words where it is most obvious. |

The budget is read off the **answer**, never the guess: otherwise typing a long
word at a short answer would buy tolerance the answer never had.

## Reactions

The twenty stickers, the picker and the burst limit (more than 8 in 3 s pauses
the player for 5 s) come over from WordRush unchanged. They are the family's
social channel and they work the same in both guess modes.

## Leaving, disconnections, room lifetime

Identical to `WordRush/docs/context/02-game-rules.md`:

- One game per browser; the session lives in `localStorage` and re-enters
  automatically while the game is running.
- Leaving is explicit and final; the seat is freed and the host passes on.
- **If the drawer leaves or drops mid-turn, the turn ends at once** and nobody
  scores for it. Waiting for a drawer who is gone freezes everybody.
- A lobby nobody is connected to is deleted after 10 minutes, a finished room
  after 5.

## End of game

The configured rounds are played, every player drawing once per round. The final
table sums every turn. Tie-breaks, in order: more turns guessed, then fewer total
seconds used to guess.

## Playing again

"Jugar de nuevo" reuses the room — same code, same seats, same host — and puts it
back in the lobby so the host can change the rules first. Same rule as WordRush,
host only, finished games only.

## The word bank

Six categories per language, one JSON file each under
`backend/src/modules/words/data/<lang>/<category>.json` — 1 470 Spanish words
and 1 441 English:

| Category | Spanish | English | ES | EN |
|---|---|---|---|---|
| `animals` | Animales | Animals | 246 | 244 |
| `characters` | Personajes | Characters | 236 | 233 |
| `food` | Comida | Food | 204 | 196 |
| `objects` | Objetos | Objects | 325 | 320 |
| `places` | Lugares | Places | 249 | 246 |
| `actions` | Acciones | Actions | 210 | 202 |

Every turn draws **three different categories at random and one unplayed word
from each**, so the drawer chooses between kinds of thing rather than three
arbitrary nouns. A word is never offered twice in one game until the bank runs
dry, at which point it repeats rather than offering fewer than three.

`characters` is anybody who could be a person in the picture: jobs, royalty,
pirates, family, and the **humanoid** half of folklore. A mermaid, a centaur and
an ogre live here; a dragon, a phoenix and a kraken stay under `animals`,
because one is drawn as a person and the other is not.

**There is deliberately no "difficult" category**, the way Pictionary has one.
There the category is a die roll; here the drawer picks, and the drawer is paid
the room's average. A hard word would be pure downside and nobody would ever
take it. These six are content, not difficulty — none is strictly worse than
another.

The same word may not appear in two categories: `JsonWordListRepository` refuses
to boot if it does, because one turn could then offer it twice and "already
played" would hide it from both.

Entries are single words, lowercase, three letters or more; `random-word.picker.spec.ts`
fails the build on any that is not, and on a repeat inside a category.

For scale, measured 2026-09-15: skribbl.io ships 3 692 English and 2 338 Spanish
words, Pinturillo 2 advertises around 5 000. Ours is roughly two thirds of
skribbl's Spanish bank and 40 % of its English one — and every entry here was
picked to be drawable, which is not true of theirs.

**A word is guessed exactly as it is written.** The mask is a promise about
letter count, so accepting a regional synonym of a different length would
contradict it: `durazno` shows seven blanks, and only `durazno` fills them.
Accents and case are still ignored — those do not change the count.
