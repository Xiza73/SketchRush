# Emote stickers

The twenty reaction stickers of the game live here. They are discovered at build
time by file name, so dropping a new file in replaces the artwork with no code change.

## File names

One file per emote, named exactly like the emote id in the contract. The order below
is the order of the picker (a 5 × 4 grid read row by row).

| # | Emote id | File name (pick one format) |
|---|---|---|
| 1 | `love` | `love.webp` · `love.svg` · `love.png` |
| 2 | `wink` | `wink.webp` · `wink.svg` · `wink.png` |
| 3 | `tease` | `tease.webp` · `tease.svg` · `tease.png` |
| 4 | `mindblown` | `mindblown.webp` · `mindblown.svg` · `mindblown.png` |
| 5 | `shock` | `shock.webp` · `shock.svg` · `shock.png` |
| 6 | `explode` | `explode.webp` · `explode.svg` · `explode.png` |
| 7 | `oops` | `oops.webp` · `oops.svg` · `oops.png` |
| 8 | `whoa` | `whoa.webp` · `whoa.svg` · `whoa.png` |
| 9 | `ez` | `ez.webp` · `ez.svg` · `ez.png` |
| 10 | `done` | `done.webp` · `done.svg` · `done.png` |
| 11 | `clutch` | `clutch.webp` · `clutch.svg` · `clutch.png` |
| 12 | `gg` | `gg.webp` · `gg.svg` · `gg.png` |
| 13 | `lol` | `lol.webp` · `lol.svg` · `lol.png` |
| 14 | `grumpy` | `grumpy.webp` · `grumpy.svg` · `grumpy.png` |
| 15 | `thumbs` | `thumbs.webp` · `thumbs.svg` · `thumbs.png` |
| 16 | `luck` | `luck.webp` · `luck.svg` · `luck.png` |
| 17 | `point` | `point.webp` · `point.svg` · `point.png` |
| 18 | `shrug` | `shrug.webp` · `shrug.svg` · `shrug.png` |
| 19 | `ok` | `ok.webp` · `ok.svg` · `ok.png` |
| 20 | `shh` | `shh.webp` · `shh.svg` · `shh.png` |

An emote without a file here does not break anything: `EmoteIcon` draws a neutral
rounded square with the first letter of the id, so the picker keeps working while the
artwork is being produced. If the same emote has several formats, `svg` wins, then
`webp`, then `png`.

## The label lives in i18n

There is no text in this folder. Every emote's label — the `aria-label` of its button,
the caption that appears above the sticker on hover and the line in the live feed —
comes from the `emotes` map in **both** dictionaries,
`frontend/src/shared/i18n/es.ts` and `frontend/src/shared/i18n/en.ts`. Adding an id
without its two labels does not compile.

## Format

- **WebP or PNG, 256 × 256 px**, transparent background. The stickers are shown at
  112 px in a live-feed sticker message, 96 px in the phone overlay and 64 px in the
  picker (52 px on phones), so 256 px stays crisp on high-density screens.
- SVG also works, with a square `viewBox` and shapes that carry their own fills.
- The artwork is **raster and never recoloured**: nothing in the game applies
  `currentColor` to it, so each sticker must read on both the light and the dark surface.
- Keep each file under ~25 KB; every file here ships in the client bundle.

## Where they appear

- The **picker** (`src/features/game/components/EmotePicker.tsx`): a round trigger under
  the score card on desktop and under the keyboard on phones, opening a popover with a
  5 × 4 grid plus the player's five most recent emotes.
- The **live feed** (`LiveFeed.tsx`): a reaction is its own message — a "time + name"
  header with the sticker at 112 px under it, consecutive ones from the same player
  stacked under a single header.
- The **phone overlay** (`StickerOverlay.tsx`): phones have no feed, so the newest
  sticker floats over the keyboard at 96 px for 2.5 s with the sender's name.

All of them go through `EmoteIcon` in `src/shared/components/icons/EmoteIcon.tsx`, which
reads this folder through `src/shared/components/icons/customEmotes.ts`.

To add a NEW emote (not just replace artwork) you also have to add its id to `Emote` and
`EMOTES` in the contract (`backend/src/shared/contract/index.ts`, then
`node scripts/sync-contract.mjs`) and its label in both i18n dictionaries.
