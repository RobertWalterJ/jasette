// Does the English in the interface actually fade?
//
//   node build/test-fade.mjs
//
// The interface is French with its English underneath, and the English is meant to
// go quiet, phrase by phrase, as the phrase becomes familiar. This plays that out
// against the real strings.js: a phrase keeps its English until it has been seen on
// enough DIFFERENT days (the same day twice counts once), a learner who placed high
// gets there sooner, a phrase whose English has gone quiet still hands it over for a
// long-press tooltip, and "bring it back" brings back every phrase. A fade that
// never fires, or fires on the first day, would each be a quiet way to fail the
// person it was built for.

import { setMode, setUi, sub, t, gloss, resetFade, fadeStats, STRINGS } from '../app/js/strings.js';

const fails = [];
const need = (ok, what) => { if (!ok) fails.push(what); };
const day = (n) => { const d = new Date(Date.UTC(2026, 9, 1 + n)); return d.toISOString().slice(0, 10); };

// the real clock is used by strings.js, so the "days" here are set directly on the counters
setMode('fade');
const ui = { seen: {} };
setUi(ui);
need(sub('start') === 'Start', 'a new phrase shows its English');
need(sub('start') === 'Start', 'seeing it twice on the same day does not advance the fade');
need(ui.seen.start.n === 1, `the same day counted once (got ${ui.seen.start?.n})`);

ui.seen.start = { n: 5, last: day(-1) };
need(sub('start') === 'Start', 'on the sixth different day the English is still there');
need(sub('start') === 'Start', '…and does not advance again the same day');
ui.seen.start.last = day(-1);
need(sub('start') === '', 'on the seventh different day it goes quiet');
need(gloss('start') === 'Start', 'a quiet phrase still hands over its English for a tooltip');
need(t('start') === 'Commencer', 'the French is never touched');

setUi(ui, { quick: true });
ui.seen.today = { n: 3, last: day(-1) };
need(sub('today') === '', 'a learner who placed high loses the English sooner (after 3 days)');

setMode('both');
ui.seen.next = { n: 99, last: day(-1) };
need(sub('next') === 'Continue', 'in the always-bilingual mode the English never goes');
setMode('fr');
need(sub('start') === '' && gloss('start') === 'Start', 'in French-only the English is hidden but still in the tooltip');
setMode('en');
need(t('start') === 'Start' && sub('start') === '', 'in English-only the English is the text');

setMode('fade');
setUi({ seen: { start: { n: 50, last: day(-1) } } });
need(fadeStats().quiet === 1, 'the count of quiet phrases is reported');
resetFade();
need(fadeStats().quiet === 0 && sub('start') === 'Start', '"bring all the English back" brings back every phrase');

// every interface phrase has both languages
for (const [k, v] of Object.entries(STRINGS)) need(Array.isArray(v) && v.length === 2 && v[0] && v[1], `phrase "${k}" lacks one of its two languages`);

if (fails.length) { console.error('test-fade FAILED:'); for (const f of fails) console.error('  - ' + f); process.exit(1); }
console.log(`test-fade: the English fades phrase by phrase, comes back on request, and the French is never touched (${Object.keys(STRINGS).length} phrases).`);
