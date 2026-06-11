/**
 * Converter script: compiles all_cards.json + evaluations.json into src/data/cards-generated.ts
 *
 * BGA ID mapping (verified live against table 866119536, see scripts/bga-live-capture.json):
 *   card_main_159    → tm-advisor id "159" (zero-padded "159")  → internal id 159
 *   card_main_P36    → tm-advisor id "P36" (Prelude PROJECT)    → internal id 2036
 *   card_main_C05    → tm-advisor id "C05" (Colonies project)   → internal id 3005
 *   card_prelude_P02 → tm-advisor id "P02" (prelude card)       → internal id 2002
 *   card_corp_{N}    → BGA's OWN corp numbering (≠ R-numbers!)  → internal id 1000 + N
 *   card_colo_{N}    → colony TILES (Europa…), NOT cards — excluded from scanning
 */

import { readFileSync, writeFileSync } from 'fs';

const allCards = JSON.parse(readFileSync('all_cards.json', 'utf-8'));
const evaluations = JSON.parse(readFileSync('evaluations.json', 'utf-8'));

/**
 * BGA corp number → corporation name, dumped from gameui.gamedatas.token_types
 * in a live game (2026-06-10). tm-advisor R-numbers DO NOT match BGA numbers
 * (e.g. CrediCor is R08 locally but card_corp_2 on BGA), so corps are mapped
 * by normalized NAME. Corps not listed here (Venus 14-18?, Turmoil 29+ — modules
 * not yet live on BGA) get provisional ids ≥ 1800 and resolve by name at runtime.
 */
const BGA_CORP_NUMBERS = {
  'beginner corporation': 1, // BGA name: "Beginner Corp"
  'credicor': 2,
  'ecoline': 3,
  'helion': 4,
  'interplanetary cinematics': 5,
  'inventrix': 6,
  'mining guild': 7,
  'saturn systems': 8,
  'phobolog': 9,
  'teractor': 10,
  'tharsis republic': 11,
  'thorgate': 12,
  'united nations mars initiative': 13,
  'point luna': 19,
  'robinson industries': 20,
  'cheung shing mars': 21,
  'valley trust': 22,
  'vitor': 23,
  'aridor': 24,
  'arklight': 25,
  'polyphemos': 26,
  'poseidon': 27,
  'stormcraft incorporated': 28, // BGA name: "Stormcraft"
};

const normName = (n) => n.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

// Tag mapping
const TAG_MAP = {
  'Building': 'Tag.Building',
  'Space': 'Tag.Space',
  'Science': 'Tag.Science',
  'Power': 'Tag.Power',
  'Energy': 'Tag.Power',
  'Earth': 'Tag.Earth',
  'Jovian': 'Tag.Jovian',
  'Plant': 'Tag.Plant',
  'Microbe': 'Tag.Microbe',
  'Animal': 'Tag.Animal',
  'City': 'Tag.City',
  'Event': 'Tag.Event',
  'Venus': 'Tag.Venus',
  'Moon': 'Tag.Moon',
  'Mars': 'Tag.Mars',
  'Wild': 'Tag.Wild',
};

// Card type mapping
const TYPE_MAP = {
  'automated': 'CardType.Automated',
  'active': 'CardType.Active',
  'event': 'CardType.Event',
  'corporation': 'CardType.Corporation',
  'prelude': 'CardType.Prelude',
};

// Expansion mapping
const EXPANSION_MAP = {
  'base': 'Expansion.Base',
  'corpera': 'Expansion.CorporateEra',
  'promo': 'Expansion.Promo',
  'venus': 'Expansion.Venus',
  'colonies': 'Expansion.Colonies',
  'prelude': 'Expansion.Prelude',
  'prelude2': 'Expansion.Prelude',
  'turmoil': 'Expansion.Turmoil',
  'ares': 'Expansion.Ares',
  'underworld': 'Expansion.Community',
};

/**
 * Convert tm-advisor string ID to our BGA-compatible numeric ID.
 * BGA uses:
 *   card_main_N  for numeric IDs (base, corpera, venus, promo project cards)
 *   card_corp_N  for corporation IDs where N maps to R{N} in tm-advisor
 *   card_prelude_P{N} for preludes
 *   card_colo_{N} for colonies? (need verification)
 */
let provisionalCorpSeq = 0;

function tmIdToBgaId(tmId, type, name) {
  // Pure numeric: "153", "048" → BGA card_main_153
  if (/^\d+$/.test(tmId)) {
    return parseInt(tmId, 10);
  }

  // Corporation: map by NAME to the verified BGA corp number.
  // Unverified corps get a provisional id (1800+) — resolvable by name only.
  if (tmId.startsWith('R')) {
    const bgaNum = BGA_CORP_NUMBERS[normName(name)];
    if (bgaNum !== undefined) return 1000 + bgaNum;
    provisionalCorpSeq += 1;
    return 1800 + provisionalCorpSeq;
  }

  // Prelude: "P13" → BGA card_prelude_P13
  if (/^P\d+$/.test(tmId)) {
    const num = parseInt(tmId.slice(1), 10);
    return isNaN(num) ? null : 2000 + num;
  }

  // Prelude 2: "PC01"
  if (tmId.startsWith('PC')) {
    const num = parseInt(tmId.slice(2), 10);
    return isNaN(num) ? null : 2500 + num;
  }

  // Colonies project cards: "C01" → BGA card_main_C01 (verified live)
  if (/^C\d+$/.test(tmId)) {
    const num = parseInt(tmId.slice(1), 10);
    return isNaN(num) ? null : 3000 + num;
  }

  // Venus/Promo project cards with X prefix: "X01"
  if (/^X\d+$/.test(tmId)) {
    const num = parseInt(tmId.slice(1), 10);
    return isNaN(num) ? null : 4000 + num;
  }

  // Promo corps: "XC02"
  if (tmId.startsWith('XC')) {
    const num = parseInt(tmId.slice(2), 10);
    return isNaN(num) ? null : 4500 + num;
  }

  // Turmoil: "T01"
  if (/^T\d+$/.test(tmId) || tmId.startsWith('TO')) {
    const numStr = tmId.replace(/^TO?/, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? null : 5000 + num;
  }

  // Ares: "A01"
  if (/^A\d+$/.test(tmId)) {
    const num = parseInt(tmId.slice(1), 10);
    return isNaN(num) ? null : 6000 + num;
  }

  // Underworld: "U001", "UX01", "UC01", "UP01"
  if (tmId.startsWith('U')) {
    const numStr = tmId.replace(/^U[A-Z]*/, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? null : 7000 + num;
  }

  // Promo negative: "X-1"
  if (tmId.startsWith('X-')) {
    const num = parseInt(tmId.slice(2), 10);
    return isNaN(num) ? null : 4100 + num;
  }

  return null;
}

function formatTags(tags) {
  if (!tags || tags.length === 0) return '[]';
  const mapped = tags.map(t => TAG_MAP[t] || null).filter(Boolean);
  return `[${mapped.join(', ')}]`;
}

// Build the card entries
const cardEntries = [];
const bgaIdMap = new Map(); // bgaId -> tmId for corp mapping

for (const card of allCards) {
  const bgaId = tmIdToBgaId(card.id, card.type, card.name);
  if (bgaId === null) {
    console.warn(`Skipping card with unmappable ID: ${card.id} - ${card.name}`);
    continue;
  }

  const type = TYPE_MAP[card.type] || 'CardType.Automated';
  const expansion = EXPANSION_MAP[card.module] || 'Expansion.Base';
  const tags = formatTags(card.tags);
  const hasAction = card.hasAction ? 'true' : 'false';

  let vp = '';
  if (card.victoryPoints) {
    const vpNum = parseInt(card.victoryPoints, 10);
    if (!isNaN(vpNum)) {
      vp = `, victoryPoints: ${vpNum}`;
    }
  }

  const name = card.name.replace(/'/g, "\\'");

  cardEntries.push(
    `  { id: ${bgaId}, name: '${name}', cost: ${card.cost || 0}, type: ${type}, tags: ${tags}, expansion: ${expansion}, hasAction: ${hasAction}${vp} },`
  );

  bgaIdMap.set(bgaId, card);
}

// Build evaluation entries
const evalEntries = [];

for (const [name, ev] of Object.entries(evaluations)) {
  // Find the card by name
  const card = allCards.find(c => c.name === name);
  if (!card) continue;

  const bgaId = tmIdToBgaId(card.id, card.type, card.name);
  if (bgaId === null) continue;

  const tier = ev.tier || 'C';
  const score = ev.score || 50;
  const synergies = (ev.synergies || []).map(s => `'${s.replace(/'/g, "\\'")}'`);
  const cleanName = name.replace(/'/g, "\\'");

  // Derive timing bias from card type and evaluation text…
  let timingBias = 0;
  if (card.type === 'event') timingBias = -5;
  if (ev.when_to_pick && typeof ev.when_to_pick === 'string') {
    const wp = ev.when_to_pick.toLowerCase();
    if (wp.includes('early') || wp.includes('ранн')) timingBias = -10;
    if (wp.includes('late') || wp.includes('поздн')) timingBias = 10;
    if (wp.includes('mid') || wp.includes('средн')) timingBias = 0;
  }
  // …but an explicit curated value always wins (added 2026-06-10).
  if (typeof ev.timing_bias === 'number') timingBias = Math.max(-20, Math.min(20, ev.timing_bias));

  // Explicit per-card tag synergy weights (keys = internal Tag enum values).
  const VALID_TAG_KEYS = new Set(['building', 'space', 'science', 'power', 'earth', 'jovian', 'plant', 'microbe', 'animal', 'city', 'event', 'venus', 'wild']);
  let tswLiteral = '{}';
  if (ev.tag_synergy_weights && typeof ev.tag_synergy_weights === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(ev.tag_synergy_weights)) {
      if (VALID_TAG_KEYS.has(k) && typeof v === 'number' && v >= 1 && v <= 3) clean[k] = v;
    }
    if (Object.keys(clean).length > 0) tswLiteral = JSON.stringify(clean).replace(/"/g, '');
  }

  evalEntries.push(
    `  { cardId: ${bgaId}, name: '${cleanName}', tier: '${tier}', baseScore: ${score}, reasoning: '', synergies: [${synergies.join(', ')}], timingBias: ${timingBias}, tagSynergyWeights: ${tswLiteral} },`
  );
}

// Corp mapping reference comment (BGA numbering, verified live where known)
const corpMappings = [];
for (const card of allCards) {
  if (card.id.startsWith('R')) {
    const bgaNum = BGA_CORP_NUMBERS[normName(card.name)];
    corpMappings.push(
      bgaNum !== undefined
        ? `  // card_corp_${bgaNum} = ${card.name} (tm-advisor: ${card.id}) -> internal: ${1000 + bgaNum}`
        : `  // UNVERIFIED on BGA: ${card.name} (tm-advisor: ${card.id}) -> provisional id, name-resolution only`
    );
  }
}

// Generate TypeScript file
const output = `// AUTO-GENERATED by scripts/build-cards.mjs — do not edit manually
// Source: tm-advisor all_cards.json (${allCards.length} cards) + evaluations.json (${Object.keys(evaluations).length} evaluations)

import { Card, CardType, Tag, Expansion, CardEvaluation } from '../types/index.js';

export const ALL_CARDS: Card[] = [
${cardEntries.join('\n')}
];

export const EVALUATIONS: CardEvaluation[] = [
${evalEntries.join('\n')}
];

// Corporation BGA ID mapping reference:
${corpMappings.join('\n')}
`;

writeFileSync('src/data/cards-generated.ts', output, 'utf-8');
console.log(`Generated ${cardEntries.length} cards and ${evalEntries.length} evaluations`);
