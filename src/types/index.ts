// ---- Tags ----
export enum Tag {
  Building = 'building',
  Space = 'space',
  Science = 'science',
  Power = 'power',
  Earth = 'earth',
  Jovian = 'jovian',
  Plant = 'plant',
  Microbe = 'microbe',
  Animal = 'animal',
  City = 'city',
  Event = 'event',
  Venus = 'venus',
  Moon = 'moon',
  Mars = 'mars',
  Wild = 'wild',
}

// ---- Card types ----
export enum CardType {
  Automated = 'automated',
  Active = 'active',
  Event = 'event',
  Corporation = 'corporation',
  Prelude = 'prelude',
  CEO = 'ceo',
}

// ---- Expansions ----
export enum Expansion {
  Base = 'base',
  CorporateEra = 'corporate_era',
  Prelude = 'prelude',
  Venus = 'venus',
  Colonies = 'colonies',
  Turmoil = 'turmoil',
  Promo = 'promo',
  Ares = 'ares',
  Moon = 'moon',
  Pathfinders = 'pathfinders',
  Community = 'community',
}

// ---- Resource types ----
export enum ResourceType {
  Microbe = 'microbe',
  Animal = 'animal',
  Floater = 'floater',
  Fighter = 'fighter',
  Science = 'science',
  Camp = 'camp',
  Disease = 'disease',
  Preservation = 'preservation',
  Data = 'data',
}

// ---- Tier ----
export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

// ---- Requirement ----
export interface Requirement {
  type: 'temperature' | 'oxygen' | 'ocean' | 'tag' | 'production' | 'venus' | 'tr';
  value: number;
  isMax?: boolean;
  tagType?: Tag;
}

// ---- Production delta ----
export interface ProductionDelta {
  mc?: number;
  steel?: number;
  titanium?: number;
  energy?: number;
  heat?: number;
  plants?: number;
}

// ---- VP formula for variable VP cards ----
export interface VPFormula {
  per: number; // VP per N resources/tags
  resourceType?: ResourceType;
  tagType?: Tag;
}

// ---- Card ----
export interface Card {
  id: number;
  name: string;
  cost: number;
  type: CardType;
  tags: Tag[];
  expansion: Expansion;
  requirements?: Requirement[];
  victoryPoints?: number | VPFormula;
  resourceType?: ResourceType;
  hasAction: boolean;
  production?: ProductionDelta;
  terraformingEffect?: {
    tr?: number;
    oxygen?: number;
    temperature?: number;
    ocean?: number;
    venus?: number;
  };
}

// ---- Card evaluation (static rating) ----
export interface CardEvaluation {
  cardId: number;
  name: string;
  tier: Tier;
  baseScore: number; // 0-100
  reasoning: string;
  synergies: string[];
  antiSynergies?: string[];
  timingBias: number; // -20 (early) to +20 (late)
  tagSynergyWeights: Partial<Record<Tag, number>>;
}

// ---- Game state (scraped from BGA DOM) ----
export enum GamePhase {
  CorporationSelect = 'corporation_select',
  Draft = 'draft',
  Research = 'research',
  Buy = 'buy',
  Action = 'action',
  Production = 'production',
  Unknown = 'unknown',
}

export interface GameState {
  generation: number;
  phase: GamePhase;
  temperature: number;
  oxygen: number;
  oceansPlaced: number;
  venusScale?: number;
}

export interface PlayerState {
  corporation: string | null;
  mc: number;
  mcProduction: number;
  steel: number;
  steelProduction: number;
  titanium: number;
  titaniumProduction: number;
  energy: number;
  energyProduction: number;
  heat: number;
  heatProduction: number;
  plants: number;
  plantProduction: number;
  terraformRating: number;
  tags: Record<Tag, number>;
  playedCards: string[];
  cities: number;
  greeneries: number;
  /** Exact effective costs (after corp/card discounts) by internal card id,
   *  sourced from BGA's own data-discount_cost / card_info. */
  effectiveCosts?: Record<number, number>;
  /** BGA's own requirement validation by internal card id (true = not met). */
  bgaInvalidPrereq?: Record<number, boolean>;
}

// ---- Scoring result ----
export interface ScoringResult {
  cardId: number;
  cardName: string;
  tier: Tier;
  baseScore: number;
  contextScore: number;
  modifiers: ScoringModifier[];
}

export interface ScoringModifier {
  name: string;
  value: number;
  reason: string;
}

// ---- Card element detected in BGA DOM ----
export interface DetectedCard {
  domNode: HTMLElement;
  cardId: number | null;
  spritePosition: [number, number] | null;
  cardName: string | null;
  /** BGA's own discounted cost from data-discount_cost / data-cost. */
  effectiveCost: number | null;
  /** BGA's own requirement validation from data-invalid_prereq (hand cards). */
  invalidPrereq: boolean | null;
}

// ---- Snapshot published by the MAIN-world page bridge ----
// Content scripts run in an isolated world and cannot see window.gameui;
// the bridge script (world: MAIN) serializes the relevant slice of
// gameui.gamedatas into a DOM attribute that we parse here.
export interface BridgeState {
  v: number;
  playerId: string | null;
  /** Current player's color hex (e.g. "ff0000") — used as tracker/container suffix. */
  myColor: string | null;
  /** BGA gamestate name. NOTE: TM uses generic names (multiplayerChoice,
   *  playerTurnChoice, …) — never phase-specific ones. */
  gamestate: string | null;
  gamestateType: string | null;
  /** Card element id → card display name, from gamedatas.token_types. */
  names: Record<string, string>;
  /** Card element id → effective (discounted) cost, from gamedatas.card_info. */
  costs: Record<string, number>;
}

// ---- Extension preferences ----
export interface Preferences {
  enabled: boolean;
  showBadges: boolean;
  dimLowTier: boolean;
  minTierToShow: Tier;
  showTooltips: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  enabled: true,
  showBadges: true,
  dimLowTier: true,
  minTierToShow: 'F',
  showTooltips: true,
};
