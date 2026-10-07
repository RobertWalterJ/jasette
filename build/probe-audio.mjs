// Which Tatoeba recordings still exist?
//
//   node build/probe-audio.mjs      (after build/sentences.mjs)
//
// Tatoeba's weekly export lists recordings that have since been deleted — the
// page for sentence 139082 shows no audio though the export says Inego
// recorded it — so a listed recording is not a recording. This asks the audio
// server (a cheap HEAD request) about every French sentence recorded under a
// licence the app may redistribute, and keeps the ones that answer 200.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = JSON.parse(readFileSync(join(ROOT, 'corpus', 'sentidx.json'), 'utf8'));
// Any Creative Commons licence: the living French recordings are mostly CC BY-NC-ND 3.0
// or CC BY-NC 4.0, which allow redistribution, unmodified and credited, for
// non-commercial use. Recordings with no licence stated are left out.
const CC = /^CC/;
const todo = S.filter((s) => s.a && CC.test(s.a.lic || '') && s.n >= 4 && s.n <= 13 && s.u <= 1 && s.reg !== 'fam').map((s) => s.id);
console.log(`${todo.length} recorded sentences under a Creative Commons licence to check`);
const ok = [];
let n = 0;
const worker = async () => {
  while (todo.length) {
    const id = todo.shift();
    try {
      const r = await fetch(`https://audio.tatoeba.org/sentences/fra/${id}.mp3`, { method: 'HEAD' });
      if (r.ok && /audio/.test(r.headers.get('content-type') || '')) ok.push(id);
    } catch { /* a network blip is a miss, not a crash */ }
    if (++n % 500 === 0) console.log(`  ${n}`);
  }
};
await Promise.all(Array.from({ length: 24 }, worker));
writeFileSync(join(ROOT, 'corpus', 'audio-ok.json'), JSON.stringify(ok.sort((a, b) => a - b)));
console.log(`${ok.length} recordings answer`);
