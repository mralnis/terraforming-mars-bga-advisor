import { Card, CardEvaluation, GameState, PlayerState, ScoringResult, ScoringModifier, Tag, CardType, GamePhase } from '../types/index.js';
import { clamp } from '../shared/utils.js';
import { getStaticRating } from './static-ratings.js';
import { timingModifier } from './timing-model.js';
import { tagSynergyModifier, playedCardSynergyModifier } from './synergy-engine.js';

/**
 * Compute the full context-aware score for a card.
 *
 * Formula:
 *   contextScore = baseScore + timing + tagSynergy + affordability + playedCardSynergy
 *   Clamped to [0, 100]
 */
export function scoreCard(
  card: Card,
  gameState: GameState,
  playerState: PlayerState
): ScoringResult {
  const evaluation = getStaticRating(card);
  const modifiers: ScoringModifier[] = [];

  // 1. Timing modifier
  const timing = timingModifier(evaluation, gameState.generation);
  modifiers.push({ name: 'Timing', value: timing.value, reason: timing.reason });

  // 2. Tag synergy modifier
  const tagSyn = tagSynergyModifier(card, evaluation, playerState.tags);
  modifiers.push({ name: 'Tag synergy', value: tagSyn.value, reason: tagSyn.reason });

  // 3. Affordability modifier
  const afford = affordabilityModifier(card, playerState, gameState);
  modifiers.push({ name: 'Affordability', value: afford.value, reason: afford.reason });

  // 4. Played-card synergy
  const cardSyn = playedCardSynergyModifier(evaluation, playerState.playedCards);
  modifiers.push({ name: 'Card synergy', value: cardSyn.value, reason: cardSyn.reason });

  // 5. Requirement check
  const req = requirementModifier(card, gameState, playerState);
  modifiers.push({ name: 'Requirements', value: req.value, reason: req.reason });

  // Sum it up
  const totalMod = modifiers.reduce((sum, m) => sum + m.value, 0);
  const contextScore = clamp(evaluation.baseScore + totalMod, 0, 100);

  // Determine tier from context score
  const tier =
    contextScore >= 90 ? 'S' :
    contextScore >= 75 ? 'A' :
    contextScore >= 60 ? 'B' :
    contextScore >= 40 ? 'C' :
    contextScore >= 20 ? 'D' : 'F';

  return {
    cardId: card.id,
    cardName: card.name,
    tier: tier as 'S' | 'A' | 'B' | 'C' | 'D' | 'F',
    baseScore: evaluation.baseScore,
    contextScore,
    modifiers,
  };
}

/**
 * Affordability modifier: can the player actually play this card?
 */
function affordabilityModifier(
  card: Card,
  player: PlayerState,
  gameState: GameState
): { value: number; reason: string } {
  const generation = gameState.generation;

  if (card.type === CardType.Corporation) {
    return { value: 0, reason: 'Corporation' };
  }

  // During corporation select your MC is unknown (depends on the corp you
  // pick), so affordability is meaningless noise.
  if (gameState.phase === GamePhase.CorporationSelect) {
    return { value: 0, reason: 'Setup — MC depends on corporation pick' };
  }

  // Prefer BGA's own computed cost (includes corp/card discounts), otherwise
  // estimate with steel/titanium payments.
  const exactCost = player.effectiveCosts?.[card.id];

  let discount = 0;
  if (card.tags.includes(Tag.Building)) {
    discount += player.steel * 2;
  }
  if (card.tags.includes(Tag.Space)) {
    discount += player.titanium * 3;
  }

  const effectiveCost =
    exactCost !== undefined
      ? Math.max(0, exactCost - discount)
      : Math.max(0, card.cost - discount);
  const canAfford = player.mc >= effectiveCost;

  if (!canAfford) {
    if (generation <= 2) {
      return { value: -5, reason: `Can't afford now (${effectiveCost}MC), but early game` };
    }
    if (generation <= 5) {
      return { value: -10, reason: `Can't afford (need ${effectiveCost}MC, have ${player.mc}MC)` };
    }
    return { value: -20, reason: `Can't afford late game (${effectiveCost}MC)` };
  }

  // Efficiency bonus for cheap cards
  if (effectiveCost <= 8 && card.type !== CardType.Event) {
    return { value: 3, reason: 'Cheap and efficient' };
  }
  if (discount >= 6) {
    return { value: 5, reason: `Good discount from steel/titanium (-${discount}MC)` };
  }

  return { value: 0, reason: 'Affordable' };
}

/**
 * Requirement modifier: penalize cards whose requirements aren't met or are close.
 */
function requirementModifier(
  card: Card,
  gameState: GameState,
  _playerState: PlayerState
): { value: number; reason: string } {
  // BGA's own prereq validation (from data-invalid_prereq) means "playable
  // RIGHT NOW" — authoritative during the action phase (it knows requirement
  // modifiers like Adaptation Technology), but wrong for pick decisions:
  // a 3-ocean card is a fine draft in gen 1. Outside Action, use the local
  // distance-based estimate instead.
  const bgaVerdict =
    gameState.phase === GamePhase.Action
      ? _playerState.bgaInvalidPrereq?.[card.id]
      : undefined;
  if (bgaVerdict === true) {
    return { value: -30, reason: 'Requirements not met right now (BGA check)' };
  }

  if (!card.requirements || card.requirements.length === 0) {
    return { value: 0, reason: 'No requirements' };
  }

  if (bgaVerdict === false) {
    return { value: 2, reason: 'All requirements met (BGA check)' };
  }

  for (const req of card.requirements) {
    let currentValue: number;
    switch (req.type) {
      case 'temperature': currentValue = gameState.temperature; break;
      case 'oxygen': currentValue = gameState.oxygen; break;
      case 'ocean': currentValue = gameState.oceansPlaced; break;
      case 'venus': currentValue = gameState.venusScale ?? 0; break;
      case 'tr': currentValue = _playerState.terraformRating; break;
      default: continue;
    }

    if (req.isMax) {
      // Max requirement: current must be <= value
      if (currentValue > req.value) {
        return { value: -30, reason: `Requirement not met (${req.type} max ${req.value}, currently ${currentValue})` };
      }
    } else {
      // Min requirement: current must be >= value
      if (currentValue < req.value) {
        const gap = req.value - currentValue;
        if (gap <= 2) {
          return { value: -3, reason: `Almost meets ${req.type} requirement (need ${req.value}, at ${currentValue})` };
        }
        return { value: -15, reason: `${req.type} requirement not met (need ${req.value}, at ${currentValue})` };
      }
    }
  }

  return { value: 2, reason: 'All requirements met' };
}

/**
 * Score multiple cards at once.
 */
export function scoreCards(
  cards: Card[],
  gameState: GameState,
  playerState: PlayerState
): ScoringResult[] {
  return cards
    .map((card) => scoreCard(card, gameState, playerState))
    .sort((a, b) => b.contextScore - a.contextScore);
}
