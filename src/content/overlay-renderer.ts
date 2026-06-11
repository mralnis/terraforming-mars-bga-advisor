import { ScoringResult, Preferences } from '../types/index.js';
import { OVERLAY_PREFIX } from '../shared/constants.js';
import { tierMeetsMinimum } from '../shared/utils.js';

const BADGE_CLASS = `${OVERLAY_PREFIX}-badge`;
const TOOLTIP_ID = `${OVERLAY_PREFIX}-tooltip`;
const DIM_CLASS = `${OVERLAY_PREFIX}-dim`;

let tooltipEl: HTMLDivElement | null = null;
let currentPrefs: Preferences | null = null;

/** Latest scoring result per badge element — keeps tooltips fresh across
 *  in-place badge updates without re-binding listeners. */
const badgeResults = new WeakMap<HTMLElement, ScoringResult>();

/** Unique per script instance. Badges left behind by a previous instance
 *  (extension reload while a game tab stays open) carry dead listeners and
 *  stale closures — they must be replaced, never adopted. */
const INSTANCE_TOKEN = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export function setPreferences(prefs: Preferences): void {
  currentPrefs = prefs;
}

/**
 * Render or update rating badges on detected card elements.
 * Badges are updated in place so scores stay fresh as the game state
 * changes (MC, generation, tags…) without flicker.
 */
export function renderBadges(results: ScoringResult[], cardNodes: Map<number, HTMLElement>): void {
  if (!currentPrefs?.enabled || !currentPrefs.showBadges) {
    clearBadges();
    return;
  }

  const badgedNodes = new Set<HTMLElement>();

  for (const result of results) {
    const node = cardNodes.get(result.cardId);
    if (!node) continue;
    badgedNodes.add(node);

    let badge = node.querySelector<HTMLElement>(`:scope > .${BADGE_CLASS}`);

    // A badge from a previous script instance has dead listeners — replace it.
    if (badge && badge.dataset.tmInstance !== INSTANCE_TOKEN) {
      badge.remove();
      badge = null;
    }

    // Filter by minimum tier
    if (!tierMeetsMinimum(result.tier, currentPrefs.minTierToShow)) {
      badge?.remove();
      node.classList.remove(DIM_CLASS);
      continue;
    }

    if (!badge) {
      // BGA cards are position:relative already, but guard anyway.
      if (getComputedStyle(node).position === 'static') {
        node.style.position = 'relative';
      }

      badge = document.createElement('div');
      badge.dataset.cardId = String(result.cardId);
      badge.dataset.tmInstance = INSTANCE_TOKEN;
      badge.addEventListener('mouseenter', (e) => {
        if (!currentPrefs?.showTooltips) return;
        const latest = badgeResults.get(badge!);
        if (latest) showTooltip(e, latest);
      });
      badge.addEventListener('mouseleave', hideTooltip);
      node.appendChild(badge);
    }

    badgeResults.set(badge, result);

    const className = `${BADGE_CLASS} tier-${result.tier.toLowerCase()}`;
    const text = `${result.tier} ${result.contextScore}`;
    if (badge.className !== className) badge.className = className;
    if (badge.textContent !== text) badge.textContent = text;

    // Dim low-tier cards
    const shouldDim =
      currentPrefs.dimLowTier && (result.tier === 'D' || result.tier === 'F');
    node.classList.toggle(DIM_CLASS, shouldDim);
  }

  // Garbage-collect badges on cards that left the rateable zones (e.g. a
  // played card moved to the tableau with its badge still attached).
  for (const badge of document.querySelectorAll<HTMLElement>(`.${BADGE_CLASS}`)) {
    const parent = badge.parentElement;
    if (parent && !badgedNodes.has(parent)) {
      parent.classList.remove(DIM_CLASS);
      badge.remove();
    }
  }
}

/**
 * Remove all injected badges and dim overlays.
 */
export function clearBadges(): void {
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((el) => {
    el.parentElement?.classList.remove(DIM_CLASS);
    el.remove();
  });
  document.querySelectorAll(`.${DIM_CLASS}`).forEach((el) => el.classList.remove(DIM_CLASS));
  hideTooltip();
}

/**
 * Show the tooltip panel near the badge.
 */
function showTooltip(event: MouseEvent, result: ScoringResult): void {
  hideTooltip();

  const tooltip = getOrCreateTooltip();
  tooltip.innerHTML = buildTooltipHTML(result);

  const x = event.clientX + 12;
  const y = event.clientY + 12;

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.style.display = 'block';

  // Adjust if overflowing viewport
  requestAnimationFrame(() => {
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = `${event.clientX - rect.width - 12}px`;
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = `${event.clientY - rect.height - 12}px`;
    }
  });
}

function hideTooltip(): void {
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
}

function getOrCreateTooltip(): HTMLDivElement {
  if (tooltipEl) return tooltipEl;

  tooltipEl = document.createElement('div');
  tooltipEl.id = TOOLTIP_ID;
  tooltipEl.className = `${OVERLAY_PREFIX}-tooltip`;
  tooltipEl.style.display = 'none';
  document.body.appendChild(tooltipEl);

  return tooltipEl;
}

function buildTooltipHTML(result: ScoringResult): string {
  const tierClass = `tier-${result.tier.toLowerCase()}`;

  const modifierRows = result.modifiers
    .filter((m) => m.value !== 0)
    .map((m) => {
      const sign = m.value > 0 ? '+' : '';
      const color = m.value > 0 ? '#2e7d32' : '#b71c1c';
      return `<div class="${OVERLAY_PREFIX}-mod-row">
        <span style="color:${color};font-weight:600">${sign}${m.value}</span>
        <span>${m.name}: ${escapeHtml(m.reason)}</span>
      </div>`;
    })
    .join('');

  return `
    <div class="${OVERLAY_PREFIX}-tooltip-header">
      <span class="${OVERLAY_PREFIX}-tooltip-name">${escapeHtml(result.cardName)}</span>
      <span class="${BADGE_CLASS} ${tierClass}" style="position:static;display:inline-block;margin-left:8px">
        ${result.tier} ${result.contextScore}
      </span>
    </div>
    <div class="${OVERLAY_PREFIX}-tooltip-scores">
      <span>Base: ${result.baseScore}</span>
      <span>Context: ${result.contextScore}</span>
    </div>
    ${modifierRows ? `<div class="${OVERLAY_PREFIX}-tooltip-mods">${modifierRows}</div>` : ''}
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
