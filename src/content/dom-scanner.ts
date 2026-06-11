import { DetectedCard } from '../types/index.js';
import { getCardById, getCardByName } from '../data/cards.js';

/**
 * BGA Terraforming Mars DOM Scanner
 *
 * Element patterns verified against a live game (2026-06-10, see
 * scripts/bga-live-capture.json):
 *   <div id="card_main_159" class="card main …">      — project card #159
 *   <div id="card_main_P36" class="card main …">      — Prelude-box PROJECT card
 *   <div id="card_main_C05" class="card main …">      — Colonies project card
 *   <div id="card_prelude_P02" class="card …">        — prelude card
 *   <div id="card_corp_3" class="card corp …">        — corporation (BGA numbering!)
 *   <div id="card_main_51_help" …>                    — reference copy (IGNORE)
 *   <div id="card_stanproj_1" …>                      — standard project (IGNORE)
 *   <div id="card_colo_5" …>                          — colony TILE, not a card (IGNORE —
 *                                                       would collide with C## ids)
 *
 * Containers (only the CURRENT player's exist, suffix = color hex):
 *   #hand_area > #hand_{color}   — hand
 *   #hand_area > #draw_{color}   — cards offered to buy / drafted so far
 *   #hand_area > #draft_{color}  — cards offered to draft
 * Played cards live in #tableau_{color} (outside hand_area, not scanned).
 */

/**
 * Parse a BGA card element ID into our internal numeric ID.
 *
 *   card_main_159      → 159        (official card number)
 *   card_main_P36      → 2036       (Prelude-box project cards P36-P42)
 *   card_prelude_P02   → 2002       (prelude cards P01-P35)
 *   card_main_PC01     → 2501       (Prelude 2)
 *   card_main_C05      → 3005       (Colonies project cards)
 *   card_main_X01      → 4001, X-1 → 4101, XC02 → 4502   (promo, unverified)
 *   card_main_T01/TO4  → 5001/5004  (Turmoil, unverified)
 *   card_main_A01      → 6001       (Ares, unverified)
 *   card_main_U001     → 7001       (Underworld, unverified)
 *   card_corp_3        → 1003       (BGA corp numbering — matches DB ids
 *                                    regenerated from the live capture)
 */
function parseElementToCardId(elementId: string): number | null {
  // Skip _help reference cards and standard projects
  if (elementId.includes('_help')) return null;
  if (elementId.includes('stanproj')) return null;

  // card_corp_N → 1000 + N (BGA's own numbering; unknown corps resolve by name)
  const corpMatch = elementId.match(/^card_corp_(\d+)$/);
  if (corpMatch) {
    return 1000 + parseInt(corpMatch[1], 10);
  }

  // card_prelude_PNN → 2000 + N
  const preludeMatch = elementId.match(/^card_prelude_P(\d+)$/);
  if (preludeMatch) {
    return 2000 + parseInt(preludeMatch[1], 10);
  }

  // card_main_XXXX — numeric or prefixed
  const mainMatch = elementId.match(/^card_main_(.+)$/);
  if (!mainMatch) return null;
  const suffix = mainMatch[1];

  // Pure numeric: card_main_159 → 159
  if (/^\d+$/.test(suffix)) {
    return parseInt(suffix, 10);
  }

  // Prelude 2: card_main_PC01 → 2501
  if (/^PC\d+$/.test(suffix)) {
    return 2500 + parseInt(suffix.slice(2), 10);
  }

  // Prelude-box project cards: card_main_P36 → 2036
  if (/^P\d+$/.test(suffix)) {
    return 2000 + parseInt(suffix.slice(1), 10);
  }

  // Colonies project cards: card_main_C05 → 3005
  if (/^C\d+$/.test(suffix)) {
    return 3000 + parseInt(suffix.slice(1), 10);
  }

  // Promo corp: card_main_XC02 → 4502
  if (/^XC\d+$/.test(suffix)) {
    return 4500 + parseInt(suffix.slice(2), 10);
  }

  // Promo: card_main_X01 → 4001
  if (/^X\d+$/.test(suffix)) {
    return 4000 + parseInt(suffix.slice(1), 10);
  }

  // Promo negative: card_main_X-1 → 4101
  if (/^X-\d+$/.test(suffix)) {
    return 4100 + parseInt(suffix.slice(2), 10);
  }

  // Turmoil: card_main_T01 or card_main_TO4 → 5001 / 5004
  if (/^TO?\d+$/.test(suffix)) {
    const numStr = suffix.replace(/^TO?/, '');
    return 5000 + parseInt(numStr, 10);
  }

  // Ares: card_main_A01 → 6001
  if (/^A\d+$/.test(suffix)) {
    return 6000 + parseInt(suffix.slice(1), 10);
  }

  // Underworld: card_main_U001, UX01, UC01, UP01 → 7000 + N
  if (/^U/.test(suffix)) {
    const numStr = suffix.replace(/^U[A-Z]*0*/, '');
    const n = parseInt(numStr, 10);
    return isNaN(n) ? null : 7000 + n;
  }

  return null;
}

/**
 * Relevant containers: the player's hand/draw/draft zones. All of them are
 * children of #hand_area, so accept anything inside it. The id-prefix check
 * additionally covers potential future zones named hand_/draw_/draft_*
 * rendered elsewhere (e.g. corporation select).
 */
const RELEVANT_CONTAINERS = ['draw_', 'hand_', 'draft_'];

function isInRelevantContainer(el: HTMLElement): boolean {
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    if (parent.id) {
      if (parent.id === 'hand_area') return true;
      for (const prefix of RELEVANT_CONTAINERS) {
        if (parent.id.startsWith(prefix)) return true;
      }
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Check if an element is visible on the page.
 */
function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && el.style.position !== 'fixed') return false;
  const style = getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

/**
 * Scan the BGA page for visible card elements in relevant areas.
 *
 * @param bridgeNames element id → card name map from the page bridge
 *                    (gamedatas.token_types); used for name-based resolution.
 */
export function scanForCards(bridgeNames?: Record<string, string>): DetectedCard[] {
  const detected: DetectedCard[] = [];

  // card_colo_* (colony tiles) intentionally NOT selected.
  const cardElements = document.querySelectorAll<HTMLElement>(
    'div.card[id^="card_main_"], div.card[id^="card_corp_"], div.card[id^="card_prelude_"]'
  );

  for (const el of cardElements) {
    if (el.id.includes('_help')) continue;
    if (!isVisible(el)) continue;
    if (!isInRelevantContainer(el)) continue;

    const cardId = parseElementToCardId(el.id);
    if (cardId === null) continue;

    const cardName = bridgeNames?.[el.id] ?? (el.title || null);

    // BGA publishes its own playability data on hand cards
    // (see bga-mars CardHand.ts): discounted cost + prereq validity.
    const costAttr = el.dataset.discount_cost ?? el.dataset.cost;
    const parsedCost = costAttr !== undefined ? parseInt(costAttr, 10) : NaN;
    const effectiveCost = isNaN(parsedCost) ? null : parsedCost;
    const invalidPrereq =
      el.dataset.invalid_prereq !== undefined ? el.dataset.invalid_prereq !== '0' : null;

    detected.push({
      domNode: el,
      cardId,
      spritePosition: null,
      cardName,
      effectiveCost,
      invalidPrereq,
    });
  }

  return detected;
}

/**
 * Resolve a detected card to a known card in our database.
 * Name resolution comes first for corporations (BGA corp numbering is only
 * partially mapped), id resolution first for everything else.
 */
export function resolveCard(detected: DetectedCard) {
  const isCorp = detected.domNode.id.startsWith('card_corp_');

  if (isCorp && detected.cardName) {
    const byName = getCardByName(detected.cardName);
    if (byName) return byName;
  }

  if (detected.cardId !== null) {
    const byId = getCardById(detected.cardId);
    if (byId) return byId;
  }

  if (detected.cardName) {
    const byName = getCardByName(detected.cardName);
    if (byName) return byName;
  }

  return null;
}
