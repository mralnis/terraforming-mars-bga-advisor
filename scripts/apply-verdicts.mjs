/**
 * Applies the 2026-06-10 ratings-verification outcomes to evaluations.json:
 *  - 10 reviewed score adjustments (see verification/review-verdicts.json)
 *  - synergy-reference spelling fixes
 *  - Beginner Corporation evaluation (was the only unrated BGA card)
 *  - tier regeneration from score (extension bands: S>=90 A>=75 B>=60 C>=40 D>=20)
 * Each adjusted card gets an `adjustment` provenance field.
 */
import { readFileSync, writeFileSync } from 'fs';

const evals = JSON.parse(readFileSync('evaluations.json', 'utf-8'));

// 1. Reviewed score changes (Ice Cap Melting and Protected Habitats: keep)
const CHANGES = {
  'Immigrant City': 58,
  'Advanced Alloys': 78,
  'Special Design': 32,
  'Quantum Communications': 66,
  'Heavy Taxation': 67,
  'Martian Zoo': 52,
  'Productive Outpost': 55,
  'Luna Governor': 64,
  'Ganymede Colony': 63,
  'Caretaker Contract': 35,
};
let applied = 0;
for (const [name, newScore] of Object.entries(CHANGES)) {
  const ev = evals[name];
  if (!ev) {
    console.warn(`MISSING eval for "${name}" — skipped`);
    continue;
  }
  ev.adjustment = `2026-06-10: score ${ev.score} -> ${newScore} per adversarial COTD/expert review + tfmstats empirics (verification/review-verdicts.json)`;
  ev.score = newScore;
  applied++;
}

// 2. Synergy reference fixes (variants that exist as real cards under another name)
const SYNONYM = {
  'Standard Technologies': 'Standard Technology',
  'Cartels': 'Cartel',
  'UNMI': 'United Nations Mars Initiative',
  'Nitrogen Rich Asteroid': 'Nitrogen-Rich Asteroid',
};
let synFixed = 0;
const fixList = (arr) =>
  arr.map((s) => {
    if (SYNONYM[s]) {
      synFixed++;
      return SYNONYM[s];
    }
    return s;
  });
for (const ev of Object.values(evals)) {
  if (Array.isArray(ev.synergies)) ev.synergies = fixList(ev.synergies);
  if (Array.isArray(ev.anti_synergies)) ev.anti_synergies = fixList(ev.anti_synergies);
  if (Array.isArray(ev.antiSynergies)) ev.antiSynergies = fixList(ev.antiSynergies);
}

// 3. Beginner Corporation (training corp; effectively never picked competitively)
if (!evals['Beginner Corporation']) {
  evals['Beginner Corporation'] = {
    name: 'Beginner Corporation',
    score: 40,
    tier: 'C',
    type: 'corporation',
    economy: '42 MC, keep all 10 starting cards for free, no effect.',
    reasoning:
      'Training corporation for beginner games only; the free starting hand is worth ~30 MC but the lack of any ongoing effect loses to every real corporation. Not available in Arena.',
    synergies: [],
    when_to_pick: 'Only in beginner games where it is forced.',
    adjustment: '2026-06-10: added (was the only unrated BGA-reachable card)',
  };
}

// 4. Regenerate every tier from score using the extension bands
const band = (s) => (s >= 90 ? 'S' : s >= 75 ? 'A' : s >= 60 ? 'B' : s >= 40 ? 'C' : s >= 20 ? 'D' : 'F');
let retiered = 0;
for (const ev of Object.values(evals)) {
  if (typeof ev.score !== 'number') continue;
  const t = band(ev.score);
  if (ev.tier !== t) {
    ev.tier = t;
    retiered++;
  }
}

writeFileSync('evaluations.json', JSON.stringify(evals, null, 2) + '\n', 'utf-8');
console.log(
  `applied: ${applied} score changes, ${synFixed} synergy refs fixed, ${retiered} tiers regenerated, total evals: ${Object.keys(evals).length}`
);
