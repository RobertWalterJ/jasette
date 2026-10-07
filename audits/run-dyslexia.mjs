// The dyslexia audit — can this app be read by the person it was built for?
//
//   node audits/run-dyslexia.mjs
//
// Robert is dyslexic, and that is a standing constraint on everything built for
// him, not a feature request. The British Dyslexia Association's style guide is
// the reference: sans-serif type, generous size and line spacing, left-aligned
// rather than justified or centred, no blocks of capitals, no italics for
// emphasis, off-white rather than pure white, and never anything that depends
// on reading quickly.
//
// Most of that can be checked mechanically, so it is — and a failure here
// fails the build, exactly like the colour audit.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'app', 'style.css'), 'utf8');
const js = readdirSync(join(ROOT, 'app', 'js')).filter((f) => f.endsWith('.js')).map((f) => ({ f, text: readFileSync(join(ROOT, 'app', 'js', f), 'utf8') }));
const allJs = js.map((x) => x.text).join('\n');

const problems = [], notes = [], passes = [];
const check = (ok, what, detail = '') => (ok ? passes.push(what) : problems.push(`${what}${detail ? ' — ' + detail : ''}`));

// ── type ─────────────────────────────────────────────────────────────────
const cssVar = (name) => (new RegExp(`${name}:\\s*([^;]+);`).exec(css) || [])[1]?.trim();
check(parseFloat(cssVar('--read-size') || '0') >= 17, 'body text is at least 17px', `--read-size is ${cssVar('--read-size')}`);
check(parseFloat(cssVar('--read-lh') || '0') >= 1.5, 'line spacing is at least 1.5', `--read-lh is ${cssVar('--read-lh')}`);
check(/html\.big\s*\{[^}]*font-size:\s*1[12]\d%/.test(css), 'a larger-text setting exists');
check(/html\.dys\s*\{[^}]*--read-ls/.test(css), 'a roomier-spacing setting exists');
check(/--bg:\s*#(?!FFFFFF|fff\b)/i.test(css), 'the page is off-white rather than pure white');
check(/Atkinson Hyperlegible/.test(css), 'the interface face is one designed for legibility (Atkinson Hyperlegible)');

const rules = [...css.matchAll(/(?:^|\})\s*([^{}@]+)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim().split('\n').pop().trim(), body: m[2] }));
const selectorsWith = (re) => rules.filter((r) => re.test(r.body)).map((r) => r.sel);

const upper = selectorsWith(/text-transform:\s*uppercase/);
check(upper.length === 0, 'no text is set in capitals', upper.join(', '));
const italics = selectorsWith(/font-style:\s*italic/);
check(italics.length === 0, 'nothing uses italics for emphasis', italics.join(', '));
check(!/text-align:\s*justify/.test(css), 'nothing is justified');
const PROSE_CONTAINER = /^\.(card|gpoint|note|stn|hero)$/;
const centredProse = rules.filter((r) => /text-align:\s*center/.test(r.body)).map((r) => r.sel.split(',').map((s) => s.trim())).flat().filter((sel) => PROSE_CONTAINER.test(sel));
check(centredProse.length === 0, 'paragraphs are not centred', centredProse.join(', '));

// The French is set in a serif (Fraunces), because it is what makes the words
// the thing on the page. The style guide asks for sans-serif, so it must be
// possible to switch it off.
const serifFrench = /--fr:\s*'Fraunces'/.test(css);
check(!serifFrench || /html\.plain\s*\{[^}]*--fr:\s*var\(--ui\)/.test(css), 'the serif French face can be switched to the interface sans');
check(!serifFrench || /'plain'|\bplain\b/.test(allJs), 'a setting for it exists in the app');

// ── reading aloud ────────────────────────────────────────────────────────
// This app is mostly sound: every word and every sentence plays. And the
// English prose — the grammar, the notes — can be read to the learner too.
check(/speechSynthesis/.test(allJs) && /export const say\b/.test(allJs), 'the phone can read text aloud');
const playButtons = (allJs.match(/playBtn\(|sentenceBtn\(|wordVoices\(/g) || []).length;
check(playButtons >= 12, 'play buttons are used widely', `${playButtons} found`);
const readButtons = (allJs.match(/readBtn\(/g) || []).length;
check(readButtons >= 4, 'prose can be read aloud (grammar, notes, the Canadian cards)', `${readButtons} read-aloud buttons found`);
check(/function unlock|export function unlock/.test(allJs) && /pointerdown/.test(allJs), 'speech is unlocked by the first touch, so it is never silently dead on a phone');

// ── nothing that depends on reading fast ─────────────────────────────────
// A countdown, a timer, a question that disappears: all of them punish slow
// reading, and none of them measures knowing a word. The two things worth
// forbidding: a timer fast enough to feel like a clock, and one that ends by
// doing something.
const timers = [...allJs.matchAll(/setInterval\(([\s\S]{0,200}?),\s*(\d+)(e\d)?\s*\)/g)].map((m) => ({ body: m[1], ms: Number(m[2]) * (m[3] ? 10 ** Number(m[3].slice(1)) : 1) }));
check(timers.filter((x) => x.ms < 30e3).length === 0, 'no repeating timer runs faster than once every 30 seconds');
check(timers.filter((x) => /show\(|startRound|onAnswer|onNext|\.next\(|submit|advance/.test(x.body)).length === 0, 'no repeating timer advances or answers anything by itself');
const code = allJs.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
check(!/timeLeft|secondsLeft|timeUp|deadline|countdown/i.test(code), 'nothing counts down to a deadline');
// A question never moves on by itself: the only automatic advance is the level
// check's, which shows nothing to read in between.
const autoNext = [...code.matchAll(/setTimeout\(([^,]{0,40}),\s*(\d+)/g)].filter((m) => /\bask\b|onNext|next/.test(m[1])).map((m) => m[0]);
check(autoNext.length <= 1, 'only the level check ever advances by itself, and it has nothing to read in between', autoNext.join(' | '));
const delays = [...allJs.matchAll(/setTimeout\(([^,]{0,40}),\s*(\d+)/g)].map((m) => `${m[2]}ms`);
if (delays.length) notes.push(`timeouts in the app (none should take a question away): ${delays.join(', ')}`);

// ── motion ───────────────────────────────────────────────────────────────
check(/prefers-reduced-motion/.test(css), 'animation is disabled for anyone who asks for less motion');

// ── report ───────────────────────────────────────────────────────────────
console.log(`dyslexia audit: ${passes.length} checks passed`);
for (const p of passes) console.log('  ok   ' + p);
for (const n of notes) console.log('  note ' + n);
if (problems.length) {
  console.error(`\ndyslexia audit FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.error('  x  ' + p);
  process.exit(1);
}
console.log('\nNothing here asks the reader to read quickly, in capitals, or in a straight line they cannot find.');
