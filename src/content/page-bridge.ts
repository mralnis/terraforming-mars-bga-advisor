/**
 * Page bridge — runs in the MAIN world (page context) via manifest
 * `"world": "MAIN"`, where BGA's `window.gameui` is visible.
 *
 * Chrome extension content scripts live in an isolated world and can NEVER
 * read page globals, so all gameui-dependent logic lives here. The bridge
 * serializes a compact snapshot into an attribute on <html>; the isolated
 * content script parses it synchronously (no async messaging needed).
 *
 * Published data (see BridgeState in types):
 *   - playerId / myColor      → which tracker_/hand_ suffix is "me"
 *   - gamestate name/type     → coarse turn structure (names are generic!)
 *   - names: element id → card name, from gamedatas.token_types
 *   - costs: element id → effective discounted cost, from gamedatas.card_info
 */

const BRIDGE_ATTR = 'data-tm-advisor-bridge';
const TICK_MS = 800;

interface TokenType {
  name?: string;
}
interface CardInfo {
  discount_cost?: number;
}

function buildSnapshot(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).gameui;
  const gd = g?.gamedatas;
  if (!g || !gd) return null;

  const playerId = g.player_id != null ? String(g.player_id) : null;
  const players = (gd.players ?? {}) as Record<string, { color?: string }>;
  const myColor = (playerId && players[playerId]?.color) || null;

  const tokenTypes = (gd.token_types ?? {}) as Record<string, TokenType>;
  const names: Record<string, string> = {};

  // Cards the advisor may need to resolve by name: everything in the
  // hand/draw/draft area, my tableau (played-card synergies), and every
  // corporation (corp numbering on BGA is partially unmapped, so corps
  // resolve by name).
  const collect = (root: Element | null) => {
    if (!root) return;
    for (const el of root.querySelectorAll('[id^="card_"]')) {
      const t = tokenTypes[el.id];
      if (t?.name) names[el.id] = t.name;
    }
  };
  collect(document.getElementById('hand_area'));
  if (myColor) collect(document.getElementById(`tableau_${myColor}`));
  for (const [key, t] of Object.entries(tokenTypes)) {
    if (key.startsWith('card_corp_') && t?.name) names[key] = t.name;
  }

  // Effective (discounted) costs computed by BGA itself for playable cards.
  const cardInfo = (gd.card_info ?? {}) as Record<string, CardInfo>;
  const costs: Record<string, number> = {};
  for (const [key, info] of Object.entries(cardInfo)) {
    if (typeof info?.discount_cost === 'number') costs[key] = info.discount_cost;
  }

  return JSON.stringify({
    v: 1,
    playerId,
    myColor,
    gamestate: gd.gamestate?.name ?? null,
    gamestateType: gd.gamestate?.type ?? null,
    names,
    costs,
  });
}

let lastSnapshot = '';

function tick(): void {
  try {
    const snapshot = buildSnapshot();
    if (snapshot && snapshot !== lastSnapshot) {
      document.documentElement.setAttribute(BRIDGE_ATTR, snapshot);
      lastSnapshot = snapshot;
    }
  } catch {
    // Never let bridge errors surface into the page.
  }
}

tick();
setInterval(tick, TICK_MS);
