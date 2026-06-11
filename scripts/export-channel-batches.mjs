/**
 * Exports BGA-reachable cards (with their evaluation context) into batch
 * files under verification/channels/ for the timing/tag-weight assignment
 * workflow.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const cards = JSON.parse(readFileSync('all_cards.json', 'utf-8'));
const evals = JSON.parse(readFileSync('evaluations.json', 'utf-8'));
const norm = (n) => n.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const evalByNorm = new Map(Object.entries(evals).map(([n, e]) => [norm(n), e]));

const BGA_CORPS = new Set(['beginner corporation','credicor','ecoline','helion','interplanetary cinematics','inventrix','mining guild','saturn systems','phobolog','teractor','tharsis republic','thorgate','united nations mars initiative','point luna','robinson industries','cheung shing mars','valley trust','vitor','aridor','arklight','polyphemos','poseidon','stormcraft incorporated']);
const onBga = (c) => {
  if (/^\d+$/.test(c.id)) return parseInt(c.id, 10) <= 208;
  if (/^P\d+$/.test(c.id) || /^C\d+$/.test(c.id)) return true;
  if (c.id.startsWith('R')) return BGA_CORPS.has(norm(c.name));
  return false;
};

const rows = cards.filter(onBga).map((c) => {
  const ev = evalByNorm.get(norm(c.name)) ?? {};
  return {
    name: c.name,
    type: c.type,
    cost: c.cost ?? 0,
    tags: c.tags ?? [],
    vp: c.victoryPoints ?? null,
    requirements: c.requirements ?? null,
    description: (c.description ?? '').slice(0, 220),
    score: ev.score ?? null,
    when_to_pick: (ev.when_to_pick ?? '').slice(0, 200),
    reasoning: (ev.reasoning ?? '').slice(0, 200),
  };
});

mkdirSync('verification/channels', { recursive: true });
const BATCH = 47;
let n = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  n++;
  writeFileSync(`verification/channels/batch-${n}.json`, JSON.stringify(rows.slice(i, i + BATCH), null, 1), 'utf-8');
}
console.log(`${rows.length} cards -> ${n} batches in verification/channels/`);
