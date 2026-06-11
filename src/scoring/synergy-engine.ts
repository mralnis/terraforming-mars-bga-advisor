import { Card, CardEvaluation, Tag, PlayerState } from '../types/index.js';
import { clamp } from '../shared/utils.js';
import { normalizeName } from '../shared/utils.js';

/**
 * Calculate tag synergy modifier based on player's existing tags.
 */
export function tagSynergyModifier(
  card: Card,
  evaluation: CardEvaluation,
  playerTags: Record<Tag, number>
): { value: number; reason: string } {
  let mod = 0;
  const reasons: string[] = [];

  // Bonus for each relevant tag the player already has
  for (const [tag, weight] of Object.entries(evaluation.tagSynergyWeights)) {
    const count = playerTags[tag as Tag] || 0;
    if (count > 0 && weight > 0) {
      const tagBonus = Math.min(count * weight, 10);
      mod += tagBonus;
      if (tagBonus >= 3) {
        reasons.push(`${count}x ${tag}`);
      }
    }
  }

  // Science set bonus (science tags become more valuable with more science)
  if (card.tags.includes(Tag.Science)) {
    const sciCount = playerTags[Tag.Science] || 0;
    if (sciCount >= 3) {
      mod += 5;
      reasons.push('strong science engine');
    } else if (sciCount >= 1) {
      mod += 2;
    }
  }

  // Jovian multiplicator bonus
  if (card.tags.includes(Tag.Jovian)) {
    const jovCount = playerTags[Tag.Jovian] || 0;
    if (jovCount >= 2) {
      mod += 4;
      reasons.push(`${jovCount} Jovian tags`);
    }
  }

  // Earth tag discount synergy
  if (card.tags.includes(Tag.Earth)) {
    const earthCount = playerTags[Tag.Earth] || 0;
    if (earthCount >= 3) {
      mod += 3;
      reasons.push('Earth tag synergy');
    }
  }

  const value = clamp(mod, -10, 20);
  const reason = reasons.length > 0 ? `Synergy: ${reasons.join(', ')}` : 'No significant tag synergy';

  return { value, reason };
}

/**
 * Calculate played-card synergy modifier.
 * Checks if the player has already played cards that combo with this one.
 */
export function playedCardSynergyModifier(
  evaluation: CardEvaluation,
  playedCards: string[]
): { value: number; reason: string } {
  if (playedCards.length === 0) return { value: 0, reason: 'No played cards yet' };

  const playedSet = new Set(playedCards.map(normalizeName));
  let mod = 0;
  const matchedSynergies: string[] = [];
  const matchedAnti: string[] = [];

  // Check positive synergies
  for (const synName of evaluation.synergies) {
    if (playedSet.has(normalizeName(synName))) {
      mod += 5;
      matchedSynergies.push(synName);
    }
  }

  // Check anti-synergies
  for (const antiName of evaluation.antiSynergies ?? []) {
    if (playedSet.has(normalizeName(antiName))) {
      mod -= 5;
      matchedAnti.push(antiName);
    }
  }

  const value = clamp(mod, -5, 15);
  const parts: string[] = [];
  if (matchedSynergies.length > 0) parts.push(`combos with ${matchedSynergies.join(', ')}`);
  if (matchedAnti.length > 0) parts.push(`conflicts with ${matchedAnti.join(', ')}`);
  const reason = parts.length > 0 ? parts.join('; ') : 'No known synergies in tableau';

  return { value, reason };
}
