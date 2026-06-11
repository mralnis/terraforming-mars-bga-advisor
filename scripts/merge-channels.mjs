/**
 * Merges the workflow's timing/tag-weight assignments
 * (verification/channels/result-*.json + result-review.json corrections)
 * into evaluations.json as explicit timing_bias / tag_synergy_weights fields.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const evals = JSON.parse(readFileSync('evaluations.json', 'utf-8'));
const norm = (n) => n.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const evalKeyByNorm = new Map(Object.keys(evals).map((k) => [norm(k), k]));
const VALID_KEYS = new Set(['building', 'space', 'science', 'power', 'earth', 'jovian', 'plant', 'microbe', 'animal', 'city', 'event', 'venus', 'wild']);

// 1. Load assignments
const assignments = new Map();
for (let n = 1; n <= 8; n++) {
  const p = `verification/channels/result-${n}.json`;
  if (!existsSync(p)) { console.warn(`missing ${p}`); continue; }
  for (const row of JSON.parse(readFileSync(p, 'utf-8'))) assignments.set(norm(row.name), row);
}

// 2. Apply reviewer corrections
let corrected = 0;
const reviewPath = 'verification/channels/result-review.json';
if (existsSync(reviewPath)) {
  for (const c of JSON.parse(readFileSync(reviewPath, 'utf-8'))) {
    const row = assignments.get(norm(c.name));
    if (!row) continue;
    if (c.field === 'timing_bias') row.timing_bias = c.to;
    if (c.field === 'tag_synergy_weights') row.tag_synergy_weights = c.to;
    corrected++;
  }
}

// 3. Validate + write into evaluations
let applied = 0, nonzeroTiming = 0, weighted = 0, skipped = 0, sanitized = 0;
for (const [key, row] of assignments) {
  const evalKey = evalKeyByNorm.get(key);
  if (!evalKey) { skipped++; continue; }
  const ev = evals[evalKey];

  let tb = Math.round(Number(row.timing_bias) || 0);
  tb = Math.max(-15, Math.min(15, tb));
  if ((ev.type === 'corporation' || ev.type === 'prelude') && tb !== 0) { tb = 0; sanitized++; }

  const weights = {};
  if (row.tag_synergy_weights && typeof row.tag_synergy_weights === 'object') {
    for (const [k, v] of Object.entries(row.tag_synergy_weights)) {
      if (VALID_KEYS.has(k) && typeof v === 'number' && v >= 1 && v <= 3 && Object.keys(weights).length < 3) {
        weights[k] = Math.round(v);
      } else if (!VALID_KEYS.has(k) || typeof v !== 'number') sanitized++;
    }
  }

  ev.timing_bias = tb;
  if (Object.keys(weights).length > 0) ev.tag_synergy_weights = weights;
  else delete ev.tag_synergy_weights;
  applied++;
  if (tb !== 0) nonzeroTiming++;
  if (Object.keys(weights).length > 0) weighted++;
}

writeFileSync('evaluations.json', JSON.stringify(evals, null, 2) + '\n', 'utf-8');
console.log(`assignments: ${assignments.size}, applied: ${applied}, skipped(no eval): ${skipped}, reviewer corrections: ${corrected}, sanitized: ${sanitized}`);
console.log(`nonzero timing_bias: ${nonzeroTiming}, with tag weights: ${weighted}`);
