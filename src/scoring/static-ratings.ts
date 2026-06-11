import { Card, CardEvaluation } from '../types/index.js';
import { getEvaluation } from '../data/cards.js';

/**
 * Get the static (non-contextual) evaluation for a card.
 * Uses expert ratings when available, otherwise auto-evaluates.
 */
export function getStaticRating(card: Card): CardEvaluation {
  return getEvaluation(card);
}
