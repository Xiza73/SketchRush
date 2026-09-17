/**
 * Builds the social cards, one per interface language.
 *
 * Chrome does the rasterising. It is already on any machine that can open the
 * game, it renders the same web fonts the app uses, and it means the card stays
 * a small HTML file in this script instead of a binary nobody can edit. There is
 * nothing to install.
 *
 *   node scripts/build-og.mjs [domain]
 *
 * The domain is printed on the card and defaults to the Railway subdomain the
 * sibling game uses. Pass the real one once the deploy exists and re-run; then
 * point `og:image` and `og:url` in frontend/index.html at it.
 *
 * The layout mirrors WordRush's card on purpose — same mark, same grid, same
 * type. Per the family rules the accent colour is the only identity knob, so
 * what changes is the accent, the words, and the fact that SketchRush's
 * signature element is a drawing rather than a row of letter tiles: the doodle
 * on the paper is the answer to the mask under it, which is the whole game in
 * one picture.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'frontend', 'public');
const DOMAIN = process.argv[2] ?? 'sketchrush.up.railway.app';

const WIDTH = 1200;
const HEIGHT = 630;

/** The dark theme, straight out of frontend/src/index.css. */
const T = {
  bg: '#151412',
  paper: '#ffffff',
  ink: '#f3efe8',
  ink2: '#b5aea3',
  ink3: '#8a847b',
  line: '#2e2b27',
  accent: '#22d3ee',
  /* The mark: a pencil, cream on the dark badge, tip in the accent. */
  markBody: '#f3efe8',
  markTip: '#22d3ee',
  badge: '#1c1a17',
  /* Inks for the doodle, which sits on white paper and so uses light values. */
  paperInk: '#1c1a17',
  paperAccent: '#0e7490',
  paperRed: '#b33a2b',
};

/**
 * The mark, in the same two paths the app and the favicon use.
 *
 * The pencil silhouette with every corner softened — stroked in its own colour
 * with round joins. Not a bare polygon, which reads hard next to a product whose
 * every other corner is radiused; and not a shape rounded at both ends, which
 * stops being a pencil and becomes a capsule. The asymmetry is the whole point.
 */
const mark = (size, body, tip) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 64 64" ` +
  `stroke-width="8" stroke-linejoin="round" stroke-linecap="round">` +
  `<path d="M40 8 L56 24 L28 52 L10 56 L12 36 Z" fill="${body}" stroke="${body}"/>` +
  `<path d="M12 36 L28 52 L10 56 Z" fill="${tip}" stroke="${tip}"/></svg>`;

/**
 * The house from the landing page's hero, on a 0..100 canvas. Reused rather
 * than redrawn: the card should be made of the same pencil as the product.
 */
const HOUSE = [
  { d: 'M14 54 L50 22 L86 54', ink: T.paperInk },
  { d: 'M22 50 L22 84 L78 84 L78 50', ink: T.paperInk },
  { d: 'M42 84 L42 64 L58 64 L58 84', ink: T.paperAccent },
  { d: 'M60 30 L60 16 L70 16 L70 38', ink: T.paperRed },
];

const CARDS = {
  en: {
    lang: 'en',
    headline: ['Draw it.', 'Make it obvious.'],
    /**
     * `null` is a blank slot, exactly as the game masks a word mid-turn. The
     * gap goes at the end rather than the middle: a hole in the middle of a
     * short word reads as two words at this size.
     */
    mask: ['H', 'O', 'U', 'S', null],
    footer: 'Draw and guess · up to 10 players · Spanish and English',
    alt: 'SketchRush: draw it, make it obvious.',
  },
  es: {
    lang: 'es',
    headline: ['Dibuja.', 'Que se entienda.'],
    mask: ['C', 'A', 'S', null],
    footer: 'Dibuja y adivina · hasta 10 jugadores · español e inglés',
    alt: 'SketchRush: dibuja, que se entienda.',
  },
};

const html = (card) => `<!doctype html>
<html lang="${card.lang}">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=DM+Sans:wght@400;500&family=JetBrains+Mono:wght@700&display=swap" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  /*
   * Placed rather than flowed. The footer runs the full width the way the
   * sibling card's does, and it is long enough that giving it a grid column
   * would squeeze the drawing off the right edge instead of wrapping.
   */
  body {
    position: relative;
    background: ${T.bg};
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  .brand { position: absolute; top: 66px; left: 80px; display: flex; align-items: center; gap: 16px; }
  .brand span {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 800; font-size: 38px; letter-spacing: -0.02em; color: ${T.ink};
  }

  h1 {
    position: absolute; left: 80px; top: 50%; transform: translateY(-56%);
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 800; font-size: 74px; line-height: 1.05;
    letter-spacing: -0.035em; color: ${T.ink};
  }

  .foot {
    position: absolute; left: 80px; right: 80px; bottom: 62px;
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 20px; white-space: nowrap;
  }
  .foot .what { color: ${T.ink2}; }
  .foot .where { color: ${T.ink3}; font-weight: 500; }

  .right { position: absolute; right: 80px; top: 50%; transform: translateY(-54%); }

  /* The game's own canvas: paper white in both themes, and always 4:3. */
  .paper {
    width: 356px; height: 267px; background: ${T.paper};
    border-radius: 22px; display: grid; place-items: center;
  }
  .paper svg { width: 214px; height: 214px; }

  .mask { display: flex; justify-content: center; gap: 9px; margin-top: 26px; }
  .mask i {
    display: flex; align-items: flex-end; justify-content: center;
    width: 40px; height: 52px;
    border-bottom: 4px solid ${T.ink3};
    font-family: 'JetBrains Mono', monospace; font-weight: 700;
    font-size: 40px; line-height: 1; letter-spacing: 0.08em;
    color: ${T.accent};
  }
</style>
</head>
<body>
  <div class="brand">
    ${mark(40, T.markBody, T.markTip)}
    <span>SketchRush</span>
  </div>

  <h1>${card.headline.join('<br />')}</h1>

  <div class="foot">
    <span class="what">${card.footer}</span>
    <span class="where">${DOMAIN}</span>
  </div>

  <div class="right">
    <div class="paper">
      <svg viewBox="0 0 100 100" fill="none" stroke-width="5"
           stroke-linecap="round" stroke-linejoin="round">
        ${HOUSE.map((s) => `<path d="${s.d}" stroke="${s.ink}" />`).join('\n        ')}
      </svg>
    </div>
    <div class="mask">
      ${card.mask.map((c) => `<i>${c ?? ''}</i>`).join('\n      ')}
    </div>
  </div>
</body>
</html>`;

const findChrome = () => {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      'No Chrome or Edge found. Set CHROME=/path/to/chrome and run this again.',
    );
  }
  return found;
};

const chrome = findChrome();
const work = join(tmpdir(), `sketchrush-og-${process.pid}`);
mkdirSync(work, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

try {
  for (const card of Object.values(CARDS)) {
    const page = join(work, `og-${card.lang}.html`);
    const out = join(OUT_DIR, `og-${card.lang}.png`);
    writeFileSync(page, html(card));
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        `--window-size=${WIDTH},${HEIGHT}`,
        // Long enough for the web fonts to arrive; without them the card
        // silently falls back to a system face and looks like another product.
        '--virtual-time-budget=10000',
        `--screenshot=${out}`,
        `file:///${page.replace(/\\/g, '/')}`,
      ],
      { stdio: 'ignore' },
    );
    console.log(`og-${card.lang}.png  ${card.alt}`);
  }

  /*
   * The app icons come from here too. They are the same mark on the same badge,
   * and the last time they did not they were left behind: the tab showed one
   * logo and the home screen another. One script, one source, no drift.
   */
  for (const [name, size] of [
    ['apple-touch-icon.png', 180],
    ['icon-512.png', 512],
  ]) {
    const page = join(work, `${name}.html`);
    writeFileSync(
      page,
      `<!doctype html><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px;overflow:hidden}` +
        `.b{width:${size}px;height:${size}px;background:${T.badge};border-radius:22%;display:grid;place-items:center}</style>` +
        `<div class="b">${mark(Math.round(size * 0.78), T.markBody, T.markTip)}</div>`,
    );
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        `--window-size=${size},${size}`,
        '--virtual-time-budget=3000',
        `--screenshot=${join(OUT_DIR, name)}`,
        `file:///${page.replace(/\\/g, '/')}`,
      ],
      { stdio: 'ignore' },
    );
    console.log(`${name}  ${size}x${size}`);
  }

  console.log(`\n${WIDTH}x${HEIGHT} -> frontend/public/`);
  console.log(
    `\nThe cards say "${DOMAIN}". frontend/index.html has to agree, and so does\n` +
      `the deploy — a card served from one host and advertised from another is a\n` +
      `broken preview. These are the lines that carry it:\n\n` +
      `  <meta property="og:url" content="https://${DOMAIN}/" />\n` +
      `  <meta property="og:image" content="https://${DOMAIN}/og-en.png" />\n` +
      `  <meta name="twitter:image" content="https://${DOMAIN}/og-en.png" />\n`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
