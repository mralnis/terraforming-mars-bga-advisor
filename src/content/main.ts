import { scanForCards, resolveCard } from './dom-scanner.js';
import { scrapeGameState, scrapePlayerState } from './game-state.js';
import { shouldShowRatings } from './phase-detector.js';
import { getBridgeState } from './bridge-reader.js';
import { scoreCards } from '../scoring/context-scorer.js';
import { renderBadges, clearBadges, setPreferences } from './overlay-renderer.js';
import { Card, Preferences, DEFAULT_PREFERENCES, GamePhase } from '../types/index.js';

console.log('[TM-Advisor] Content script loaded on BGA');

let currentPrefs: Preferences = { ...DEFAULT_PREFERENCES };
let isProcessing = false;
let lastPhase: GamePhase = GamePhase.Unknown;

/**
 * Main processing loop: detect cards, score them, render badges.
 */
function processCards(): void {
  if (isProcessing) return;
  if (!currentPrefs.enabled) {
    clearBadges();
    return;
  }

  isProcessing = true;

  try {
    const bridge = getBridgeState();
    const gameState = scrapeGameState(bridge);

    // Only show ratings during relevant phases
    if (!shouldShowRatings(gameState.phase)) {
      if (lastPhase !== gameState.phase) {
        clearBadges();
        lastPhase = gameState.phase;
      }
      return;
    }
    lastPhase = gameState.phase;

    // Scan DOM for card elements
    const detectedCards = scanForCards(bridge?.names);
    if (detectedCards.length === 0) {
      clearBadges();
      return;
    }

    // Resolve to known cards
    const resolvedCards: Card[] = [];
    const cardNodes = new Map<number, HTMLElement>();
    const effectiveCosts: Record<number, number> = {};
    const bgaInvalidPrereq: Record<number, boolean> = {};

    for (const detected of detectedCards) {
      const card = resolveCard(detected);
      if (card) {
        resolvedCards.push(card);
        cardNodes.set(card.id, detected.domNode);
        // BGA-computed discounted cost: DOM attribute first, bridge second
        const bgaCost = detected.effectiveCost ?? bridge?.costs?.[detected.domNode.id];
        if (typeof bgaCost === 'number') effectiveCosts[card.id] = bgaCost;
        if (detected.invalidPrereq !== null) bgaInvalidPrereq[card.id] = detected.invalidPrereq;
      } else if (detected.cardName || detected.cardId) {
        console.log(`[TM-Advisor] Unknown card: id=${detected.cardId}, name="${detected.cardName}"`);
      }
    }

    if (resolvedCards.length === 0) return;

    // Scrape player state for context-aware scoring
    const playerState = scrapePlayerState(bridge);
    playerState.effectiveCosts = effectiveCosts;
    playerState.bgaInvalidPrereq = bgaInvalidPrereq;

    // Score all cards
    const results = scoreCards(resolvedCards, gameState, playerState);

    console.log(
      `[TM-Advisor] Gen ${gameState.generation} | Phase: ${gameState.phase} | Bridge: ${bridge ? 'on' : 'off'} | ` +
      `MC: ${playerState.mc}(+${playerState.mcProduction}) | TR: ${playerState.terraformRating} | ` +
      `Tags: B${playerState.tags.building} S${playerState.tags.space} Sc${playerState.tags.science} Pl${playerState.tags.plant} | ` +
      `Played: ${playerState.playedCards.length}`
    );
    for (const r of results.slice(0, 5)) {
      console.log(`  ${r.tier} ${r.contextScore} - ${r.cardName} (base: ${r.baseScore})`);
    }

    // Render badges
    renderBadges(results, cardNodes);
  } catch (error) {
    console.error('[TM-Advisor] Error processing cards:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Set up MutationObserver to detect when cards appear or game state changes.
 */
function setupObserver(): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const debouncedProcess = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processCards, 300);
  };

  const observer = new MutationObserver((mutations) => {
    const hasRelevantChanges = mutations.some((m) => {
      // Tracker value changed (MC, generation, tags…)
      if (m.type === 'attributes') return true;
      // Skip mutations caused by our own badge elements
      for (const node of m.addedNodes) {
        if (node instanceof HTMLElement && node.classList?.contains('tm-advisor-badge')) return false;
      }
      for (const node of m.removedNodes) {
        if (node instanceof HTMLElement && node.classList?.contains('tm-advisor-badge')) return false;
      }
      return m.addedNodes.length > 0 || m.removedNodes.length > 0;
    });
    if (hasRelevantChanges) {
      debouncedProcess();
    }
  });

  const gameArea =
    document.getElementById('game_play_area') ??
    document.getElementById('game_play_area_wrap') ??
    document.getElementById('right-side') ??
    document.body;

  observer.observe(gameArea, {
    childList: true,
    subtree: true,
    // Trackers store values in data-state; observing it keeps scores live.
    // (Our own badge mutations only touch class/text, so no feedback loop.)
    attributes: true,
    attributeFilter: ['data-state'],
  });

  console.log(`[TM-Advisor] Observer attached to: ${gameArea.id || 'body'}`);

  // Slow-interval fallback for anything the observer misses
  setInterval(debouncedProcess, 5000);
}

/**
 * Load preferences from chrome.storage.
 */
function loadPreferences(): void {
  try {
    chrome.storage.sync.get('tmAdvisorPrefs', (result) => {
      if (result.tmAdvisorPrefs) {
        currentPrefs = { ...DEFAULT_PREFERENCES, ...result.tmAdvisorPrefs };
      }
      setPreferences(currentPrefs);
      console.log('[TM-Advisor] Preferences loaded:', currentPrefs);
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.tmAdvisorPrefs) {
        currentPrefs = { ...DEFAULT_PREFERENCES, ...(changes.tmAdvisorPrefs.newValue as Partial<Preferences>) };
        setPreferences(currentPrefs);
        processCards(); // Re-render with new preferences
      }
    });
  } catch {
    // chrome.storage may not be available (e.g. when injected manually in dev)
    setPreferences(currentPrefs);
  }
}

/**
 * Check if the current page is a Terraforming Mars game.
 */
function isTerraformingMarsPage(): boolean {
  const url = window.location.href.toLowerCase();
  return (
    url.includes('terraformingmars') ||
    document.title.toLowerCase().includes('terraforming mars') ||
    !!document.getElementById('hand_area')
  );
}

// ===== INIT =====
function init(): void {
  if (!isTerraformingMarsPage()) {
    // Not a TM page — check again after BGA finishes loading
    setTimeout(() => {
      if (isTerraformingMarsPage()) {
        console.log('[TM-Advisor] Terraforming Mars detected (delayed). Initializing...');
        loadPreferences();
        setupObserver();
        setTimeout(processCards, 1500);
      }
    }, 3000);
    return;
  }

  console.log('[TM-Advisor] Terraforming Mars detected. Initializing...');
  loadPreferences();
  setupObserver();

  // Initial scan after a short delay (let BGA finish rendering)
  setTimeout(processCards, 1500);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
