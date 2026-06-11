import { CardEvaluation } from '../types/index.js';
import { clamp } from '../shared/utils.js';

const MAX_GENERATION = 9;

/**
 * Calculate timing modifier based on card's timing bias and current generation.
 *
 * Production cards are worth more early (more generations to pay off).
 * VP cards are worth more late (less time wasted holding them).
 * Temperature/oxygen cards shift value based on remaining track space.
 *
 * Reference: 1 MC-production ≈ 5-6 MC value in gen 1, diminishing by ~1 MC per gen.
 */
export function timingModifier(
  evaluation: CardEvaluation,
  generation: number,
  maxGeneration: number = MAX_GENERATION
): { value: number; reason: string } {
  const gameProgress = clamp((generation - 1) / (maxGeneration - 1), 0, 1);
  const cardTiming = (evaluation.timingBias + 20) / 40; // normalize -20..+20 to 0..1

  // Alignment bonus: early cards in early game, late cards in late game
  const alignment = 1 - Math.abs(gameProgress - cardTiming);

  // Extra penalty: production cards in late game are terrible
  let earlyCardLatePenalty = 0;
  if (cardTiming < 0.3 && gameProgress > 0.6) {
    earlyCardLatePenalty = -10;
  }
  // Extra penalty: late-game VP cards picked too early waste hand space
  let lateCardEarlyPenalty = 0;
  if (cardTiming > 0.7 && gameProgress < 0.3) {
    lateCardEarlyPenalty = -5;
  }

  const value = Math.round(alignment * 15 + earlyCardLatePenalty + lateCardEarlyPenalty);

  let reason = '';
  if (value > 5) reason = 'Good timing for this generation';
  else if (value > 0) reason = 'Decent timing';
  else if (value > -5) reason = 'Slightly off-timing';
  else if (earlyCardLatePenalty < 0) reason = 'Production too late to pay off';
  else if (lateCardEarlyPenalty < 0) reason = 'VP card too early, wastes hand space';
  else reason = 'Bad timing for current generation';

  return { value: clamp(value, -15, 15), reason };
}
