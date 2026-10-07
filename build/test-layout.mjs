// Does anything in the app end up wider than a phone?
//
//   node build/test-layout.mjs
//
// Hok Gong once shipped a row of dashes, one per question in a round, sized when
// a round was ten questions: 18px each plus gaps fits. Rounds became twenty-five
// and could be set to forty, and every screen scrolled sideways. Each rule was
// fine on its own; it was the multiplication that did not fit.
//
// So this reads the real CSS and fails the build if a fixed width exceeds the
// narrowest phone worth supporting, or if the page could scroll sideways at all.
// The things that repeat here — the progress bar, the heat map, the word bank,
// the choices — are all flexible (flex, fr units, wrapping), and this checks it.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(process.argv[2] || join(ROOT, 'app', 'style.css'), 'utf8');
const PHONE = 320;                      // an iPhone SE: the floor
const fails = [], lines = [];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleFor = (sel) => {
  const m = css.match(new RegExp('(?:^|[,}\\n])\\s*' + esc(sel) + '\\s*\\{([^}]*)\\}', 'm'));
  return m ? m[1] : null;
};

// nothing fixed wider than a phone (max-width is a ceiling, not a demand)
const wide = [];
for (const [, name, val] of css.matchAll(/(?:^|[;{]\s*)(width|min-width)\s*:\s*(\d+)px/g)) if (Number(val) > PHONE) wide.push(`${name}: ${val}px`);
lines.push(`fixed widths over ${PHONE}px: ${wide.length}`);
if (wide.length) fails.push(`fixed widths larger than a ${PHONE}px phone: ${wide.join(', ')}`);

// the repeated things must be able to shrink or wrap
const flexible = [
  ['.progress', /flex:\s*1/, 'the round progress bar shares the width it is given'],
  ['.heat', /repeat\(14,\s*1fr\)/, 'the 56-day heat map is fractional columns'],
  ['.bank', /flex-wrap:\s*wrap/, 'the word bank wraps'],
  ['.built', /flex-wrap:\s*wrap/, 'the built sentence wraps'],
  ['.chips', /flex-wrap:\s*wrap/, 'chips wrap'],
  ['.choices', /display:\s*grid/, 'answer choices are a grid'],
];
for (const [sel, re, what] of flexible) {
  const body = ruleFor(sel) || '';
  lines.push(`${what}: ${re.test(body) ? 'yes' : 'NO'}`);
  if (!re.test(body)) fails.push(`${sel} must be flexible — ${what}`);
}
// the page itself must not scroll sideways: `overflow-x: hidden` makes the root a
// scroll container, so too-wide content can still be scrolled to; `clip` cannot.
const rootOverflow = (/html,\s*body\s*\{[^}]*overflow-x:\s*(\w+)/.exec(css) || [])[1];
lines.push(`the page's horizontal overflow: ${rootOverflow || 'not set'}`);
if (rootOverflow !== 'clip') fails.push(`the page should set overflow-x: clip (it is "${rootOverflow || 'not set'}")`);
// the app column is capped, and the sheet too
for (const sel of ['#app', '.sheet']) {
  const m = /max-width:\s*(\d+)px/.exec(ruleFor(sel) || '');
  lines.push(`${sel} max-width: ${m ? m[1] + 'px' : 'not set'}`);
  if (!m) fails.push(`${sel} needs a max-width`);
}

console.log('test-layout:');
for (const l of lines) console.log('  ' + l);
if (fails.length) { console.error('\ntest-layout FAILED:'); for (const f of fails) console.error('  - ' + f); process.exit(1); }
console.log('test-layout: nothing is wider than a 320px phone.');
