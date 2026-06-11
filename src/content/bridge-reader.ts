import { BridgeState } from '../types/index.js';

/**
 * Reads the snapshot published by page-bridge.ts (MAIN world) from the
 * <html> attribute. Returns null when the bridge hasn't produced data yet
 * (page still loading, or not a game page) — callers must DOM-fallback.
 */
const BRIDGE_ATTR = 'data-tm-advisor-bridge';

export function getBridgeState(): BridgeState | null {
  const raw = document.documentElement.getAttribute(BRIDGE_ATTR);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BridgeState;
    if (parsed && parsed.v === 1) return parsed;
  } catch {
    // Malformed snapshot — treat as absent.
  }
  return null;
}
