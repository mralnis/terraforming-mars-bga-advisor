// BGA DOM selectors — verified against live BGA Terraforming Mars games.

export const BGA_SELECTORS = {
  // Card elements
  card: 'div.card[id^="card_"]',
  cardMain: 'div.card[id^="card_main_"]',
  cardCorp: 'div.card[id^="card_corp_"]',
  cardPrelude: 'div.card[id^="card_prelude_"]',
  cardColo: 'div.card[id^="card_colo_"]',

  // Containers — {playerId} is a hex color like 008000
  drawArea: '[id^="draw_"]',      // cards offered for selection
  handArea: '[id^="hand_"]',      // player's hand
  draftArea: '[id^="draft_"]',    // draft picks

  // Standard projects (ignore for ratings)
  standardProjects: '#display_main',

  // Game area
  gamePlayArea: '#game_play_area',

  // Game log
  gameLog: '#logs',
} as const;

// Prefix for all injected DOM elements
export const OVERLAY_PREFIX = 'tm-advisor';

// Tier order for filtering
export const TIER_ORDER: Record<string, number> = {
  S: 0,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  F: 5,
};

// Tier colors
export const TIER_COLORS: Record<string, string> = {
  S: '#d4a017',
  A: '#2e7d32',
  B: '#1565c0',
  C: '#f9a825',
  D: '#e65100',
  F: '#b71c1c',
};
