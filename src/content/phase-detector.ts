import { GamePhase } from '../types/index.js';

/**
 * Phases where card ratings are shown.
 *
 * Draft / Buy / CorporationSelect are the pick decisions the advisor exists
 * for; Action keeps ratings on hand cards so "what do I play next?" is
 * covered too. Unknown (nothing rateable rendered) shows nothing.
 */
const RATING_PHASES = new Set([
  GamePhase.Draft,
  GamePhase.Buy,
  GamePhase.Research,
  GamePhase.CorporationSelect,
  GamePhase.Action,
]);

export function shouldShowRatings(phase: GamePhase): boolean {
  return RATING_PHASES.has(phase);
}
