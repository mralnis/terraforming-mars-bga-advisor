/**
 * Internal-consistency audit of evaluations.json against all_cards.json.
 * Read-only: prints findings, changes nothing.
 */
import { readFileSync } from 'fs';

const cards = JSON.parse(readFileSync('all_cards.json', 'utf-8'));
const evals = JSON.parse(readFileSync('evaluations.json', 'utf-8'));

const norm = (n) => n.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
const cardByNorm = new Map(cards.map((c) => [norm(c.name), c]));

// Cards actually reachable on BGA (per docs/BGA-DOM-REFERENCE.md)
const onBga = (c) => {
  if (/^\d+$/.test(c.id)) return parseInt(c.id, 10) <= 208;
  if (/^P\d+$/.test(c.id)) return true;            // preludes + prelude projects
  if (/^C\d+$/.test(c.id)) return true;            // colonies projects
  if (c.id.startsWith('R')) {
    const BGA_CORPS = new Set(['beginner corporation','credicor','ecoline','helion','interplanetary cinematics','inventrix','mining guild','saturn systems','phobolog','teractor','tharsis republic','thorgate','united nations mars initiative','point luna','robinson industries','cheung shing mars','valley trust','vitor','aridor','arklight','polyphemos','poseidon','stormcraft incorporated']);
    return BGA_CORPS.has(norm(c.name));
  }
  return false;
};

const bgaCards = cards.filter(onBga);
console.log(`cards total: ${cards.length}, on BGA: ${bgaCards.length}, evaluations: ${Object.keys(evals).length}`);

// 1. Tier vs score band consistency
const band = (s) => (s >= 90 ? 'S' : s >= 75 ? 'A' : s >= 60 ? 'B' : s >= 40 ? 'C' : s >= 20 ? 'D' : 'F');
let mismatches = [];
for (const [name, ev] of Object.entries(evals)) {
  if (typeof ev.score === 'number' && ev.tier && band(ev.score) !== ev.tier) {
    mismatches.push(`${name}: tier=${ev.tier} score=${ev.score} (band says ${band(ev.score)})`);
  }
}
console.log(`\n[1] tier/score band mismatches: ${mismatches.length}`);
mismatches.slice(0, 15).forEach((m) => console.log('   ' + m));

// 2. BGA cards WITHOUT evaluation (fall back to autoEvaluate)
const evalNorms = new Set(Object.keys(evals).map(norm));
const unrated = bgaCards.filter((c) => !evalNorms.has(norm(c.name)));
console.log(`\n[2] BGA-reachable cards with NO expert evaluation: ${unrated.length}`);
unrated.slice(0, 30).forEach((c) => console.log(`   ${c.id} ${c.name} (${c.type})`));

// 3. Synergy referential integrity
let synTotal = 0, synBroken = 0;
const brokenNames = new Map();
for (const ev of Object.values(evals)) {
  for (const s of ev.synergies ?? []) {
    synTotal++;
    if (!cardByNorm.has(norm(s))) {
      synBroken++;
      brokenNames.set(s, (brokenNames.get(s) ?? 0) + 1);
    }
  }
}
console.log(`\n[3] synergy entries: ${synTotal}, unresolvable to a card: ${synBroken} (${(100 * synBroken / synTotal).toFixed(1)}%)`);
[...brokenNames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([n, c]) => console.log(`   ${c}x "${n}"`));

// 4. Score distributions by type
const byType = {};
for (const [name, ev] of Object.entries(evals)) {
  const c = cardByNorm.get(norm(name));
  const t = c ? c.type : 'NOT-IN-DB';
  (byType[t] ??= []).push(ev.score ?? -1);
}
console.log('\n[4] score distribution by card type:');
for (const [t, arr] of Object.entries(byType)) {
  const valid = arr.filter((x) => x >= 0);
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  console.log(`   ${t.padEnd(12)} n=${String(valid.length).padStart(3)} mean=${mean.toFixed(1)} min=${Math.min(...valid)} max=${Math.max(...valid)}`);
}

// 5. timingBias derivation coverage (when_to_pick present but no early/late keyword hit)
const kw = /(early|late|mid|ранн|поздн|средн)/i;
let wtp = 0, wtpNoKw = 0;
for (const ev of Object.values(evals)) {
  if (typeof ev.when_to_pick === 'string' && ev.when_to_pick.length > 0) {
    wtp++;
    if (!kw.test(ev.when_to_pick)) wtpNoKw++;
  }
}
console.log(`\n[5] when_to_pick texts: ${wtp}; without timing keyword (timingBias stays 0): ${wtpNoKw}`);

// 6. Missing numeric fields
let noScore = 0, noTier = 0;
for (const ev of Object.values(evals)) {
  if (typeof ev.score !== 'number') noScore++;
  if (!ev.tier) noTier++;
}
console.log(`\n[6] evals missing score: ${noScore}, missing tier: ${noTier}`);

// 7. Top/bottom sanity list (eyeball check against community consensus)
const rated = Object.entries(evals)
  .filter(([n]) => cardByNorm.has(norm(n)) && onBga(cardByNorm.get(norm(n))))
  .map(([n, ev]) => ({ n, s: ev.score ?? 0, t: cardByNorm.get(norm(n)).type }));
rated.sort((a, b) => b.s - a.s);
console.log('\n[7] top 12 rated (BGA-reachable):');
rated.slice(0, 12).forEach((r) => console.log(`   ${String(r.s).padStart(3)} ${r.n} (${r.t})`));
console.log('    bottom 8:');
rated.slice(-8).forEach((r) => console.log(`   ${String(r.s).padStart(3)} ${r.n} (${r.t})`));
