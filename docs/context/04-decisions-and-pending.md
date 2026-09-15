# 04 · Decisions and pending items

## Decisions taken (2026-09-14)

| Decision | Reason |
|---|---|
| Built by **copying WordRush**, not by extracting a shared engine | The family rule. One game is not a pattern; an abstraction drawn from a single case is a guess with generics in it. What actually repeats will be obvious once this game is finished, and *then* it gets extracted. |
| The guess channel is a **room setting** (`box` / `chat`), not a family decision | WordRush decided "no text chat, only emotes" for good reasons, and a guessing game cannot honour that. Rather than quietly break a family rule or force one answer on every group, the decision moves to whoever creates the room. `box` is the default, so the quiet option is the one you get without thinking. |
| Points are the **percentage of the turn still on the clock**, and the position bonus is the same `20 / 15 / 10` | It is the one idea that makes these two games feel like one product. Reusing the exact constants is also one fewer number to balance. |
| The drawer is paid the **room's average**, counting non-guessers as zero | The only lever a drawer has is being understood. Paying them per guesser would reward a fast first guess and ignore the four people left behind; paying them the average makes "did the room get it" the whole score. |
| **No floor for the drawer**, because they chose the word out of three | The mechanic is what makes the rule fair. Take word choice away and a zero becomes bad luck rather than a bad call, and a floor would have to come back. Noted so nobody removes the choice without noticing what it was holding up. |
| **No consolation points** for a guesser who does not get it | WordRush pays for greens because a green is real, visible progress. There is no equivalent here: you either named it or you did not. |
| Strokes stream as **points batched every ~50 ms**, not as finished strokes on mouse-up | A drawing that appears one stroke at a time reads as lag. Batching keeps the traffic sane without losing the feeling that somebody is drawing right now. |
| The server keeps the **turn's stroke buffer** | Otherwise a reload or a dropped connection lands on a blank canvas, and automatic re-entry is a family rule. The buffer dies with the turn. |
| **If the drawer leaves or drops, the turn ends immediately** with nobody scoring | Same reasoning as WordRush closing a leaver's round at once: a turn nobody can finish must not hold the room. |
| Capacity up to **10**, and the lobby shows the resulting session length | A drawing game gets better with a crowd where a word game does not. But length is `rounds × players × drawTime`, which is an hour at the top end, and nobody works that out from four separate dropdowns. |
| Accent is **`#0e7490`**, teal pushed toward cyan, not a pure teal | The accent is this family's only identity knob, and it must not compete with the semantic green. Pure teal sits about 30° of hue from `--green` (`#3fa66b`); in a game where "you got it" is green, a button of nearly the same hue reads muddy. `#0e7490` is about 48° away and measures about 5.4:1 against white, over the 4.5:1 the design system requires. The dark-mode pair still has to be picked and measured. |
| Working name **SketchRush**, marked as a placeholder | The `Rush` suffix marks the family. Neither this name nor the family's is settled. |

## Deliberately deferred

| Idea | Why not now |
|---|---|
| Extracting a shared engine package | See the first row above. Revisit when this game is playable, with two real cases in hand. |
| A shared backend hosting both games | Same answer, same reason. The room half of WordRush's server is already game-agnostic, but "already looks reusable" is not evidence. |
| Custom word packs typed in by the host | In scope for the full game, but it needs a decision about where a pack lives (per room, in memory, lost on restart?) that nothing else depends on yet. |

## Pending decisions

- **Name of the game**, and of the family.
- **Word banks.** WordRush's answer lists are five-letter words; this game needs
  drawable nouns of any length, in two languages, graded by difficulty. They are
  a different corpus and need their own build script.
- **How near a near miss is.** Edit distance 1 is the first guess. It is wrong
  for very short words (`gato` / `pato` are different answers, not a near miss)
  and possibly too strict for long ones.
- **Whether word choice should be a room setting** rather than always on. It is
  load-bearing for the scoring, so it cannot simply be switched off — if it
  becomes a setting, the drawer's floor has to come back with it.
- **What a spectator sees.** Somebody who joins mid-turn currently gets the
  canvas and can guess. Whether they should be able to score on a turn they
  joined halfway through is not decided.
