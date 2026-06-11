/**
 * Validates all_cards.json against the live-captured BGA id→name mapping
 * (scripts/bga-live-capture.json). Reports id mismatches and name-normalization
 * mismatches that would break id- or name-based card resolution.
 */
import { readFileSync } from 'fs';

const allCards = JSON.parse(readFileSync('all_cards.json', 'utf-8'));
const live = JSON.parse(readFileSync('scripts/bga-live-capture.json', 'utf-8'));

const normalize = (n) => n.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').trim();

const byNormName = new Map();
for (const c of allCards) byNormName.set(normalize(c.name), c);

let ok = 0, idMismatch = 0, missing = 0;
const problems = [];

function check(bgaIdStr, bgaName, expectedLocalId) {
  const local = byNormName.get(normalize(bgaName));
  if (!local) {
    missing++;
    problems.push(`MISSING in all_cards.json: BGA "${bgaName}" (bga id ${bgaIdStr})`);
    return;
  }
  if (expectedLocalId !== null && local.id !== expectedLocalId) {
    idMismatch++;
    problems.push(`ID MISMATCH: "${bgaName}" BGA=${bgaIdStr} local id=${local.id} (expected ${expectedLocalId})`);
    return;
  }
  ok++;
}

// 1. Numeric main cards: BGA "56" should be local "056"-style zero-padded or equal numerically
for (const [bgaId, name] of Object.entries(live.main_numeric)) {
  const local = byNormName.get(normalize(name));
  if (!local) { missing++; problems.push(`MISSING: main #${bgaId} "${name}"`); continue; }
  if (parseInt(local.id, 10) !== parseInt(bgaId, 10)) {
    idMismatch++; problems.push(`ID MISMATCH main: "${name}" BGA=${bgaId} local=${local.id}`);
  } else ok++;
}

// 2. Prefixed main cards (P36+, C##) — local id should equal BGA suffix
for (const [suffix, name] of Object.entries(live.main_prefixed_sample)) {
  check(suffix, name, suffix);
}

// 3. Preludes — local id should equal BGA P-suffix
for (const [suffix, name] of Object.entries(live.preludes_sample)) {
  check(suffix, name, suffix);
}

// 4. Corps — report the local R-number for each BGA corp number (mapping table needed)
console.log('--- BGA corp number -> local tm-advisor id ---');
for (const [bgaNum, name] of Object.entries(live.corps)) {
  const local = byNormName.get(normalize(name));
  console.log(`  BGA corp_${bgaNum} = ${name} -> local ${local ? local.id : 'MISSING'}`);
}

console.log('\n--- Validation summary ---');
console.log(`OK: ${ok}, ID mismatches: ${idMismatch}, missing: ${missing}`);
for (const p of problems) console.log('  ' + p);
