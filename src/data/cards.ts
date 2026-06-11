import { Card, CardEvaluation, Tier, Tag } from '../types/index.js';
import { normalizeName } from '../shared/utils.js';
import { ALL_CARDS, EVALUATIONS } from './cards-generated.js';

// ===== LOOKUP MAPS =====

/**
 * BGA display name → all_cards.json name, for the few cards where the
 * spellings differ (keys/values in normalizeName() form).
 * Verified against gamedatas.token_types in a live game.
 */
const NAME_ALIASES: Record<string, string> = {
  // keys/values are in normalizeName() form (punctuation becomes '_')
  ceo_s_favourite_project: 'ceo_s_favorite_project',
  biolabs: 'biolab',
  excentric_sponsor: 'eccentric_sponsor',
  beginner_corp: 'beginner_corporation',
  stormcraft: 'stormcraft_incorporated',
};

const cardById = new Map<number, Card>();
const cardByName = new Map<string, Card>();
const evalById = new Map<number, CardEvaluation>();
const evalByName = new Map<string, CardEvaluation>();

function initMaps() {
  for (const card of ALL_CARDS) {
    cardById.set(card.id, card);
    cardByName.set(normalizeName(card.name), card);
  }
  for (const ev of EVALUATIONS) {
    evalById.set(ev.cardId, ev);
    evalByName.set(normalizeName(ev.name), ev);
  }
}
initMaps();

// ===== PUBLIC API =====

export function getCardById(id: number): Card | undefined {
  return cardById.get(id);
}

export function getCardByName(name: string): Card | undefined {
  const norm = normalizeName(name);
  return cardByName.get(norm) ?? cardByName.get(NAME_ALIASES[norm] ?? '');
}

export function getEvaluationById(id: number): CardEvaluation | undefined {
  return evalById.get(id);
}

export function getEvaluationByName(name: string): CardEvaluation | undefined {
  return evalByName.get(normalizeName(name));
}

export function getAllCards(): Card[] {
  return ALL_CARDS;
}

export function getAllEvaluations(): CardEvaluation[] {
  return EVALUATIONS;
}

/**
 * Auto-generate a basic evaluation for cards without expert ratings.
 */
export function autoEvaluate(card: Card): CardEvaluation {
  let score = 50;

  if (typeof card.victoryPoints === 'number') score += card.victoryPoints * 4;

  if (card.tags.length > 0) score += card.tags.length * 2;
  if (card.hasAction) score += 5;
  if (card.cost > 20) score -= 5;
  if (card.cost > 30) score -= 5;

  score = Math.max(10, Math.min(95, score));

  const tier: Tier =
    score >= 90 ? 'S' :
    score >= 75 ? 'A' :
    score >= 60 ? 'B' :
    score >= 40 ? 'C' :
    score >= 20 ? 'D' : 'F';

  return {
    cardId: card.id,
    name: card.name,
    tier,
    baseScore: score,
    reasoning: 'Auto-evaluated',
    synergies: [],
    timingBias: 0,
    tagSynergyWeights: {},
  };
}

/**
 * Get evaluation for a card — expert rating if available, otherwise auto-evaluate.
 */
export function getEvaluation(card: Card): CardEvaluation {
  return evalById.get(card.id) ?? autoEvaluate(card);
}
