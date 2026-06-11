import { Tier } from '../types/index.js';
import { TIER_ORDER } from './constants.js';

/**
 * Normalize a card name for lookup: lowercase, punctuation → space (so
 * "Nitrogen-Rich" ≡ "Nitrogen Rich"), collapse whitespace to underscores.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert a numeric score (0-100) to a tier letter.
 */
export function scoreToTier(score: number): Tier {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

/**
 * Check if a tier meets the minimum threshold.
 */
export function tierMeetsMinimum(tier: Tier, minTier: Tier): boolean {
  return (TIER_ORDER[tier] ?? 5) <= (TIER_ORDER[minTier] ?? 5);
}

/**
 * Simple fuzzy match: checks if all words in the query appear in the target.
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const queryWords = normalizeName(query).split('_');
  const normalizedTarget = normalizeName(target);
  return queryWords.every((w) => normalizedTarget.includes(w));
}

/**
 * Parse a CSS background-position value into [x, y] pixel offsets.
 */
export function parseBackgroundPosition(style: string): [number, number] | null {
  const match = style.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px/);
  if (!match) return null;
  return [Math.abs(parseFloat(match[1])), Math.abs(parseFloat(match[2]))];
}
