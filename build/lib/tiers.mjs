// What lives where. One definition, used by the build gate (build/test-budget.mjs)
// and mirrored, by hand and checked, in sw.js and app/js/audio.js — a service worker
// cannot import from build/, so the rule is written three times and the gate fails if
// the copies drift (it reads the other two files and compares).
//
// Three tiers of recording:
//
//   core    The commonest 1,500 words in both accents, and the whole Québec track.
//           Offered for offline use ("Garder l'essentiel"), and NEVER evicted: it is
//           the part of the app that must work on a bus with no signal.
//   bundled Everything else that ships in docs/ (the rarer words, the recorded
//           sentences). Cached on the phone when played, and trimmed — least recently
//           played first — to the size the learner chose.
//   remote  Recordings not shipped at all. Streamed from Wikimedia or Tatoeba when
//           played, kept only as bundled ones are, and re-streamed after eviction.
//
// So "evicted" is never "lost": every clip that can leave the phone can come back, from
// the bundle or from its source, and the app says which.

export const CORE_RANK = 1500;                       // words up to this rank are core
export const MB = 1048576;

// A bundled word clip is audio/w/<fr|qc>-<rank>.mp3, a Canadian-track clip audio/w/q-<slug>.mp3,
// a sentence audio/s/<id>.mp3.
export const tierOf = (path) => {
  const m = /\/audio\/w\/(?:fr|qc)-(\d+)\.mp3$/.exec(path);
  if (m) return +m[1] <= CORE_RANK ? 'core' : 'bundled';
  if (/\/audio\/w\/q-[^/]+\.mp3$/.test(path)) return 'core';
  if (/\/audio\/s\/\d+\.mp3$/.test(path)) return 'bundled';
  return 'remote';
};

// The budgets. Each is a ceiling the build refuses to cross, with the reason beside it.
export const BUDGET = {
  shellMB: 14,          // what the service worker precaches on install: page, script, style, fonts, deck. Over mobile data this is the first-run cost.
  coreMB: 40,           // the part that must be offline-ready. Over this, "keep the essentials" stops being a casual tap on Wi-Fi.
  bundledMB: 140,       // everything shipped in docs/ (core + bundled audio). GitHub recommends repositories under 1 GB and Pages sites under 1 GB; this leaves room to grow tenfold.
  clipKB: 400,          // no single recording larger than this: a clip that big is a wrong file, not a word.
  deckMB: 12,           // the deck is parsed into memory once at start; past this a low-end phone is the one that suffers.
  minCoreCoverage: 0.9, // of the core words that HAVE a recording, this share must be bundled, or "core" is a promise the app cannot keep offline.
};
