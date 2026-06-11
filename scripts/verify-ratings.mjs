/**
 * Phase 1+2 first pass: cross-validate evaluations.json scores against
 *  (a) rusliksu tm-tierlist scores (expert-synthesis, 0-100, June 2026)
 *  (b) tfmstats.com empirical stats from ~209k BGA games (winRate / avgEloChange
 *      when played, and when the player had the option to keep)
 * Read-only. Prints rank correlations + top disagreements.
 */
import { readFileSync } from 'fs';

const evals = JSON.parse(readFileSync('evaluations.json', 'utf-8'));
const cardsDb = JSON.parse(readFileSync('all_cards.json', 'utf-8'));
const tierlist = JSON.parse(readFileSync('verification/tm-tierlist.json', 'utf-8')).cards;
const played = JSON.parse(readFileSync('verification/tfmstats-played.json', 'utf-8'));
const options = JSON.parse(readFileSync('verification/tfmstats-options.json', 'utf-8'));

const norm = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
const ourByNorm = new Map(Object.entries(evals).map(([n, e]) => [norm(n), { name: n, score: e.score }]));
const typeByNorm = new Map(cardsDb.map((c) => [norm(c.name), c.type]));

function spearman(pairs) {
  const rank = (vals) => {
    const sorted = [...vals].map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const ranks = new Array(vals.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[sorted[k][1]] = avg;
      i = j + 1;
    }
    return ranks;
  };
  const xs = rank(pairs.map((p) => p[0]));
  const ys = rank(pairs.map((p) => p[1]));
  const n = pairs.length;
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let num = 0, dx = 0, dy = 0;
  for (let k = 0; k < n; k++) {
    num += (xs[k] - mx) * (ys[k] - my);
    dx += (xs[k] - mx) ** 2;
    dy += (ys[k] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

// ---- (a) vs tm-tierlist ----
const tlJoined = [];
for (const c of Object.values(tierlist)) {
  const ours = ourByNorm.get(norm(c.name));
  if (ours && typeof c.score === 'number') tlJoined.push({ name: ours.name, ours: ours.score, theirs: c.score, type: c.type });
}
console.log(`[A] vs tm-tierlist: joined ${tlJoined.length} cards`);
console.log(`    Spearman (all): ${spearman(tlJoined.map((j) => [j.ours, j.theirs])).toFixed(3)}`);
for (const t of ['project', 'corporation', 'prelude']) {
  const sub = tlJoined.filter((j) => j.type === t);
  if (sub.length > 10) console.log(`    Spearman (${t}): ${spearman(sub.map((j) => [j.ours, j.theirs])).toFixed(3)} (n=${sub.length})`);
}
tlJoined.forEach((j) => (j.delta = j.ours - j.theirs));
const sortedTl = [...tlJoined].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
console.log('    Top 15 disagreements (ours vs theirs):');
sortedTl.slice(0, 15).forEach((j) => console.log(`      ${j.delta > 0 ? '+' : ''}${j.delta}  ${j.name}: ours ${j.ours} vs tierlist ${j.theirs}`));
const meanAbs = tlJoined.reduce((a, j) => a + Math.abs(j.delta), 0) / tlJoined.length;
console.log(`    mean |delta|: ${meanAbs.toFixed(1)} points; within 10 pts: ${(100 * tlJoined.filter((j) => Math.abs(j.delta) <= 10).length / tlJoined.length).toFixed(0)}%`);

// ---- (b) vs tfmstats empirical ----
function vsEmpirical(stats, label, minN) {
  const joined = [];
  for (const row of stats) {
    const ours = ourByNorm.get(norm(row.card));
    if (ours && row.timesPlayed >= minN && typeof row.winRate === 'number') {
      joined.push({ name: ours.name, ours: ours.score, wr: row.winRate, elo: row.avgEloChange, n: row.timesPlayed });
    }
  }
  console.log(`\n[B] vs tfmstats ${label}: joined ${joined.length} cards (n>=${minN})`);
  console.log(`    Spearman ours~winRate:      ${spearman(joined.map((j) => [j.ours, j.wr])).toFixed(3)}`);
  console.log(`    Spearman ours~avgEloChange: ${spearman(joined.map((j) => [j.ours, j.elo])).toFixed(3)}`);
  // biggest mismatches by winRate rank
  const byWr = [...joined].sort((a, b) => b.wr - a.wr);
  const byOurs = [...joined].sort((a, b) => b.ours - a.ours);
  const wrRank = new Map(byWr.map((j, i) => [j.name, i]));
  const ourRank = new Map(byOurs.map((j, i) => [j.name, i]));
  joined.forEach((j) => (j.rankDelta = ourRank.get(j.name) - wrRank.get(j.name)));
  const sorted = [...joined].sort((a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta));
  console.log(`    Top 12 rank disagreements (negative = we overrate vs winRate):`);
  sorted.slice(0, 12).forEach((j) =>
    console.log(`      ${String(-j.rankDelta).padStart(5)}  ${j.name}: ours ${j.ours} | WR ${(100 * j.wr).toFixed(1)}% eloΔ ${j.elo} (n=${j.n})`)
  );
  return joined;
}
vsEmpirical(played, 'when PLAYED', 1000);
vsEmpirical(options, 'when OPTION to keep', 1000);
