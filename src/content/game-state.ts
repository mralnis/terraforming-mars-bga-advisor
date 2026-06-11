import { GameState, PlayerState, GamePhase, Tag, BridgeState } from '../types/index.js';
import { getCardById, getCardByName } from '../data/cards.js';

/**
 * BGA Terraforming Mars game state scraper.
 *
 * Tracker pattern verified live (values in data-state attributes):
 *   Global: tracker_gen (generation), tracker_o (oxygen %),
 *           tracker_t (temperature °C), tracker_w (oceans placed)
 *   Per player (suffix = color hex, e.g. _ff0000):
 *     tracker_m  / tracker_pm   MC / MC production
 *     tracker_s  / tracker_ps   steel / production
 *     tracker_u  / tracker_pu   titanium / production
 *     tracker_p  / tracker_pp   plants / production
 *     tracker_e  / tracker_pe   energy / production
 *     tracker_h  / tracker_ph   heat / production
 *     tracker_tr                terraform rating
 *     tracker_tagBuilding, tagSpace, tagScience, tagEnergy, tagEarth,
 *       tagJovian, tagCity, tagPlant, tagMicrobe, tagAnimal, tagWild, tagEvent
 *     tracker_city, tracker_forest
 *
 * The gamestate NAMES are generic (multiplayerChoice, playerTurnChoice, …) —
 * phases are detected from what's actually rendered in the hand area.
 */

function readTracker(id: string, fallback = 0): number {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const state = el.dataset.state;
  if (state === undefined) return fallback;
  const n = parseInt(state, 10);
  return isNaN(n) ? fallback : n;
}

function readTrackerOptional(id: string): number | undefined {
  const el = document.getElementById(id);
  if (!el || el.dataset.state === undefined) return undefined;
  const n = parseInt(el.dataset.state, 10);
  return isNaN(n) ? undefined : n;
}

/**
 * The current player's color hex (tracker/container suffix).
 * Bridge data is authoritative; the DOM fallback exploits the fact that
 * hand_/draw_/draft_ containers exist ONLY for the current player.
 */
export function getCurrentPlayerColor(bridge?: BridgeState | null): string | null {
  if (bridge?.myColor) return bridge.myColor;

  // hand_area also contains hand_area_buttons etc. — regex-filter to the
  // color-suffixed container.
  for (const el of document.querySelectorAll('#hand_area [id^="hand_"]')) {
    const match = el.id.match(/^hand_([0-9a-f]{6})$/i);
    if (match) return match[1];
  }

  // Last resort: any money tracker (first one is usually the viewing player)
  const tracker = document.querySelector('[id^="tracker_m_"]');
  if (tracker) {
    const match = tracker.id.match(/_([0-9a-f]{6})$/i);
    if (match) return match[1];
  }

  return null;
}

/**
 * Scrape the global game state.
 */
export function scrapeGameState(bridge?: BridgeState | null): GameState {
  return {
    generation: readTracker('tracker_gen', 1),
    phase: detectPhase(bridge),
    temperature: readTracker('tracker_t', -30),
    oxygen: readTracker('tracker_o', 0),
    oceansPlaced: readTracker('tracker_w', 0),
    // Venus module isn't live on BGA yet; probe the likely tracker ids so the
    // requirement checks start working the day it ships.
    venusScale: readTrackerOptional('tracker_v') ?? readTrackerOptional('tracker_venus'),
  };
}

/**
 * Scrape the current player's state.
 */
export function scrapePlayerState(bridge?: BridgeState | null): PlayerState {
  const color = getCurrentPlayerColor(bridge);
  if (!color) {
    return emptyPlayerState();
  }

  const t = (suffix: string) => readTracker(`tracker_${suffix}_${color}`);

  const tagMap: Array<[Tag, string]> = [
    [Tag.Building, 'tagBuilding'],
    [Tag.Space, 'tagSpace'],
    [Tag.Science, 'tagScience'],
    [Tag.Power, 'tagEnergy'],
    [Tag.Earth, 'tagEarth'],
    [Tag.Jovian, 'tagJovian'],
    [Tag.City, 'tagCity'],
    [Tag.Plant, 'tagPlant'],
    [Tag.Microbe, 'tagMicrobe'],
    [Tag.Animal, 'tagAnimal'],
    [Tag.Wild, 'tagWild'],
    [Tag.Event, 'tagEvent'],
    [Tag.Venus, 'tagVenus'],
  ];

  const tags = {} as Record<Tag, number>;
  for (const tag of Object.values(Tag)) tags[tag] = 0;
  for (const [tag, trackerName] of tagMap) {
    tags[tag] = t(trackerName);
  }

  const { playedCards, corporation } = scrapeTableau(color, bridge);

  return {
    corporation,
    mc: t('m'),
    mcProduction: t('pm'),
    steel: t('s'),
    steelProduction: t('ps'),
    titanium: t('u'),
    titaniumProduction: t('pu'),
    energy: t('e'),
    energyProduction: t('pe'),
    heat: t('h'),
    heatProduction: t('ph'),
    plants: t('p'),
    plantProduction: t('pp'),
    terraformRating: t('tr'),
    tags,
    playedCards,
    cities: t('city'),
    greeneries: t('forest'),
  };
}

/**
 * Read the player's tableau: corporation name + played card names
 * (feeds the played-card synergy engine).
 */
function scrapeTableau(
  color: string,
  bridge?: BridgeState | null
): { playedCards: string[]; corporation: string | null } {
  const playedCards: string[] = [];
  let corporation: string | null = null;

  const tableau = document.getElementById(`tableau_${color}`);
  if (!tableau) return { playedCards, corporation };

  const resolveName = (elementId: string): string | null => {
    const fromBridge = bridge?.names?.[elementId];
    if (fromBridge) {
      // Canonicalize BGA spelling to our DB spelling so synergy lists match
      return getCardByName(fromBridge)?.name ?? fromBridge;
    }
    const internalId = elementIdToInternalId(elementId);
    if (internalId !== null) return getCardById(internalId)?.name ?? null;
    return null;
  };

  for (const el of tableau.querySelectorAll<HTMLElement>('[id^="card_"]')) {
    if (el.id.includes('_help')) continue;
    if (el.id.startsWith('card_corp_')) {
      corporation = resolveName(el.id) ?? corporation;
    } else if (el.id.startsWith('card_main_') || el.id.startsWith('card_prelude_')) {
      const name = resolveName(el.id);
      if (name) playedCards.push(name);
    }
  }

  return { playedCards, corporation };
}

/** Minimal element-id → internal-id mapping for tableau resolution. */
function elementIdToInternalId(elementId: string): number | null {
  const corp = elementId.match(/^card_corp_(\d+)$/);
  if (corp) return 1000 + parseInt(corp[1], 10);
  const prelude = elementId.match(/^card_prelude_P(\d+)$/);
  if (prelude) return 2000 + parseInt(prelude[1], 10);
  const main = elementId.match(/^card_main_(\d+)$/);
  if (main) return parseInt(main[1], 10);
  const coloniesProject = elementId.match(/^card_main_C(\d+)$/);
  if (coloniesProject) return 3000 + parseInt(coloniesProject[1], 10);
  const preludeProject = elementId.match(/^card_main_P(\d+)$/);
  if (preludeProject) return 2000 + parseInt(preludeProject[1], 10);
  return null;
}

function emptyPlayerState(): PlayerState {
  const tags = {} as Record<Tag, number>;
  for (const tag of Object.values(Tag)) tags[tag] = 0;
  return {
    corporation: null,
    mc: 0, mcProduction: 0,
    steel: 0, steelProduction: 0,
    titanium: 0, titaniumProduction: 0,
    energy: 0, energyProduction: 0,
    heat: 0, heatProduction: 0,
    plants: 0, plantProduction: 0,
    terraformRating: 20,
    tags,
    playedCards: [],
    cities: 0,
    greeneries: 0,
  };
}

/**
 * Map of BGA main-operation types (body[data-maop], set by the game client —
 * see github.com/elaskavaia/bga-mars GameXBody.ts) to phases.
 */
const MAOP_PHASES: Record<string, GamePhase> = {
  setuppick: GamePhase.CorporationSelect, // corp + initial cards selection
  keepcorp: GamePhase.CorporationSelect,
  draft: GamePhase.Draft,
  passdraft: GamePhase.Draft,
  buycard: GamePhase.Buy,
  keep: GamePhase.Buy,
  research: GamePhase.Buy,
  prediscard: GamePhase.Buy,
  prelude: GamePhase.Action, // choose/play preludes
  card: GamePhase.Action,
  activate: GamePhase.Action,
  turn: GamePhase.Action,
  stan: GamePhase.Action,
};

/**
 * Detect the current game phase.
 *
 * BGA TM's state machine is generic (multiplayerChoice / playerTurnChoice /
 * playerConfirm…) so gamestate names carry no phase info. Two honest signals,
 * both isolated-world-safe:
 *   1. body[data-maop] — the current main operation type
 *   2. contents of the player's hand/draw/draft zones
 */
function detectPhase(bridge?: BridgeState | null): GamePhase {
  const maop = document.body?.dataset.maop;
  if (maop && MAOP_PHASES[maop]) return MAOP_PHASES[maop];

  const visible = (el: Element | null): boolean =>
    el instanceof HTMLElement && el.offsetParent !== null;

  const color = getCurrentPlayerColor(bridge);
  const zone = (prefix: string): HTMLElement | null => {
    if (color) return document.getElementById(`${prefix}_${color}`);
    for (const el of document.querySelectorAll<HTMLElement>(`#hand_area [id^="${prefix}_"]`)) {
      if (new RegExp(`^${prefix}_[0-9a-f]{6}$`, 'i').test(el.id)) return el;
    }
    return null;
  };

  // Corporation select: corp cards offered in any hand-area zone
  const offeredCorp = document.querySelector('#hand_area [id^="card_corp_"]');
  if (visible(offeredCorp)) return GamePhase.CorporationSelect;

  const draftZone = zone('draft');
  if (draftZone && visible(draftZone.querySelector('.card'))) return GamePhase.Draft;
  const drawZone = zone('draw');
  if (drawZone && visible(drawZone.querySelector('.card'))) return GamePhase.Buy;
  const handZone = zone('hand');
  if (handZone && visible(handZone.querySelector('.card'))) return GamePhase.Action;

  return GamePhase.Unknown;
}
